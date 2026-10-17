import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

export function parseNodeMajor(version) {
  if (typeof version !== "string") {
    throw new TypeError("Node.js version must be a string.");
  }
  const match = /^v?(\d+)\.\d+\.\d+$/.exec(version);
  if (!match) {
    throw new TypeError(`Unsupported Node.js version format: ${version}`);
  }
  return Number(match[1]);
}

export function isSupportedNodeVersion(version, minimumMajor = 24) {
  return parseNodeMajor(version) >= minimumMajor;
}

export function needsDependencyInstall(projectRoot, exists = existsSync) {
  return !exists(path.join(projectRoot, "node_modules"));
}

export function buildViteArgs(port) {
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new RangeError("Vite port must be an integer between 1 and 65535.");
  }
  return [
    "run",
    "dev",
    "--workspace",
    "@guess-number/web",
    "--",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--strictPort"
  ];
}

function probePort(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen({ host: "127.0.0.1", port, exclusive: true }, () => {
      server.close(() => resolve(true));
    });
  });
}

export async function findAvailablePort(startPort = 5173, maxAttempts = 20, check = probePort) {
  if (!Number.isInteger(startPort) || startPort < 1 || startPort > 65_535) {
    throw new RangeError("Start port must be an integer between 1 and 65535.");
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new RangeError("Port scan attempts must be a positive integer.");
  }
  const endPort = Math.min(65_535, startPort + maxAttempts - 1);
  for (let port = startPort; port <= endPort; port += 1) {
    if (await check(port)) return port;
  }
  throw new Error(`No available loopback port found in ${startPort}–${endPort}.`);
}

function timeoutError(timeoutMs, url) {
  return new Error(`Timed out after ${timeoutMs}ms waiting for ${url}`);
}

function defaultTimeoutAfter(milliseconds, error, signal) {
  return sleep(milliseconds, undefined, { signal, ref: false }).then(() => {
    throw error;
  });
}

export async function waitForServer(url, child, options = {}) {
  const {
    timeoutMs = 30_000,
    pollIntervalMs = 150,
    now = Date.now,
    delay = (milliseconds) => sleep(milliseconds),
    request = fetch,
    timeoutAfter = defaultTimeoutAfter
  } = options;
  const deadline = now() + timeoutMs;
  const timeout = timeoutError(timeoutMs, url);

  while (true) {
    if (child.exitCode !== null) {
      throw new Error(`Vite exited with code ${child.exitCode} before ${url} was ready.`);
    }

    const remaining = deadline - now();
    if (remaining <= 0) throw timeout;

    const controller = new AbortController();
    let response;
    try {
      const requestAttempt = Promise.resolve()
        .then(() => request(url))
        .catch(() => ({ ok: false }));
      response = await Promise.race([
        requestAttempt,
        timeoutAfter(remaining, timeout, controller.signal)
      ]);
    } finally {
      controller.abort();
    }

    if (response?.ok) return;
    const delayMs = Math.min(pollIntervalMs, Math.max(0, deadline - now()));
    if (delayMs > 0) await delay(delayMs);
  }
}

export function registerChildCleanup(signalSource, child) {
  const handleInterrupt = () => {
    if (child.exitCode === null && !child.killed) child.kill();
  };
  signalSource.once("SIGINT", handleInterrupt);
  return () => signalSource.off("SIGINT", handleInterrupt);
}

export function buildNpmInvocation(args, commandProcessor = process.env.ComSpec ?? "cmd.exe") {
  return {
    command: commandProcessor,
    args: ["/d", "/c", "npm.cmd", ...args]
  };
}

export async function runLauncher(options) {
  const {
    projectRoot,
    nodeVersion = process.version,
    exists = existsSync,
    installDependencies,
    findPort = findAvailablePort,
    spawnVite,
    waitUntilReady = waitForServer,
    openBrowser,
    writeLine = console.log
  } = options;

  if (!isSupportedNodeVersion(nodeVersion)) {
    throw new Error(`需要 Node.js 24 或更高版本，当前版本是 ${nodeVersion}。`);
  }

  if (needsDependencyInstall(projectRoot, exists)) {
    writeLine("首次运行，正在按锁定版本安装依赖……");
    await installDependencies(projectRoot);
  }

  const port = await findPort();
  const url = `http://127.0.0.1:${port}/`;
  const child = spawnVite(buildViteArgs(port), projectRoot);

  try {
    await waitUntilReady(url, child);
  } catch (error) {
    if (child.exitCode === null && !child.killed) child.kill();
    throw error;
  }

  writeLine(`游戏已启动：${url}`);
  try {
    await openBrowser(url);
  } catch {
    writeLine(`无法自动打开浏览器，请手动复制此地址：${url}`);
  }

  return { url, child };
}

function installWithNpm(projectRoot) {
  const invocation = buildNpmInvocation(["ci"]);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: projectRoot,
    stdio: "inherit",
    windowsHide: false
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`npm ci failed with exit code ${result.status ?? "unknown"}.`);
  }
}

function startVite(args, projectRoot) {
  const invocation = buildNpmInvocation(args);
  return spawn(invocation.command, invocation.args, {
    cwd: projectRoot,
    stdio: "inherit",
    windowsHide: false
  });
}

function openDefaultBrowser(url) {
  if (process.platform !== "win32") {
    throw new Error("The double-click launcher supports Windows only.");
  }
  return new Promise((resolve, reject) => {
    const opener = spawn("cmd.exe", ["/d", "/c", "start", "", url], {
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });
    opener.once("error", reject);
    opener.once("spawn", () => {
      opener.unref();
      resolve();
    });
  });
}

async function main() {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const result = await runLauncher({
    projectRoot,
    installDependencies: installWithNpm,
    spawnVite: startVite,
    openBrowser: openDefaultBrowser
  });
  const unregister = registerChildCleanup(process, result.child);
  console.log("关闭此窗口或按 Ctrl+C 可停止游戏。");

  if (result.child.exitCode === null) {
    const [exitCode] = await once(result.child, "exit");
    process.exitCode = exitCode ?? 1;
  } else {
    process.exitCode = result.child.exitCode;
  }
  unregister();
}

const directEntry = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";

if (import.meta.url === directEntry) {
  main().catch((error) => {
    console.error(`启动失败：${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}

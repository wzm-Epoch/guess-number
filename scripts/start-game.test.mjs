import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildNpmInvocation,
  buildViteArgs,
  failureExitCode,
  findAvailablePort,
  installWithNpm,
  isSupportedNodeVersion,
  needsDependencyInstall,
  parseNodeMajor,
  registerChildCleanup,
  runLauncher,
  waitForServer
} from "./start-game.mjs";

test("runs npm through the Windows command processor", () => {
  assert.deepEqual(buildNpmInvocation(["ci"], "C:\\Windows\\System32\\cmd.exe"), {
    command: "C:\\Windows\\System32\\cmd.exe",
    args: ["/d", "/c", "npm.cmd", "ci"]
  });
});

test("preserves the npm install failure exit code", () => {
  let invocation;
  assert.throws(
    () => installWithNpm("C:\\game", (command, args, options) => {
      invocation = { command, args, options };
      return { status: 17 };
    }),
    (error) => error.exitCode === 17
  );
  assert.equal(invocation.options.cwd, "C:\\game");
  assert.equal(failureExitCode({ exitCode: 17 }), 17);
  assert.equal(failureExitCode(new Error("unknown")), 1);
});

test("parses supported Node versions and rejects malformed or old versions", () => {
  assert.equal(parseNodeMajor("v24.3.0"), 24);
  assert.equal(parseNodeMajor("24.0.0"), 24);
  assert.equal(isSupportedNodeVersion("v24.0.0"), true);
  assert.equal(isSupportedNodeVersion("v22.14.0"), false);
  assert.throws(() => parseNodeMajor("latest"), TypeError);
  assert.throws(() => parseNodeMajor("v24.0.0-rc.1"), TypeError);
});

test("requires dependency installation only when node_modules is absent", () => {
  const checkedPaths = [];
  const present = needsDependencyInstall("C:\\game", (candidate) => {
    checkedPaths.push(candidate);
    return true;
  });
  const absent = needsDependencyInstall("C:\\game", () => false);

  assert.equal(present, false);
  assert.equal(absent, true);
  assert.deepEqual(checkedPaths, ["C:\\game\\node_modules"]);
});

test("builds a loopback-only strict-port Vite command", () => {
  assert.deepEqual(buildViteArgs(5173), [
    "run",
    "dev",
    "--workspace",
    "@guess-number/web",
    "--",
    "--host",
    "127.0.0.1",
    "--port",
    "5173",
    "--strictPort"
  ]);
  assert.throws(() => buildViteArgs(0), RangeError);
});

test("skips occupied ports and fails after the bounded range is exhausted", async () => {
  const checkedPorts = [];
  const selected = await findAvailablePort(5173, 3, async (port) => {
    checkedPorts.push(port);
    return port === 5174;
  });

  assert.equal(selected, 5174);
  assert.deepEqual(checkedPorts, [5173, 5174]);
  await assert.rejects(
    findAvailablePort(5173, 2, async () => false),
    /5173–5174/
  );
});

test("waits until the page responds successfully", async () => {
  const responses = [{ ok: false }, { ok: true }];
  let clock = 0;
  let requests = 0;

  await waitForServer("http://127.0.0.1:5173/", { exitCode: null }, {
    timeoutMs: 1_000,
    pollIntervalMs: 20,
    now: () => clock,
    delay: async (milliseconds) => { clock += milliseconds; },
    request: async () => {
      requests += 1;
      return responses.shift();
    },
    timeoutAfter: () => new Promise(() => {})
  });

  assert.equal(requests, 2);
  assert.equal(clock, 20);
});

test("fails when Vite exits before becoming ready", async () => {
  await assert.rejects(
    waitForServer("http://127.0.0.1:5173/", { exitCode: 2 }),
    /Vite exited with code 2/
  );
});

test("times out when the page never becomes ready", async () => {
  let clock = 0;

  await assert.rejects(
    waitForServer("http://127.0.0.1:5173/", { exitCode: null }, {
      timeoutMs: 40,
      pollIntervalMs: 20,
      now: () => clock,
      delay: async (milliseconds) => { clock += milliseconds; },
      request: async () => ({ ok: false }),
      timeoutAfter: () => new Promise(() => {})
    }),
    /Timed out after 40ms/
  );
});

test("bounds a readiness request that never resolves", async () => {
  await assert.rejects(
    waitForServer("http://127.0.0.1:5173/", { exitCode: null }, {
      timeoutMs: 30,
      now: () => 0,
      request: () => new Promise(() => {}),
      timeoutAfter: async () => {
        throw new Error("Timed out after 30ms waiting for http://127.0.0.1:5173/");
      }
    }),
    /Timed out after 30ms/
  );
});

function createLauncherDoubles(overrides = {}) {
  const child = {
    exitCode: null,
    killed: false,
    kill() { this.killed = true; }
  };
  return {
    projectRoot: "C:\\game",
    nodeVersion: "v24.0.0",
    exists: () => true,
    installDependencies: async () => {},
    findPort: async () => 5173,
    spawnVite: () => child,
    waitUntilReady: async () => {},
    openBrowser: async () => {},
    writeLine: () => {},
    child,
    ...overrides
  };
}

test("installs missing dependencies before starting Vite", async () => {
  const events = [];
  const options = createLauncherDoubles({
    exists: () => false,
    installDependencies: async () => { events.push("install"); },
    spawnVite: () => {
      events.push("spawn");
      return { exitCode: null, kill() {} };
    }
  });

  await runLauncher(options);

  assert.deepEqual(events, ["install", "spawn"]);
});

test("starts Vite, waits for readiness, and opens the selected URL", async () => {
  const events = [];
  const options = createLauncherDoubles({
    findPort: async () => 5181,
    spawnVite: (args) => {
      events.push(["spawn", args]);
      return { exitCode: null, kill() {} };
    },
    waitUntilReady: async (url) => { events.push(["ready", url]); },
    openBrowser: async (url) => { events.push(["browser", url]); }
  });

  const result = await runLauncher(options);

  assert.equal(result.url, "http://127.0.0.1:5181/");
  assert.deepEqual(events, [
    ["spawn", [
      "run",
      "dev",
      "--workspace",
      "@guess-number/web",
      "--",
      "--host",
      "127.0.0.1",
      "--port",
      "5181",
      "--strictPort"
    ]],
    ["ready", "http://127.0.0.1:5181/"],
    ["browser", "http://127.0.0.1:5181/"]
  ]);
});

test("keeps the server running and prints the URL when browser opening fails", async () => {
  const messages = [];
  const options = createLauncherDoubles({
    openBrowser: async () => { throw new Error("no default browser"); },
    writeLine: (message) => { messages.push(message); }
  });

  const result = await runLauncher(options);

  assert.equal(result.child.killed, false);
  assert.match(messages.join("\n"), /http:\/\/127\.0\.0\.1:5173\//);
  assert.match(messages.join("\n"), /浏览器/);
});

test("terminates the created child when Ctrl+C is received", () => {
  const signalSource = new EventEmitter();
  const child = { exitCode: null, killCount: 0, kill() { this.killCount += 1; } };
  const unregister = registerChildCleanup(signalSource, child);

  signalSource.emit("SIGINT");
  assert.equal(child.killCount, 1);

  unregister();
  signalSource.emit("SIGINT");
  assert.equal(child.killCount, 1);
});

test("does not open a browser when Vite exits or readiness times out", async () => {
  for (const failure of [
    new Error("Vite exited with code 1"),
    new Error("Timed out after 30000ms")
  ]) {
    let browserOpenCount = 0;
    const options = createLauncherDoubles({
      waitUntilReady: async () => { throw failure; },
      openBrowser: async () => { browserOpenCount += 1; }
    });

    await assert.rejects(runLauncher(options), failure);
    assert.equal(browserOpenCount, 0);
    assert.equal(options.child.killed, true);
  }
});

test("CMD entry checks prerequisites and delegates from its own directory", {
  skip: process.platform !== "win32"
}, (context) => {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const testRoot = mkdtempSync(path.join(repositoryRoot, ".launcher-test-"));
  const sandboxRoot = path.join(testRoot, "game");
  const fakeBin = path.join(testRoot, "bin");
  const outsideDirectory = path.join(testRoot, "outside");
  const logPath = path.join(testRoot, "node-call.txt");
  const launcherPath = path.join(sandboxRoot, "启动游戏.cmd");
  const nodePath = path.join(fakeBin, "node.exe");
  const npmPath = path.join(fakeBin, "npm.cmd");
  mkdirSync(sandboxRoot);
  mkdirSync(path.join(sandboxRoot, "scripts"));
  mkdirSync(fakeBin);
  mkdirSync(outsideDirectory);
  context.after(() => rmSync(testRoot, { recursive: true, force: true }));

  copyFileSync(path.join(repositoryRoot, "启动游戏.cmd"), launcherPath);
  writeFileSync(path.join(sandboxRoot, "scripts", "start-game.mjs"), [
    'import { writeFileSync } from "node:fs";',
    "writeFileSync(process.env.LAUNCHER_TEST_LOG, JSON.stringify({",
    "  cwd: process.cwd(),",
    "  script: process.argv[1]",
    "}));",
    "process.exitCode = Number(process.env.LAUNCHER_TEST_EXIT);",
    ""
  ].join("\n"));

  const environment = { ...process.env };
  delete environment.PATH;
  delete environment.Path;
  Object.assign(environment, {
    PATH: `${fakeBin};${process.env.SystemRoot}\\System32`,
    PATHEXT: ".COM;.EXE;.BAT;.CMD",
    LAUNCHER_TEST_LOG: logPath,
    LAUNCHER_TEST_EXIT: "7"
  });
  const runEntry = () => spawnSync(process.env.ComSpec ?? "cmd.exe", [
    "/d",
    "/c",
    launcherPath
  ], {
    cwd: outsideDirectory,
    env: environment,
    encoding: "utf8",
    input: "\n"
  });

  writeFileSync(npmPath, "@echo off\r\nexit /b 0\r\n");
  const missingNode = runEntry();
  assert.notEqual(
    missingNode.status,
    0,
    `stdout: ${missingNode.stdout}\nstderr: ${missingNode.stderr}`
  );
  assert.match(
    missingNode.stdout,
    /未找到 Node\.js/,
    `stdout: ${missingNode.stdout}\nstderr: ${missingNode.stderr}`
  );
  assert.equal(existsSync(logPath), false);

  copyFileSync(process.execPath, nodePath);
  assert.equal(existsSync(nodePath), true);
  const nodeProbe = spawnSync(path.join(process.env.SystemRoot, "System32", "where.exe"), [
    "node"
  ], {
    env: environment,
    encoding: "utf8"
  });
  assert.equal(
    nodeProbe.status,
    0,
    `stdout: ${nodeProbe.stdout}\nstderr: ${nodeProbe.stderr}`
  );
  unlinkSync(npmPath);
  const missingNpm = runEntry();
  assert.notEqual(
    missingNpm.status,
    0,
    `stdout: ${missingNpm.stdout}\nstderr: ${missingNpm.stderr}`
  );
  assert.match(
    missingNpm.stdout,
    /未找到 npm/,
    `stdout: ${missingNpm.stdout}\nstderr: ${missingNpm.stderr}`
  );
  assert.equal(existsSync(logPath), false);

  writeFileSync(npmPath, "@echo off\r\nexit /b 0\r\n");
  const delegated = runEntry();
  assert.equal(
    delegated.status,
    7,
    `stdout: ${delegated.stdout}\nstderr: ${delegated.stderr}`
  );
  const call = JSON.parse(readFileSync(logPath, "utf8"));
  assert.equal(call.cwd.toLowerCase(), sandboxRoot.toLowerCase());
  assert.equal(
    path.relative(sandboxRoot, call.script).toLowerCase(),
    "scripts\\start-game.mjs"
  );
});

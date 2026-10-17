import { existsSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

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

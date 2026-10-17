import assert from "node:assert/strict";
import test from "node:test";

import {
  buildViteArgs,
  findAvailablePort,
  isSupportedNodeVersion,
  needsDependencyInstall,
  parseNodeMajor,
  waitForServer
} from "./start-game.mjs";

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

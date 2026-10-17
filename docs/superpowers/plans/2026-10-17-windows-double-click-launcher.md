# Windows Double-Click Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tested Windows launcher that installs missing dependencies, starts the local Vite server on an available loopback port, and opens the game in the default browser.

**Architecture:** A small root-level CMD file provides the double-click experience and delegates all nontrivial work to a dependency-free Node.js ES module. The Node module exports testable helpers and an injected orchestration function, while its direct-execution path supplies the real filesystem, network, process, and browser adapters.

**Tech Stack:** Windows CMD, Node.js 24 built-in modules, Node test runner, npm, Vite

**Spec:** `docs/superpowers/specs/2026-10-17-windows-double-click-launcher-design.md`

## Global Constraints

- The user-facing entry file is exactly `启动游戏.cmd` in the repository root.
- The launcher requires Node.js 24 or higher and uses only Node.js built-in modules before dependencies are installed.
- Missing dependencies are installed with `npm ci`, never an unlocked install.
- Vite binds only to `127.0.0.1`; the launcher must not expose the game to the LAN or Internet.
- Port selection starts at 5173 and uses strict-port startup.
- Closing the server window or pressing Ctrl+C must stop the child development server.
- Existing game behavior and the original WeChat HTML attachment remain unchanged.

## Review Focus

- A malformed or pre-release Node version string must be rejected with a readable version error; Task 1 tests malformed and below-minimum values.
- Every candidate port being occupied must produce a bounded failure instead of an infinite scan; Task 1 tests exhaustion.
- A request that never resolves must still respect the overall readiness deadline; Task 1 tests a stalled request.
- Default-browser launch failure must leave the server running and print the URL for manual use; Task 2 tests the warning path.
- Ctrl+C cleanup must terminate only the child process created by the launcher; Task 2 tests the injected signal cleanup handler.

---

### Task 1: Launcher Runtime Primitives

**Files:**
- Create: `scripts/start-game.mjs`
- Create: `scripts/start-game.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: Node.js built-in `fs`, `net`, `path`, `timers/promises`, and the global `fetch` API.
- Produces: `parseNodeMajor(version: string): number`, `isSupportedNodeVersion(version: string, minimumMajor?: number): boolean`, `needsDependencyInstall(projectRoot: string, exists?: (path: string) => boolean): boolean`, `buildViteArgs(port: number): string[]`, `findAvailablePort(startPort?: number, maxAttempts?: number, check?: (port: number) => Promise<boolean>): Promise<number>`, and `waitForServer(url: string, child: { exitCode: number | null }, options?: WaitOptions): Promise<void>`.

- [ ] **Step 1: Write failing Node tests for environment and command construction**

Add tests named:

- `parses supported Node versions and rejects malformed or old versions`
- `requires dependency installation only when node_modules is absent`
- `builds a loopback-only strict-port Vite command`

Assert Node 24 is accepted, Node 22 and malformed versions are rejected, the injected existence check controls dependency installation, and port 5173 produces `run dev -- --host 127.0.0.1 --port 5173 --strictPort`.

- [ ] **Step 2: Run the tests to verify RED**

Run: `node --test scripts/start-game.test.mjs`

Expected: FAIL because `scripts/start-game.mjs` does not exist.

- [ ] **Step 3: Implement the version, dependency, and argument helpers**

Create the exported functions from the Interfaces block. Reject invalid version strings and invalid port numbers with `TypeError` or `RangeError`; use `path.join(projectRoot, "node_modules")` for the dependency check.

- [ ] **Step 4: Run the focused tests to verify GREEN**

Run: `node --test scripts/start-game.test.mjs`

Expected: all current launcher tests PASS.

- [ ] **Step 5: Write failing tests for port selection and readiness**

Add tests named:

- `skips occupied ports and fails after the bounded range is exhausted`
- `waits until the page responds successfully`
- `fails when Vite exits before becoming ready`
- `times out when the page never becomes ready`
- `bounds a readiness request that never resolves`

Use injected port checks, request functions, clocks, and delays so the tests are deterministic and do not wait on real time.

- [ ] **Step 6: Run the new tests to verify RED**

Run: `node --test scripts/start-game.test.mjs`

Expected: FAIL because `findAvailablePort` and `waitForServer` are not implemented.

- [ ] **Step 7: Implement bounded port selection and readiness polling**

Implement the exact exported signatures from the Interfaces block. The real port probe must bind only to `127.0.0.1`; readiness must succeed only on an HTTP success response, must distinguish timeout from an exited child, and must bound each request by the overall deadline even if the request never resolves.

- [ ] **Step 8: Add the launcher test command and verify Task 1**

Add `"test:launcher": "node --test scripts/start-game.test.mjs"` to root `package.json`.

Run: `npm run test:launcher && npm test -- --run`

Expected: launcher tests PASS and all existing Vitest tests PASS.

- [ ] **Step 9: Commit**

```bash
git add package.json scripts/start-game.mjs scripts/start-game.test.mjs
git commit -m "feat: add tested launcher runtime"
```

### Task 2: Windows Double-Click Entry and Orchestration

**Files:**
- Create: `启动游戏.cmd`
- Modify: `scripts/start-game.mjs`
- Modify: `scripts/start-game.test.mjs`
- Modify: `README.md`

**Interfaces:**
- Consumes: every Task 1 export plus injected adapters for dependency installation, child-process start, browser open, output, and signal registration.
- Produces: `runLauncher(options: LauncherOptions): Promise<{ url: string; child: ChildProcessLike }>` and `registerChildCleanup(signalSource: SignalSource, child: ChildProcessLike): () => void`; direct execution invokes `runLauncher` with real Windows adapters.

- [ ] **Step 1: Write failing orchestration tests**

Add tests named:

- `installs missing dependencies before starting Vite`
- `starts Vite, waits for readiness, and opens the selected URL`
- `keeps the server running and prints the URL when browser opening fails`
- `terminates the created child when Ctrl+C is received`
- `does not open a browser when Vite exits or readiness times out`

Use injected fakes and assert call order, the exact `http://127.0.0.1:<port>/` URL, warning output, that timeout or early exit terminates the child, and that signal cleanup targets only the injected child.

- [ ] **Step 2: Run the tests to verify RED**

Run: `npm run test:launcher`

Expected: FAIL because `runLauncher` and `registerChildCleanup` do not exist.

- [ ] **Step 3: Implement orchestration and the direct-execution adapter**

Implement the Task 2 exports and a direct-execution guard based on `import.meta.url`. Real execution must run `npm ci` only when required, spawn `npm.cmd` in the project root with inherited console output, wait up to 30 seconds, open the Windows default browser, and keep the launcher attached to the Vite child until it exits.

- [ ] **Step 4: Run the orchestration tests to verify GREEN**

Run: `npm run test:launcher`

Expected: all launcher tests PASS.

- [ ] **Step 5: Write the CMD entry and a failing contract test**

Add a test named `CMD entry checks prerequisites and delegates from its own directory`. It must read `启动游戏.cmd` and assert that it uses `%~dp0`, checks both `node` and `npm`, invokes `scripts\start-game.mjs`, preserves the helper exit code, and pauses on failure.

- [ ] **Step 6: Run the CMD contract test to verify RED**

Run: `npm run test:launcher`

Expected: FAIL because `启动游戏.cmd` does not exist.

- [ ] **Step 7: Implement `启动游戏.cmd` and update usage documentation**

The CMD file sets UTF-8, changes to `%~dp0`, performs prerequisite checks, invokes the Node helper, and pauses only on failure. Update README so double-click startup is the first method and terminal startup remains available as an alternative.

- [ ] **Step 8: Verify automated behavior**

Run: `npm run test:launcher && npm test -- --run && npm run typecheck && npm run lint && npm run build`

Expected: every command exits 0.

- [ ] **Step 9: Verify the real Windows launch path**

Run `cmd.exe /d /c "启动游戏.cmd"` from a terminal, confirm the page becomes reachable on the printed loopback URL, then send Ctrl+C and confirm no process still listens on the selected port.

Expected: the game loads, the browser URL uses `127.0.0.1`, and the selected port is released after shutdown.

- [ ] **Step 10: Commit**

```bash
git add README.md scripts/start-game.mjs scripts/start-game.test.mjs 启动游戏.cmd
git commit -m "feat: add Windows double-click launcher"
```

### Task 3: Final Launcher Acceptance

**Files:**
- Modify only if verification exposes a defect.

**Interfaces:**
- Consumes: the complete launcher and existing game application.
- Produces: an evidence-backed final handoff with no new feature surface.

- [ ] **Step 1: Run the complete verification suite**

Run: `npm run test:launcher && npm test -- --run && npm run typecheck && npm run lint && npm run build && npm run test:e2e`

Expected: all launcher tests, 41 existing unit tests, 5 browser tests, type checking, linting, and production build pass.

- [ ] **Step 2: Verify repository and attachment integrity**

Run: `git status --short && git log --oneline --decorate -6`

Expected: only intentional committed files exist and commits are focused.

Run: `(Get-FileHash -Algorithm SHA256 -LiteralPath 'D:\weixin\xwechat_files\wxid_celaa2ecb4jr22_9018\msg\file\2026-10\guess-number-game-8.html').Hash`

Expected: `9CEAB55087D2BAFF58DF58C4A9D7A2D22341DF26B6128440401B400B9D464276`.

- [ ] **Step 3: Commit verification fixes only if required**

If verification exposes a defect, first add a failing launcher test, implement the smallest fix, rerun the complete suite, and commit only that fix. Do not create an empty commit when no defect exists.

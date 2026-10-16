# Phase One Single-Player Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the existing single-file number guessing game into a tested React and TypeScript monorepo that preserves the single-player experience and is ready for later server-authoritative multiplayer work.

**Architecture:** Use npm workspaces with a browser-independent `@guess-number/game-core` package and a React/Vite `@guess-number/web` application. The web application owns rendering, local guest persistence, themes, and accessibility; it consumes game transitions from the core package and contains no online authentication or multiplayer authority.

**Tech Stack:** Node.js 24, npm workspaces, TypeScript, React, Vite, Vitest, Testing Library, ESLint, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-16-guess-number-online-design.md`

## Global Constraints

- Do not modify `D:\weixin\xwechat_files\wxid_celaa2ecb4jr22_9018\msg\file\2026-10\guess-number-game-8.html`; its reviewed SHA-256 baseline is `9CEAB55087D2BAFF58DF58C4A9D7A2D22341DF26B6128440401B400B9D464276`.
- Phase one implements single-player play, five themes, local guest history, responsive layout, keyboard interaction, reduced motion, and accessible dialogs only.
- Do not implement passwords, accounts, tokens, friends, matchmaking, online scoring, Socket.IO, PostgreSQL, or Redis in phase one.
- Dynamic content must be rendered by React text nodes or assigned with `textContent`; do not introduce `dangerouslySetInnerHTML` or dynamic `innerHTML`.
- `packages/game-core` must not access DOM APIs, browser storage, network APIs, or global randomness.
- Commit `package-lock.json` so the first successful dependency resolution is reproducible.
- Use Chinese user-facing copy consistent with the source application.

## Review Focus

- Corrupt or partially valid local storage must fall back to a normalized guest profile without crashing; Task 3 adds this regression test.
- Non-integer, out-of-range, repeated, and post-terminal guesses must not mutate game state; Task 2 tests each input class.
- Dialog focus must enter the dialog, remain trapped while open, close on Escape, and return to the trigger; Task 5 tests the complete keyboard flow.
- The 390x844 viewport must not hide the guess form or cause horizontal document overflow; Task 6 adds a browser assertion.
- Legacy authentication, token query parameters, score submission, dynamic HTML injection, and online secret exposure must not enter the new source tree; Task 6 adds source scans.

---

### Task 1: Workspace Foundation and Initial Game State

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `.gitignore`
- Create: `eslint.config.js`
- Create: `tsconfig.json`
- Create: `packages/game-core/package.json`
- Create: `packages/game-core/tsconfig.json`
- Create: `packages/game-core/src/index.ts`
- Create: `packages/game-core/src/game.ts`
- Test: `packages/game-core/src/game.test.ts`

**Interfaces:**
- Produces: `GameConfig`, `GameStatus`, `GameState`, and `createGame(config: GameConfig, secretNumber: number): GameState` from `@guess-number/game-core`.
- `GameConfig` contains `minNumber`, `maxNumber`, and `attemptLimit` as positive integers with `minNumber < maxNumber`.
- `GameState.status` begins as `ready`; bounds begin at the configured minimum and maximum; attempts and guesses begin empty.

- [ ] **Step 1: Create workspace and test configuration**

Add npm workspaces for `apps/*` and `packages/*`, root scripts for `test`, `typecheck`, `lint`, `build`, and `test:e2e`, strict TypeScript project references, Vitest, ESLint, and Playwright dependencies. Do not add production game implementation in this step.

- [ ] **Step 2: Install dependencies and commit the generated lockfile to the working tree**

Run: `npm install`

Expected: exit 0 and a root `package-lock.json` that records all resolved versions.

- [ ] **Step 3: Write the failing initial-state tests**

In `game.test.ts`, assert that `createGame({ minNumber: 1, maxNumber: 100, attemptLimit: 9 }, 42)` returns `ready`, zero attempts, no guesses, and bounds `1..100`. Add assertions that a secret outside the range and an invalid configuration throw typed errors.

- [ ] **Step 4: Run the test to verify RED**

Run: `npm test -- --run packages/game-core/src/game.test.ts`

Expected: FAIL because `createGame` and its exported types do not exist.

- [ ] **Step 5: Implement the initial-state API**

Implement the exact interfaces above. Keep configuration validation and state construction pure and immutable.

- [ ] **Step 6: Run focused tests and static checks to verify GREEN**

Run: `npm test -- --run packages/game-core/src/game.test.ts`

Expected: all initial-state tests pass.

Run: `npm run typecheck && npm run lint`

Expected: both commands exit 0 without errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .gitignore eslint.config.js tsconfig.json packages/game-core
git commit -m "build: establish typed game workspace"
```

### Task 2: Complete the Pure Game Engine

**Files:**
- Modify: `packages/game-core/src/game.ts`
- Modify: `packages/game-core/src/index.ts`
- Modify: `packages/game-core/src/game.test.ts`

**Interfaces:**
- Consumes: `GameState` and `GameConfig` from Task 1.
- Produces: `GuessError = "not-integer" | "out-of-range" | "duplicate" | "game-over"`.
- Produces: `GuessOutcome = "low" | "high" | "correct" | "lost"`.
- Produces: `GuessResult`, a discriminated union with either `{ ok: false; error; state }` or `{ ok: true; outcome; state }`.
- Produces: `submitGuess(state: GameState, guess: number): GuessResult` without mutating the input state.

- [ ] **Step 1: Write failing transition and validation tests**

Test low and high guesses, exact hits, range narrowing, loss on the ninth incorrect guess, duplicate rejection, `1.5`, `NaN`, `0`, `101`, and guesses after `won` or `lost`. Assert invalid results retain the exact original state object and valid results return a new state.

- [ ] **Step 2: Run the tests to verify RED**

Run: `npm test -- --run packages/game-core/src/game.test.ts`

Expected: FAIL because `submitGuess` does not exist.

- [ ] **Step 3: Implement `submitGuess`**

Use the current state and numeric guess to produce one validated immutable transition. The first valid guess changes `ready` to `active`; a correct guess changes status to `won`; the final incorrect guess changes status to `lost`.

- [ ] **Step 4: Run focused tests to verify GREEN**

Run: `npm test -- --run packages/game-core/src/game.test.ts`

Expected: all game-core tests pass.

- [ ] **Step 5: Run mutation-safety and dependency scans**

Run: `rg -n "document|window|localStorage|fetch|Math\.random" packages/game-core/src`

Expected: no matches.

Run: `npm run typecheck && npm run lint`

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add packages/game-core
git commit -m "feat: add immutable guessing rules"
```

### Task 3: Local Guest Profile, History, and Theme Persistence

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/vitest.setup.ts`
- Create: `apps/web/src/storage/guest-profile.ts`
- Create: `apps/web/src/storage/theme.ts`
- Test: `apps/web/src/storage/guest-profile.test.ts`
- Test: `apps/web/src/storage/theme.test.ts`

**Interfaces:**
- Produces: `GameRecord` with `id`, `result`, `attempts`, `secretNumber`, `guesses`, `pointsEarned`, and ISO `playedAt`.
- Produces: `GuestProfile` with nonnegative integer `points` and at most 200 normalized records.
- Produces: `loadGuestProfile(storage: StorageLike): GuestProfile`, `saveGuestProfile(storage, profile): boolean`, and `recordFinishedGame(profile, state, now, id): GuestProfile`.
- Produces: `ThemeId = "midnight" | "ocean" | "forest" | "sunset" | "rose"`, `loadTheme(storage): ThemeId`, and `saveTheme(storage, theme): boolean`.
- `StorageLike` exposes only `getItem(key)` and `setItem(key, value)` so tests can use a real in-memory implementation without browser globals.

- [ ] **Step 1: Add the web test harness without UI production code**

Configure Vitest with jsdom for the web workspace and Testing Library setup. Add the workspace dependency on `@guess-number/game-core`.

- [ ] **Step 2: Write failing storage tests**

Cover missing storage, malformed JSON, wrong field types, negative points, more than 200 records, storage read/write exceptions, win reward `+1`, loss reward `+0`, immutable profile updates, valid theme restoration, and unknown theme fallback to `midnight`.

- [ ] **Step 3: Run the storage tests to verify RED**

Run: `npm test -- --run apps/web/src/storage`

Expected: FAIL because the persistence modules do not exist.

- [ ] **Step 4: Implement guest profile and theme persistence**

Use the keys `number-detective.guest.v1` and `number-detective.theme.v1`. Catch storage failures, normalize every external value, cap records at 200 newest-first, and never persist credentials or tokens.

- [ ] **Step 5: Run storage tests to verify GREEN**

Run: `npm test -- --run apps/web/src/storage`

Expected: all storage tests pass.

Run: `npm run typecheck && npm run lint`

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web package.json package-lock.json tsconfig.json
git commit -m "feat: persist safe local guest progress"
```

### Task 4: Playable React Game Page

**Files:**
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/game/use-single-player-game.ts`
- Create: `apps/web/src/game/random-secret.ts`
- Create: `apps/web/src/components/GamePage.tsx`
- Create: `apps/web/src/components/GuessForm.tsx`
- Create: `apps/web/src/components/GameFeedback.tsx`
- Create: `apps/web/src/components/GameStats.tsx`
- Create: `apps/web/src/components/GuessHistory.tsx`
- Create: `apps/web/src/components/ResultPanel.tsx`
- Test: `apps/web/src/game/random-secret.test.ts`
- Test: `apps/web/src/components/GamePage.test.tsx`

**Interfaces:**
- Consumes: `createGame`, `submitGuess`, and game types from Tasks 1-2; guest persistence from Task 3.
- Produces: `createRandomSecret(min: number, max: number, random: () => number): number`; production passes `Math.random`, tests pass deterministic functions.
- Produces: `useSinglePlayerGame({ config, createSecret, storage })`, which owns the active single-player state, feedback, restart, and one-time local result recording.
- Produces: a `GamePage` with the source application's Chinese gameplay copy and accessible live feedback.

- [ ] **Step 1: Write the failing random-secret tests**

Assert inclusive minimum and maximum mapping and rejection of a random source outside `[0, 1)`.

- [ ] **Step 2: Run the focused test to verify RED**

Run: `npm test -- --run apps/web/src/game/random-secret.test.ts`

Expected: FAIL because `createRandomSecret` does not exist.

- [ ] **Step 3: Implement `createRandomSecret`**

Keep randomness outside `game-core`; inject it through the hook.

- [ ] **Step 4: Write failing page behavior tests**

Using deterministic secrets, test initial `1–100` and nine chances, invalid text, decimals, out-of-range input, duplicate guesses, low/high feedback, Enter submission, range narrowing, correct result, exhausted result, exactly one saved record, and restart with a new state.

- [ ] **Step 5: Run page tests to verify RED**

Run: `npm test -- --run apps/web/src/components/GamePage.test.tsx`

Expected: FAIL because the React page and hook do not exist.

- [ ] **Step 6: Implement the minimal playable page**

Build the hook and components listed above. Render all dynamic values as JSX text. Use a labeled number input, an assertive validation message, polite game feedback, disabled controls after terminal state, and a restart action.

- [ ] **Step 7: Run focused and full unit tests to verify GREEN**

Run: `npm test -- --run apps/web/src/game/random-secret.test.ts apps/web/src/components/GamePage.test.tsx`

Expected: focused tests pass.

Run: `npm test -- --run`

Expected: all workspace unit tests pass.

- [ ] **Step 8: Commit**

```bash
git add apps/web packages/game-core package.json package-lock.json
git commit -m "feat: migrate the single-player game to React"
```

### Task 5: Themes, History Dialog, and Keyboard Accessibility

**Files:**
- Create: `apps/web/src/components/Dialog.tsx`
- Create: `apps/web/src/components/HistoryDialog.tsx`
- Create: `apps/web/src/components/ThemePicker.tsx`
- Create: `apps/web/src/theme/themes.ts`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/components/GamePage.tsx`
- Test: `apps/web/src/components/Dialog.test.tsx`
- Test: `apps/web/src/components/HistoryDialog.test.tsx`
- Test: `apps/web/src/components/ThemePicker.test.tsx`

**Interfaces:**
- Consumes: `ThemeId`, theme persistence, and `GuestProfile` from Task 3.
- Produces: `Dialog({ open, title, onClose, returnFocusRef, children })` with initial focus, focus trapping, Escape close, backdrop close, and focus restoration.
- Produces: `ThemePicker` that applies `data-theme` to `document.documentElement` and persists only known theme IDs.
- Produces: `HistoryDialog` that shows total games, wins, answer, guess count, reward, and localized time using text rendering.

- [ ] **Step 1: Write failing dialog accessibility tests**

Test initial focus, forward and reverse Tab trapping, Escape close, backdrop close, return focus, and an accessible dialog name.

- [ ] **Step 2: Run dialog tests to verify RED**

Run: `npm test -- --run apps/web/src/components/Dialog.test.tsx`

Expected: FAIL because `Dialog` does not exist.

- [ ] **Step 3: Implement the accessible dialog primitive**

Use React refs and keyboard handling. Prevent background interaction while open and restore the previous document overflow value on close.

- [ ] **Step 4: Write failing theme and history tests**

Test all five theme labels and IDs, saved-theme restoration, unknown-theme fallback, dialog summary counts, empty history, normalized record rendering, and strings containing HTML-shaped text rendering literally.

- [ ] **Step 5: Run theme and history tests to verify RED**

Run: `npm test -- --run apps/web/src/components/ThemePicker.test.tsx apps/web/src/components/HistoryDialog.test.tsx`

Expected: FAIL because the theme and history components do not exist.

- [ ] **Step 6: Implement themes and local history UI**

Wire the components into `App`. Keep local identity labeled `游客`; do not add account or login controls.

- [ ] **Step 7: Run all unit tests and static checks to verify GREEN**

Run: `npm test -- --run && npm run typecheck && npm run lint`

Expected: all commands exit 0.

- [ ] **Step 8: Commit**

```bash
git add apps/web
git commit -m "feat: add themes and accessible game history"
```

### Task 6: Visual Migration, Responsive Browser Tests, and Delivery Documentation

**Files:**
- Create: `apps/web/src/styles/tokens.css`
- Create: `apps/web/src/styles/base.css`
- Create: `apps/web/src/styles/game.css`
- Create: `apps/web/src/styles/dialog.css`
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/e2e/game.spec.ts`
- Create: `README.md`
- Modify: `apps/web/src/main.tsx`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: all phase-one components.
- Produces: the migrated five-theme visual system and responsive layouts at desktop and `390x844` viewports.
- Produces: documented commands `npm install`, `npm run dev`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run test:e2e`.

- [ ] **Step 1: Write failing browser smoke tests**

Test a deterministic full win flow through the visible UI, history reopening after reload, theme restoration after reload, keyboard-only guess submission, reduced-motion rendering, and the `390x844` viewport. For the narrow viewport assert the guess form is visible and `document.documentElement.scrollWidth <= window.innerWidth`.

- [ ] **Step 2: Run browser tests to verify RED**

Run: `npm run test:e2e`

Expected: FAIL because Playwright configuration and final styles are incomplete.

- [ ] **Step 3: Migrate and organize the visual system**

Translate the source page's five palettes, card styling, stats, history chips, chance indicators, result overlay, responsive breakpoints, and `prefers-reduced-motion` behavior into focused CSS files. Keep content usable with vertical scrolling on short screens; do not use a global `overflow: hidden` that can hide controls.

- [ ] **Step 4: Add README and deterministic browser test support**

Document prerequisites, commands, architecture, phase-one scope, original-file preservation, and the future server boundary. Enable a test-only secret injection through Vite test mode without exposing a production query parameter or global control.

- [ ] **Step 5: Run browser tests to verify GREEN**

Run: `npm run test:e2e`

Expected: every desktop and mobile smoke test passes.

- [ ] **Step 6: Run prohibited-pattern and original-file checks**

Run: `rg -n "passwordHash|localStorage.*token|[?&]token=|submitOnlineScore|dangerouslySetInnerHTML|\.innerHTML|secretNumber.*socket|socket.*secretNumber" apps packages`

Expected: no matches, except `secretNumber` inside local-only game-core state and local guest records where the scan pattern does not match a socket path.

Run: `(Get-FileHash -Algorithm SHA256 -LiteralPath 'D:\weixin\xwechat_files\wxid_celaa2ecb4jr22_9018\msg\file\2026-10\guess-number-game-8.html').Hash`

Expected: exactly `9CEAB55087D2BAFF58DF58C4A9D7A2D22341DF26B6128440401B400B9D464276`; additionally confirm the attachment is outside this repository with `git status --short`.

- [ ] **Step 7: Run the complete verification suite**

Run: `npm test -- --run && npm run typecheck && npm run lint && npm run build && npm run test:e2e`

Expected: every command exits 0 with no test failures, type errors, lint errors, build errors, or browser-test failures.

- [ ] **Step 8: Inspect the production output**

Run: `Get-ChildItem -Recurse apps/web/dist | Select-Object FullName,Length`

Expected: `index.html` and hashed static assets exist; no credential, token, server, or database bundle is present.

- [ ] **Step 9: Commit**

```bash
git add .gitignore README.md apps/web
git commit -m "feat: finish responsive single-player migration"
```

### Task 7: Phase-One Acceptance Review

**Files:**
- Modify only if verification finds a defect in an earlier task.

**Interfaces:**
- Consumes: the complete phase-one application.
- Produces: an evidence-backed acceptance report in the final handoff; no new feature surface.

- [ ] **Step 1: Re-read the design acceptance criteria**

Check every item in section 11 of the spec against a concrete file, test, or command result. Record any gap before making a completion claim.

- [ ] **Step 2: Run fresh full verification**

Run: `npm test -- --run && npm run typecheck && npm run lint && npm run build && npm run test:e2e`

Expected: all commands exit 0 in this fresh run.

- [ ] **Step 3: Review repository changes**

Run: `git status --short && git log --oneline --decorate -8`

Expected: only intentional files are present and each implementation task has a focused commit.

- [ ] **Step 4: Perform a final security scan**

Run: `rg -n "dangerouslySetInnerHTML|\.innerHTML|password|token|fetch\(|WebSocket|Socket\.IO|socket\.io|PostgreSQL|Redis" apps packages`

Expected: no runtime implementation of credentials, online networking, or dynamic HTML exists in phase one. Documentation-only future references are outside the scanned directories.

- [ ] **Step 5: Commit verification fixes if required**

If earlier steps expose a defect, reproduce it with a failing test, implement the smallest fix, rerun the complete suite, and commit only that tested fix. If no defect exists, do not create an empty commit.


# 版本一：单机、本机账号与原版视觉恢复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 React 工程中恢复原版单机玩法、本机多账号、积分等级、本地排行榜、历史记录、祝福与彩带，以及尽量接近原版的响应式界面。

**Architecture:** 保留 `@guess-number/game-core` 作为唯一游戏规则来源；在 Web 应用内新增纯函数化的 `profile` 领域模块，负责版本化存储、本机认证、进度和排名，再由一个 React hook 将领域状态接到页面。页面组件只负责展示和操作，联机按钮在本版本保留原版位置但明确标注为下一版本恢复，不引入任何网络实现。

**Tech Stack:** Node.js 24、npm workspaces、TypeScript、React、Vite、Vitest、Testing Library、ESLint、Playwright。

**Spec:** `docs/superpowers/specs/2026-10-17-feature-parity-recovery-design.md`

## Global Constraints

- 不修改原附件 `D:\weixin\xwechat_files\wxid_celaa2ecb4jr22_9018\msg\file\2026-10\guess-number-game-8.html`；其 SHA-256 必须保持 `9CEAB55087D2BAFF58DF58C4A9D7A2D22341DF26B6128440401B400B9D464276`。
- 本计划只交付总设计中的版本一；不实现在线注册、好友、PK、网络请求或服务端。
- 新本机账号使用独立键 `number-detective.local-accounts.v1`，不得读取原页面的 `number-detective.accounts.v2`，也不得读取当前简化版的 `number-detective.guest.v1`。
- 游戏范围固定为 `1–100`，机会固定为 `9`，每次胜利加 `1` 积分，失败加 `0` 分，每个账号最多保留最新 `200` 条记录。
- 等级门槛固定为 `0、1、3、7、15、31、63、127、255、511`，最高 `Lv.10`。
- 用户名去除首尾空格后为 `2–16` 个字符，比较时不区分大小写；密码为 `4–32` 个字符；界面必须提示账号只保存在本机且不应复用重要密码。
- 动态用户内容必须作为 React 文本节点渲染；禁止 `dangerouslySetInnerHTML` 和动态 `innerHTML`。
- 必须保留五个主题 `midnight、ocean、forest、sunset、rose`、键盘操作、对话框焦点管理、移动端适配和 `prefers-reduced-motion`。
- 存储读取或写入失败时游戏仍能在内存中运行；不能白屏或丢失当前局。
- 每个任务遵循 RED → GREEN → 重构 → 聚焦提交，不顺带实现后续联机范围。

## Review Focus

- 本地存储为损坏 JSON、字段结构异常或读写抛错时，应安全进入全新的游客状态；Task 2 添加回归测试。
- 用户名仅大小写或首尾空格不同，应判定为同一用户名并拒绝重复注册；Task 3 添加回归测试。
- Web Crypto 不可用时，密码仍只保存确定性摘要而非明文；Task 3 添加回归测试。
- React 重渲染、重复点击或终局后的额外提交不能重复增加积分或记录；Task 4 添加集成测试。
- 320px 宽屏幕和减少动态效果模式下，不得横向溢出、遮挡输入框或保留持续动画；Task 8 添加浏览器测试。

---

### Task 1: 等级、升级与祝福纯函数

**Files:**
- Create: `apps/web/src/profile/progression.ts`
- Test: `apps/web/src/profile/progression.test.ts`

**Interfaces:**
- Produces: `LEVEL_MIN_POINTS`，值精确为 `[0, 1, 3, 7, 15, 31, 63, 127, 255, 511] as const`。
- Produces: `LevelInfo = { level: number; progress: number; pointsToNext: number; nextLevel: number | null }`。
- Produces: `getLevelInfo(points: unknown): LevelInfo`，负数、非数值和小数先归一化为非负整数。
- Produces: `getBlessing(attempts: number, random?: () => number): string`，按 `1`、`2–3`、`4–6`、`7–9` 次四档选择原版祝福语。

- [ ] **Step 1: 写等级与祝福失败测试**

```ts
expect(getLevelInfo(0)).toMatchObject({ level: 1, pointsToNext: 1, nextLevel: 2 });
expect(getLevelInfo(31)).toMatchObject({ level: 6, progress: 0, pointsToNext: 32 });
expect(getLevelInfo(511)).toEqual({ level: 10, progress: 100, pointsToNext: 0, nextLevel: null });
expect(getBlessing(1, () => 0)).toBe("一击命中，你就是今天的幸运星！");
expect(getBlessing(7, () => 0)).toBe("绝地反击，最后关头命中啦！");
```

- [ ] **Step 2: 运行测试确认 RED**

Run: `npm test -- --run apps/web/src/profile/progression.test.ts`

Expected: FAIL，因为模块和导出尚不存在。

- [ ] **Step 3: 实现进度与祝福接口**

完整迁移原版四组祝福语；`random` 默认使用 `Math.random`，测试可注入确定值。无效尝试次数按最接近的合法档位处理。

- [ ] **Step 4: 运行聚焦测试确认 GREEN**

Run: `npm test -- --run apps/web/src/profile/progression.test.ts`

Expected: 全部通过。

- [ ] **Step 5: 提交**

```bash
git add apps/web/src/profile/progression.ts apps/web/src/profile/progression.test.ts
git commit -m "feat: restore local progression rules"
```

### Task 2: 版本化本机账号存储

**Files:**
- Create: `apps/web/src/profile/local-profile.ts`
- Test: `apps/web/src/profile/local-profile.test.ts`

**Interfaces:**
- Produces: `StorageLike`，只包含 `getItem(key)` 与 `setItem(key, value)`。
- Produces: `GameRecord`、`LocalAccount`、`LocalProfileState`；状态固定含 `version: 1`、`currentAccountId` 和 `accounts`。
- Produces: `GUEST_ID = "guest"` 与 `createInitialLocalProfile(): LocalProfileState`。
- Produces: `loadLocalProfile(storage: StorageLike): LocalProfileState` 和 `saveLocalProfile(storage, state): boolean`。
- 游客账号永远存在、用户名固定为“游客”、无密码摘要；每个记录字段归一化，记录截断到最新 200 条。

- [ ] **Step 1: 写存储失败测试**

```ts
expect(loadLocalProfile(emptyStorage).currentAccountId).toBe("guest");
expect(loadLocalProfile(malformedStorage)).toEqual(createInitialLocalProfile());
expect(loadLocalProfile(throwingStorage)).toEqual(createInitialLocalProfile());
expect(saveLocalProfile(writeThrowingStorage, createInitialLocalProfile())).toBe(false);
expect(storage.readKeys).not.toContain("number-detective.accounts.v2");
expect(storage.readKeys).not.toContain("number-detective.guest.v1");
```

- [ ] **Step 2: 运行测试确认 RED**

Run: `npm test -- --run apps/web/src/profile/local-profile.test.ts`

Expected: FAIL，因为新存储模块不存在。

- [ ] **Step 3: 实现严格归一化与新存储键**

只读取 `number-detective.local-accounts.v1`。非法当前账号回退到游客；非游客账号缺少有效 `id`、用户名或摘要时丢弃；日期无效时使用 Unix 纪元 ISO 时间，不能在读取时生成随机值。

- [ ] **Step 4: 运行存储测试确认 GREEN**

Run: `npm test -- --run apps/web/src/profile/local-profile.test.ts`

Expected: 全部通过，包括损坏数据、200 条截断和读写抛错。

- [ ] **Step 5: 暂不删除旧游客模块并提交新存储基础**

旧模块仍被页面引用，本任务只提交新增文件；Task 4 完成切换后再删除。

```bash
git add apps/web/src/profile/local-profile.ts apps/web/src/profile/local-profile.test.ts
git commit -m "feat: add versioned local profile storage"
```

### Task 3: 本机认证、记录与排行榜领域操作

**Files:**
- Create: `apps/web/src/profile/local-auth.ts`
- Create: `apps/web/src/profile/profile-actions.ts`
- Test: `apps/web/src/profile/local-auth.test.ts`
- Test: `apps/web/src/profile/profile-actions.test.ts`

**Interfaces:**
- Produces: `hashLocalPassword(password: string, subtle?: SubtleCrypto | null): Promise<string>`，使用前缀 `number-detective-v2:`；优先 SHA-256，失败时返回原版 FNV-1a 形式 `local_<hex>`。
- Produces: `registerLocalAccount(state, { username, password, confirmation }, deps): Promise<AuthResult>`；`deps` 精确包含 `createAccountId(): string` 与 `hashPassword(password): Promise<string>`。
- Produces: `loginLocalAccount(state, { username, password }, deps): Promise<AuthResult>` 和 `logoutLocalAccount(state): LocalProfileState`。
- `AuthResult` 是 `{ ok: true; state } | { ok: false; error }`，错误文案沿用原版：用户名 `2–16`、密码 `4–32`、两次密码不一致、用户名已存在、用户名或密码不正确。
- Produces: `recordFinishedGame(state, gameState, now, recordId): { state; reward }`，其中 `reward = { pointsEarned; leveledUp; previousLevel; newLevel }`。
- Produces: `rankLocalAccounts(state): RankedLocalAccount[]`，排除游客，依次按积分降序、胜场降序、中文用户名升序，最多 100 名。

- [ ] **Step 1: 写认证失败测试**

```ts
expect((await registerLocalAccount(state, validInput, deps)).ok).toBe(true);
expect((await registerLocalAccount(next, { ...validInput, username: "  ALICE  " }, deps))).toMatchObject({ ok: false, error: "这个用户名已经注册过了。" });
expect((await loginLocalAccount(next, { username: "alice", password: "bad1" }, deps))).toMatchObject({ ok: false, error: "用户名或密码不正确。" });
expect(await hashLocalPassword("secret", null)).toMatch(/^local_[0-9a-f]+$/);
expect(await hashLocalPassword("secret", null)).not.toContain("secret");
```

- [ ] **Step 2: 运行认证测试确认 RED**

Run: `npm test -- --run apps/web/src/profile/local-auth.test.ts`

Expected: FAIL，因为认证模块不存在。

- [ ] **Step 3: 实现本机认证纯操作**

所有成功操作返回新状态，不修改输入；注册成功后立即切换到新账号，登录按去空格且不区分大小写匹配，退出只切回游客。

- [ ] **Step 4: 写记录和排名失败测试**

```ts
expect(recordFinishedGame(state, wonGame, now, "win-1").reward).toMatchObject({ pointsEarned: 1, leveledUp: true, newLevel: 2 });
expect(recordFinishedGame(state, lostGame, now, "loss-1").reward.pointsEarned).toBe(0);
expect(recordFinishedGame(alreadyRecorded, wonGame, now, "win-1").state).toBe(alreadyRecorded);
expect(rankLocalAccounts(rankingState).map(({ username }) => username)).toEqual(["高分", "同分多胜", "同分少胜"]);
```

- [ ] **Step 5: 运行记录测试确认 RED**

Run: `npm test -- --run apps/web/src/profile/profile-actions.test.ts`

Expected: FAIL，因为记录和排名接口不存在。

- [ ] **Step 6: 实现记录、升级摘要和排名**

只允许 `won` 或 `lost` 状态；相同 `recordId` 已存在时返回原状态和零奖励，保证幂等。复用 Task 1 的 `getLevelInfo`，不复制等级逻辑。

- [ ] **Step 7: 运行 Task 3 全部测试确认 GREEN**

Run: `npm test -- --run apps/web/src/profile/local-auth.test.ts apps/web/src/profile/profile-actions.test.ts`

Expected: 全部通过。

- [ ] **Step 8: 提交**

```bash
git add apps/web/src/profile/local-auth.ts apps/web/src/profile/local-auth.test.ts apps/web/src/profile/profile-actions.ts apps/web/src/profile/profile-actions.test.ts
git commit -m "feat: restore local accounts and ranking rules"
```

### Task 4: React 本机资料 Hook 与游戏结算接线

**Files:**
- Create: `apps/web/src/profile/use-local-profile.ts`
- Test: `apps/web/src/profile/use-local-profile.test.tsx`
- Modify: `apps/web/src/game/use-single-player-game.ts`
- Modify: `apps/web/src/components/GamePage.test.tsx`
- Delete: `apps/web/src/storage/guest-profile.ts`
- Delete: `apps/web/src/storage/guest-profile.test.ts`

**Interfaces:**
- Produces: `useLocalProfile({ storage, createAccountId, hashPassword })`，返回 `state`、`currentAccount`、`levelInfo`、`rankedAccounts`、`persistenceWarning`、`register`、`login`、`logout`、`recordGame`。
- `register` 与 `login` 返回 `Promise<AuthResult>`；成功后立即保存并更新当前账号。
- `recordGame(gameState, now, recordId)` 返回 Task 3 的 `reward`，即使保存失败也保留内存中的结果并设置警告。
- Modify: `useSinglePlayerGame` 删除 `storage/profile` 职责，新增 `onFinished(state: GameState): void`；每局终局只调用一次。

- [ ] **Step 1: 写 Hook 失败测试**

```tsx
expect(result.current.currentAccount.isGuest).toBe(true);
await act(async () => { await result.current.register(validInput); });
expect(result.current.currentAccount.username).toBe("Alice");
act(() => result.current.recordGame(wonGame, now, "win-1"));
expect(result.current.currentAccount.points).toBe(1);
expect(result.current.persistenceWarning).toBe("");
```

另用写入抛错的存储断言积分仍在内存中变为 `1`，并出现“本机数据无法保存，关闭页面后可能丢失。”。

- [ ] **Step 2: 运行 Hook 测试确认 RED**

Run: `npm test -- --run apps/web/src/profile/use-local-profile.test.tsx`

Expected: FAIL，因为 Hook 尚不存在。

- [ ] **Step 3: 实现 Hook 并集中持久化**

Hook 只通过 Task 2–3 接口改变状态；不得在组件中直接读写 localStorage。

- [ ] **Step 4: 写游戏结算一次性失败测试**

在 `GamePage.test.tsx` 中注入 `onFinished` 所需依赖，猜中后重复按 Enter、点击禁用按钮并触发重渲染，断言记录 ID 创建、积分增加和存储写入均只发生一次。

- [ ] **Step 5: 运行页面测试确认 RED**

Run: `npm test -- --run apps/web/src/components/GamePage.test.tsx`

Expected: FAIL，因为页面仍依赖旧游客资料接口。

- [ ] **Step 6: 重构游戏 Hook 并接入 `useLocalProfile`**

由 `GamePage` 在 `onFinished` 中生成记录 ID、写入当前账号并保存 `reward`，重新开局时清空上一局奖励。移除所有 `guest-profile` 引用后删除旧文件。

- [ ] **Step 7: 运行迁移测试确认 GREEN**

Run: `npm test -- --run apps/web/src/profile apps/web/src/components/GamePage.test.tsx`

Expected: 全部通过，仓库中不再引用 `number-detective.guest.v1`。

- [ ] **Step 8: 提交**

```bash
git add apps/web/src/profile apps/web/src/game/use-single-player-game.ts apps/web/src/components/GamePage.test.tsx apps/web/src/storage/guest-profile.ts apps/web/src/storage/guest-profile.test.ts
git commit -m "refactor: connect gameplay to local profiles"
```

### Task 5: 本机登录注册界面

**Files:**
- Create: `apps/web/src/components/AccountDialog.tsx`
- Test: `apps/web/src/components/AccountDialog.test.tsx`
- Create: `apps/web/src/styles/account.css`
- Modify: `apps/web/src/main.tsx`

**Interfaces:**
- Produces: `AccountDialog({ open, account, levelInfo, onLogin, onRegister, onLogout, onClose, returnFocusRef })`。
- 未登录时提供“登录/注册”选项卡、用户名、密码、注册确认密码、提交中状态和错误提示。
- 已登录时显示头像首字、用户名、`Lv.x · y 积分 · z 局记录` 和“退出登录”。
- 固定显示：“账号、积分和历史记录仅保存在当前浏览器中，请勿复用重要密码。”

- [ ] **Step 1: 写登录注册界面失败测试**

```tsx
expect(screen.getByRole("dialog", { name: "登录或注册" })).toBeInTheDocument();
expect(screen.getByText(/仅保存在当前浏览器/)).toBeInTheDocument();
await user.click(screen.getByRole("tab", { name: "注册" }));
expect(screen.getByLabelText("确认密码")).toBeVisible();
expect(onRegister).toHaveBeenCalledWith({ username: "Alice", password: "pass", confirmation: "pass" });
```

补充登录错误保留输入、提交期间按钮禁用、退出回调、HTML 形状用户名按纯文本渲染的断言。

- [ ] **Step 2: 运行测试确认 RED**

Run: `npm test -- --run apps/web/src/components/AccountDialog.test.tsx`

Expected: FAIL，因为组件不存在。

- [ ] **Step 3: 实现可访问认证对话框**

复用现有 `Dialog`；选项卡使用 `role="tab"`、`aria-selected`，切换注册时同步密码 `autocomplete`，关闭或成功后清除密码字段。

- [ ] **Step 4: 加入原版认证区域样式并导入**

还原原版选项卡、输入区、账号面板、头像和本机提示；保持 320px 屏幕可滚动。

- [ ] **Step 5: 运行组件与对话框测试确认 GREEN**

Run: `npm test -- --run apps/web/src/components/AccountDialog.test.tsx apps/web/src/components/Dialog.test.tsx`

Expected: 全部通过。

- [ ] **Step 6: 提交**

```bash
git add apps/web/src/components/AccountDialog.tsx apps/web/src/components/AccountDialog.test.tsx apps/web/src/styles/account.css apps/web/src/main.tsx
git commit -m "feat: restore local account dialog"
```

### Task 6: 等级资料条、历史与本地排行榜

**Files:**
- Create: `apps/web/src/components/ProfileStrip.tsx`
- Test: `apps/web/src/components/ProfileStrip.test.tsx`
- Create: `apps/web/src/components/LeaderboardDialog.tsx`
- Test: `apps/web/src/components/LeaderboardDialog.test.tsx`
- Modify: `apps/web/src/components/HistoryDialog.tsx`
- Modify: `apps/web/src/components/HistoryDialog.test.tsx`
- Create: `apps/web/src/styles/profile.css`
- Modify: `apps/web/src/main.tsx`

**Interfaces:**
- Produces: `ProfileStrip({ account, levelInfo })`，显示等级圆标、用户名、积分、进度条和下一等级提示；最高级显示“已达到最高等级 Lv.10”。
- Produces: `LeaderboardDialog({ open, accounts, currentAccountId, onClose, returnFocusRef })`，游客显示“不参与排名”，前三名有独立视觉状态，当前账号高亮。
- `HistoryDialog` 改为接受 `LocalAccount`，继续显示当前账号、胜场、总局数和最多 200 条记录。

- [ ] **Step 1: 写资料条与排行榜失败测试**

```tsx
expect(screen.getByLabelText("当前等级")).toHaveTextContent("6");
expect(screen.getByText("距离 Lv.7 还差 32 积分")).toBeInTheDocument();
expect(within(screen.getByRole("dialog", { name: "排行榜" })).getAllByRole("article")[0]).toHaveTextContent("高分");
expect(screen.getByText("游客暂不参与排名")).toBeInTheDocument();
```

- [ ] **Step 2: 运行测试确认 RED**

Run: `npm test -- --run apps/web/src/components/ProfileStrip.test.tsx apps/web/src/components/LeaderboardDialog.test.tsx`

Expected: FAIL，因为新组件不存在。

- [ ] **Step 3: 实现资料条和排行榜**

排行榜只消费 Task 3 已排序结果，不在组件内重新排序。所有用户名作为 JSX 文本渲染。

- [ ] **Step 4: 更新历史记录类型与测试**

将旧 `GuestProfile` 引用替换为 `LocalAccount`，保留现有空状态、胜负文案、时间格式和 XSS 回归测试。

- [ ] **Step 5: 加入原版资料与排行榜样式**

还原等级圆标、进度轨道、前三名徽章、当前账号高亮和移动端布局。

- [ ] **Step 6: 运行聚焦测试确认 GREEN**

Run: `npm test -- --run apps/web/src/components/ProfileStrip.test.tsx apps/web/src/components/LeaderboardDialog.test.tsx apps/web/src/components/HistoryDialog.test.tsx`

Expected: 全部通过。

- [ ] **Step 7: 提交**

```bash
git add apps/web/src/components/ProfileStrip.tsx apps/web/src/components/ProfileStrip.test.tsx apps/web/src/components/LeaderboardDialog.tsx apps/web/src/components/LeaderboardDialog.test.tsx apps/web/src/components/HistoryDialog.tsx apps/web/src/components/HistoryDialog.test.tsx apps/web/src/styles/profile.css apps/web/src/main.tsx
git commit -m "feat: restore levels history and leaderboard"
```

### Task 7: 结算祝福、升级提示与彩带效果

**Files:**
- Create: `apps/web/src/components/ConfettiLayer.tsx`
- Test: `apps/web/src/components/ConfettiLayer.test.tsx`
- Modify: `apps/web/src/components/ResultPanel.tsx`
- Test: `apps/web/src/components/ResultPanel.test.tsx`
- Create: `apps/web/src/styles/effects.css`
- Modify: `apps/web/src/main.tsx`

**Interfaces:**
- Produces: `ConfettiLayer({ active, random?, onFinished? })`，胜利时生成 34 个彩带片，颜色固定为原版五色，1400ms 后清理。
- Modify: `ResultPanel({ state, reward, blessing, onRestart })`，胜利显示祝福和升级文案，失败显示原版安慰文案。
- 减少动态效果由 CSS 媒体查询将动画缩短至 `0.01ms`；组件仍能按时清理 DOM。

- [ ] **Step 1: 写结算与彩带失败测试**

```tsx
expect(screen.getAllByTestId("confetti-piece")).toHaveLength(34);
vi.advanceTimersByTime(1400);
expect(screen.queryAllByTestId("confetti-piece")).toHaveLength(0);
expect(screen.getByText("本局 +1 积分 · 升级至 Lv.2")).toBeInTheDocument();
expect(screen.getByText("别灰心，这一次的遗憾会变成下一局的好运。")).toBeInTheDocument();
```

- [ ] **Step 2: 运行测试确认 RED**

Run: `npm test -- --run apps/web/src/components/ConfettiLayer.test.tsx apps/web/src/components/ResultPanel.test.tsx`

Expected: FAIL，因为彩带和新结算接口不存在。

- [ ] **Step 3: 实现效果组件和结果文案**

随机位置和漂移通过注入的 `random` 生成；计时器在重开或卸载时清理，避免旧局效果泄漏。

- [ ] **Step 4: 加入效果样式并确认 GREEN**

Run: `npm test -- --run apps/web/src/components/ConfettiLayer.test.tsx apps/web/src/components/ResultPanel.test.tsx`

Expected: 全部通过且没有未清理计时器警告。

- [ ] **Step 5: 提交**

```bash
git add apps/web/src/components/ConfettiLayer.tsx apps/web/src/components/ConfettiLayer.test.tsx apps/web/src/components/ResultPanel.tsx apps/web/src/components/ResultPanel.test.tsx apps/web/src/styles/effects.css apps/web/src/main.tsx
git commit -m "feat: restore result celebrations"
```

### Task 8: 原版页面整合、主题入口与浏览器验收

**Files:**
- Modify: `apps/web/src/components/GamePage.tsx`
- Modify: `apps/web/src/components/GamePage.test.tsx`
- Modify: `apps/web/src/components/ThemePicker.tsx`
- Modify: `apps/web/src/components/ThemePicker.test.tsx`
- Modify: `apps/web/src/styles/base.css`
- Modify: `apps/web/src/styles/game.css`
- Modify: `apps/web/src/styles/dialog.css`
- Modify: `apps/web/src/styles/tokens.css`
- Create: `apps/web/e2e/local-profile.spec.ts`
- Modify: `apps/web/e2e/game.spec.ts`
- Create: `docs/qa/v1-feature-parity-checklist.md`
- Modify: `README.md`

**Interfaces:**
- `GamePage` 顶部顺序固定为“登录/当前用户名、联机、排行、战绩、重开”；本版本“联机”按钮使用 `aria-disabled="true"` 保持可聚焦，触发后只在页面状态区显示“联机功能将在第二版本恢复”，不得发起网络请求。
- `GamePage` 串联账号、等级、排行榜、历史、结算和持久化警告；任何时刻只允许一个对话框打开。
- `ThemePicker` 恢复原版“背景”浮动按钮，使用 `aria-expanded` 控制五主题面板，并继续持久化选择。
- `docs/qa/v1-feature-parity-checklist.md` 按游戏、账号、排行、历史、主题、动画、桌面、手机和启动器逐项记录人工结果。

- [ ] **Step 1: 写页面整合失败测试**

注册 `Alice`、猜中一次并打开排行榜，断言顶部账号名、`1 积分`、`Lv.2`、一条当前账号排名和一条历史记录同时成立；退出后断言游客数据与 Alice 数据隔离，重新登录后 Alice 数据恢复。

- [ ] **Step 2: 运行页面测试确认 RED**

Run: `npm test -- --run apps/web/src/components/GamePage.test.tsx apps/web/src/components/ThemePicker.test.tsx`

Expected: FAIL，因为所有新组件尚未接入页面。

- [ ] **Step 3: 完成 GamePage 和主题入口整合**

将五个顶部动作、原版 profile strip、持久化警告、互斥对话框与彩带接入；主题面板关闭时不移除背景按钮，按 Escape 关闭面板。

- [ ] **Step 4: 对齐原版视觉与响应式断点**

以原附件为基准还原卡片宽度、顶部布局、资料条、反馈、统计、机会点、记录、结果层和弹窗。保留现有键盘焦点样式、纵向滚动和减少动态效果支持。

- [ ] **Step 5: 写端到端失败测试**

`local-profile.spec.ts` 覆盖注册、胜利、升级、刷新恢复、排行榜、退出、重新登录和账号隔离；`game.spec.ts` 补充背景面板展开/收起、320×700 与 390×844 无横向溢出、减少动态效果、键盘提交和结果重开。

- [ ] **Step 6: 运行端到端测试确认 GREEN**

Run: `npm run test:e2e`

Expected: 所有桌面与移动端流程通过，`document.documentElement.scrollWidth <= window.innerWidth`，输入框始终可见。

- [ ] **Step 7: 更新 README 和人工验收表**

README 将当前范围改为版本一功能，并明确本机账号不跨设备、联机将在版本二恢复。人工验收表列出原版对照证据、检查设备和未通过项；不得用“自动测试通过”代替视觉人工检查。

- [ ] **Step 8: 运行完整自动验证**

Run: `npm test -- --run`

Expected: 全部单元与组件测试通过。

Run: `npm run typecheck`

Expected: 无类型错误。

Run: `npm run lint`

Expected: 无 lint 错误。

Run: `npm run build`

Expected: 生产构建成功。

Run: `npm run test:launcher`

Expected: 启动器测试通过。

Run: `npm run test:e2e`

Expected: 所有浏览器测试通过。

- [ ] **Step 9: 运行安全与范围扫描**

Run: `rg -n "dangerouslySetInnerHTML|\.innerHTML|fetch\(|WebSocket|socket\.io|localStorage.*token|[?&]token=" apps packages`

Expected: 无运行时代码匹配。

Run: `rg -n "number-detective\.accounts\.v2|number-detective\.guest\.v1" apps packages`

Expected: 无匹配。

Run: `(Get-FileHash -Algorithm SHA256 -LiteralPath 'D:\weixin\xwechat_files\wxid_celaa2ecb4jr22_9018\msg\file\2026-10\guess-number-game-8.html').Hash`

Expected: `9CEAB55087D2BAFF58DF58C4A9D7A2D22341DF26B6128440401B400B9D464276`。

- [ ] **Step 10: 人工完成原版对照验收**

分别在桌面 Chrome、390×844 和 320×700 视口操作完整流程，填写 `docs/qa/v1-feature-parity-checklist.md`。如有失败，先增加可复现测试，再做最小修复并重跑完整验证。

- [ ] **Step 11: 提交版本一整合**

```bash
git add apps/web README.md docs/qa/v1-feature-parity-checklist.md
git commit -m "feat: complete local feature parity recovery"
```

### Task 9: 版本一最终复核

**Files:**
- Modify only if verification reveals a tested defect.

**Interfaces:**
- Consumes: Tasks 1–8 的完整版本一。
- Produces: 有测试输出、人工对照表和提交记录支撑的验收结论；不增加新功能。

- [ ] **Step 1: 对照总设计检查版本一覆盖范围**

逐项核对规格第 3.1、4.1、4.2、4.4、6.1、8、10 和 12 节；每一项必须能指向代码、自动测试或人工验收记录。

- [ ] **Step 2: 从干净状态重新运行完整验证**

依次运行 `npm test -- --run`、`npm run typecheck`、`npm run lint`、`npm run build`、`npm run test:launcher`、`npm run test:e2e`。

Expected: 所有命令均以 0 退出，无失败、未处理警告或跳过的关键测试。

- [ ] **Step 3: 检查变更和提交粒度**

Run: `git status --short`

Expected: 没有意外文件。

Run: `git log --oneline --decorate -12`

Expected: 每个任务均有聚焦提交，未混入联机实现。

- [ ] **Step 4: 验证原附件未改变**

重新计算 SHA-256，必须与全局约束完全一致。

- [ ] **Step 5: 仅在发现问题时提交修复**

发现问题先写失败测试，再做最小修复并重跑全套验证；无问题则不创建空提交。

# 移除联机入口 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从版本一页面和说明中彻底移除联机入口与联机预告，同时保留已经恢复的全部单机和本机功能。

**Architecture:** 不新增模块，只收紧 `GamePage` 的顶部操作和公开文案。删除联机状态后，账号、排行、历史和游戏状态仍沿用现有组件边界；现有浏览器验收继续证明手机布局没有因按钮数量变化而退化。

**Tech Stack:** TypeScript、React、Vitest、Testing Library、Playwright、Vite。

**Spec:** `docs/superpowers/specs/2026-10-18-remove-online-entry-design.md`

## Global Constraints

- 顶部操作顺序固定为“登录/当前用户名、排行、战绩、重开”。
- 页面不得显示“联机”按钮、联机占位或版本二恢复提示。
- 不修改账号、积分、等级、排行、战绩、主题、结算和彩带行为。
- 不新增 `fetch`、`WebSocket`、Socket.IO 或其他网络实现。
- 原附件不得修改，SHA-256 必须保持 `9CEAB55087D2BAFF58DF58C4A9D7A2D22341DF26B6128440401B400B9D464276`。

## Review Focus

- 已登录时顶部第一项仍显示当前用户名，而不是固定“登录”。
- 删除联机状态后，账号、排行和历史三个弹窗仍互斥。
- 320×700 下四个按钮不横向溢出，输入区仍在首屏可见。
- README 和验收表不再把联机列为当前入口或既定下一版本。
- 运行时代码没有残留联机文案或网络 API。

---

### Task 1: 删除联机入口并完成范围收尾

**Files:**
- Modify: `apps/web/src/components/GamePage.test.tsx`
- Modify: `apps/web/src/components/GamePage.tsx`
- Modify: `apps/web/e2e/game.spec.ts`
- Modify: `README.md`
- Create: `docs/qa/v1-feature-parity-checklist.md`

**Interfaces:**
- Consumes: 现有 `GamePage`、`AccountDialog`、`LeaderboardDialog`、`HistoryDialog` 与本机资料 Hook。
- Produces: 不含联机状态的版本一页面；顶部只保留四个本机操作入口。

- [ ] **Step 1: 修改组件测试并确认 RED**

将顶部操作测试改为断言：

```ts
expect(actions.map((button) => button.textContent)).toEqual(["登录", "排行", "战绩", "重开"]);
expect(screen.queryByRole("button", { name: "联机" })).not.toBeInTheDocument();
expect(screen.queryByText(/第二版本恢复/)).not.toBeInTheDocument();
```

Run: `npm test -- --run apps/web/src/components/GamePage.test.tsx`

Expected: FAIL，因为旧实现仍渲染联机按钮。

- [ ] **Step 2: 删除页面联机状态与按钮**

在 `GamePage.tsx` 中删除 `pageNotice` 状态、联机按钮、联机点击处理以及只服务于该提示的 `.page-notice` 样式；保留 `persistenceWarning`。

- [ ] **Step 3: 更新浏览器回归并确认 GREEN**

在 `game.spec.ts` 的两个手机视口用例中补充“联机按钮不存在”和四按钮顺序断言。

Run: `npm test -- --run apps/web/src/components/GamePage.test.tsx`

Expected: 全部通过。

Run: `npm run test:e2e`

Expected: 8 个桌面与手机流程全部通过。

- [ ] **Step 4: 更新公开说明和验收记录**

README 只描述单机和本机功能，不承诺版本二联机；`docs/qa/v1-feature-parity-checklist.md` 记录桌面、390×844、320×700、账号、排行、历史、主题、动画和启动器结果，并明确联机已从范围移除。

- [ ] **Step 5: 运行完整验证与范围扫描**

依次运行：

```text
npm test -- --run
npm run typecheck
npm run lint
npm run build
npm run test:launcher
npm run test:e2e
```

Expected: 全部以 0 退出。

Run: `rg -n "联机|第二版本恢复|fetch\(|WebSocket|socket\.io" apps/web/src apps/web/e2e README.md docs/qa`

Expected: 无运行时联机入口或网络 API；验收表最多只出现“已移除联机”的范围说明。

- [ ] **Step 6: 验证原附件并提交**

Run: `(Get-FileHash -Algorithm SHA256 -LiteralPath 'D:\weixin\xwechat_files\wxid_celaa2ecb4jr22_9018\msg\file\2026-10\guess-number-game-8.html').Hash`

Expected: `9CEAB55087D2BAFF58DF58C4A9D7A2D22341DF26B6128440401B400B9D464276`。

```bash
git add apps/web README.md docs/qa/v1-feature-parity-checklist.md
git commit -m "feat: complete offline feature parity recovery"
```

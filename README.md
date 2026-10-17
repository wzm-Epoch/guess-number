# 数字侦探

这是原单文件猜数字页面的第一阶段工程化版本。当前提供可测试的单机玩法、五套主题和本地游客战绩，并为后续服务端权威的公网多人联机保留清晰边界。

原始附件保持不变；新代码全部位于本仓库。

## 环境

- Node.js 24 或更高版本
- npm 11 或更高版本
- 浏览器测试优先使用 Windows 已安装的 Google Chrome；其他环境运行前执行 `npx playwright install chromium`

## 使用

```bash
npm install
npm run dev
```

开发服务器启动后，根据终端显示的地址打开页面。

## 验证

```bash
npm test -- --run
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

## 结构

```text
apps/web/                 React + Vite 页面、组件与本地持久化
packages/game-core/       不依赖 DOM、网络或存储的纯游戏规则
docs/superpowers/specs/   已确认的总体设计
docs/superpowers/plans/   第一阶段实施计划
```

## 当前范围

- 1–100 猜数字，最多 9 次
- 输入校验、重复猜测检查、范围收窄和胜负反馈
- 五套主题和响应式布局
- 本地游客积分及最多 200 条战绩
- 键盘操作、焦点管理和减少动画支持

第一阶段不包含密码、账号、Token、好友、匹配、网络积分或在线 PK。

## 后续联机边界

未来的联机服务将由 Fastify、Socket.IO 和 PostgreSQL 提供。秘密数字、猜测次数、胜负和积分必须只由服务端判定；客户端只提交单次猜测，不接收秘密数字，也不能提交积分增量或“我赢了”等结果声明。

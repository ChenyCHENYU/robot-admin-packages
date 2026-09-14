# Monorepo 维护指南

本文档约束 `robot-admin-packages` 根仓库的开发、验证和发布流程。各子包的公开 API、安装方式和迁移说明仍以对应包的 README 与 CHANGELOG 为准。

## 维护原则

1. 根项目只是私有容器，固定为 `private: true`、`version: 0.0.0`，不参与 npm 发布。
2. 子包独立版本和独立发布；不因无关包变化联动升级。
3. 框架无关核心、Vue 能力和具体 UI 框架适配使用分层入口，避免将可选依赖带入所有消费者。
4. 新能力优先向后兼容；删除或重命名公开 API 必须经过废弃周期并在 CHANGELOG 中说明。
5. 本地源码联调和真实 npm 产物验证缺一不可，两者不能相互替代。

## 新增或调整子包

新增包至少应具备：

- `package.json`、`README.md`、`CHANGELOG.md` 和 `LICENSE`；
- `build`、`test`、`type-check` 和 `prepublishOnly` 脚本；
- 明确的 `exports`、`files`、`sideEffects`、`engines` 和 `publishConfig`；
- 指向当前 Monorepo 子目录的 `repository.directory`；
- 对公开入口、类型声明、SSR/浏览器边界和关键回归的测试；
- 根 README 包清单中的入口、版本和一句话定位。

根命令通过 `scripts/run-workspaces.mjs` 自动发现子包脚本，因此新增包无需修改根构建或类型检查命令。缺少的脚本会被跳过，`check:workspace` 要求的基础脚本除外。

## 质量门禁

日常提交前执行：

```bash
bun run verify
```

执行顺序为：

1. 工作区契约和凭证污染检查；
2. 所有子包类型检查；
3. Monorepo 测试；
4. 所有子包生产构建；
5. 已提供 `check:package` 的子包通过 `npm pack` 执行 exports、声明文件和真实发布产物校验。

CI 与本地共用该命令，避免出现本地流程和远端门禁两个事实源。失败时应修复首个根因后重新完整执行，不通过跳过脚本或放宽规则掩盖问题。

工作区契约同时要求 `bun.lock` 中记录的每个工作区版本与对应 `package.json` 一致。子包升级后必须运行一次 `bun install` 并提交锁文件，避免消费、缓存或 CI 仍识别旧版本。

## 本地联调

Robot_Admin 使用两条隔离路径：

- `bun run dev:local`：直接映射相邻 Monorepo 源码，用于快速 HMR 联调；
- `bun run dev`：使用已安装的 npm 版本，用于验证真实消费者行为。

本地联调不得使用全局 `bun link` 或手工覆盖 `node_modules`。这些方式容易污染锁文件、让 Vite 预构建缓存与真实发布物不一致。需要切换包源码时使用 Robot_Admin 已提供的本地包开关；完成发布后重新安装精确版本并验证：

```bash
bun run type-build:installed
bun run test
bun run build
```

## 发布流程

### 1. 准备版本内容

- 完成功能、测试和包内 README；
- 更新对应 CHANGELOG；
- 为用户可见变化创建 Changeset；
- 确认根 README 中的包版本将在版本提交后保持同步。

### 2. 生成并审查版本提交

```bash
bun run changeset
bun run version-packages
bun run release:check
```

审查包版本、内部依赖、README、CHANGELOG、锁文件及 `npm pack` 产物。禁止发布仍包含 `workspace:` 协议的依赖清单。

### 3. 提交与发布

先提交并推送版本变更，确认远端主分支和 CI 通过，再从同一提交发布。认证信息仅通过 CI Secret 或进程级临时配置传入，不保存到仓库或长期 `.npmrc`。

```bash
bun run release
git push origin --tags
```

### 4. 发布后闭环

- 从 npm registry 查询每个目标包的版本和依赖；
- 在干净目录安装公开包，确认没有 `workspace:` 或缺失入口；
- Robot_Admin 改为精确版本，更新锁文件、README、关于页等版本展示；
- 运行已安装依赖类型检查、测试和生产构建；
- 提交并推送消费侧变更。

## 部分发布失败处理

发布过程中断时，不要直接重复整组发布：

1. 逐包查询 registry，记录已成功和未成功的版本；
2. 检查已发布包的 manifest、依赖和 exports；
3. 对不可安装的版本立即发布修复版本，并将问题版本标记为 deprecated；
4. 只发布仍缺失或需要修复的包；
5. 消费侧只升级到已验证的最终版本。

任何凭证都不得写入事故报告、提交信息、日志样例或文档。

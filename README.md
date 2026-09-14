# robot-admin-packages

[![Quality Gate](https://github.com/ChenyCHENYU/robot-admin-packages/actions/workflows/ci.yml/badge.svg)](https://github.com/ChenyCHENYU/robot-admin-packages/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Robot Admin 的公共能力 Monorepo。仓库负责统一开发、验证和发布可复用包；根项目保持 `private: true` 和 `0.0.0`，永远不发布到 npm。

## 包清单

| 包 | 当前版本 | 定位 |
| --- | ---: | --- |
| [@robot-admin/directives](./packages/directives) | `2.0.1` | Vue 3 指令、应用级适配器及严格生命周期清理 |
| [@robot-admin/file-utils](./packages/file-utils) | `3.0.1` | Excel、ZIP、CSV、图片、下载与分片文件能力 |
| [@robot-admin/form-validate](./packages/form-validate) | `3.4.2` | 框架无关规则核心与 Naive UI、Element Plus 适配 |
| [@robot-admin/git-standards](./packages/git-standards) | `1.0.5` | 幂等 Git 工程化初始化、诊断和团队预设 |
| [@robot-admin/layout](./packages/layout) | `3.2.1` | 布局核心、Vue 桥接与 Naive UI 呈现层 |
| [@robot-admin/request-core](./packages/request-core) | `0.6.1` | 请求编排、认证恢复、生命周期和 Headless CRUD |
| [@robot-admin/theme](./packages/theme) | `0.6.1` | 分层设计 Token、主题状态和 UI 框架适配 |

各包 README 是公开 API、安装与迁移说明的事实源；根 README 只维护仓库级入口和当前版本，npm 线上状态以各包页面为准。

## 架构边界

```text
robot-admin-packages/
├── .changeset/          # 待发布的用户可见变更
├── .github/workflows/   # 与本地 verify 一致的质量门禁
├── docs/                # 仓库维护与发布规范
├── packages/            # 七个独立发布、独立版本的公共包
├── scripts/             # 跨平台工作区执行与契约检查
├── package.json         # 私有容器和统一命令
└── bun.lock             # 唯一依赖锁文件
```

- 子包独立版本、独立入口、独立 README 和 CHANGELOG，不通过根包聚合导出。
- 框架无关核心与 Vue/Naive UI 等适配层保持分层，使用侧只引入所需入口。
- 根脚本自动发现拥有相应命令的工作区；新增包不再需要同步维护一长串构建命令。
- `check:workspace` 防止版本文档漂移、发布元数据缺失、`workspace:` 依赖泄漏和 npm 凭证入库。

## 快速开始

```bash
git clone https://github.com/ChenyCHENYU/robot-admin-packages.git
cd robot-admin-packages
bun install --frozen-lockfile
bun run verify
```

当前统一使用 Bun `1.4.2`。常用根命令：

| 命令 | 作用 |
| --- | --- |
| `bun run check:workspace` | 校验仓库、包清单、版本、发布元数据和安全边界 |
| `bun run type-check` | 顺序执行所有声明了类型检查的工作区 |
| `bun run test` | 运行整个 Monorepo 的测试 |
| `bun run build` | 顺序构建所有声明了构建脚本的工作区 |
| `bun run check:packages` | 检查支持发布产物校验的工作区 |
| `bun run verify` | 执行提交和发布前的完整质量门禁 |
| `bun run clean` | 清理所有声明了清理脚本的工作区产物 |

开发单个包时直接进入对应目录，反馈更聚焦：

```bash
cd packages/request-core
bun run dev
```

## 与 Robot_Admin 联调

两个仓库默认保持同级目录：

```text
robot/
├── Robot_Admin/
└── robot-admin-packages/
```

在 `Robot_Admin` 中执行：

```bash
bun run dev:local
```

该模式通过 Vite 将 `@robot-admin/*` 映射到当前仓库源码，支持 HMR，不创建全局 link，也不改写业务项目依赖和锁文件。发布后必须切回普通模式并安装精确 npm 版本，再执行 `bun run type-build:installed`、测试和生产构建，防止本地源码正常但发布产物不可用。

## 版本与发布

只有子包公开能力发生用户可见变化时才创建 Changeset；纯根仓库脚本、CI 或文档治理不需要发版。

```bash
bun run changeset
bun run version-packages
bun run release:check
bun run release
```

`release` 会先执行完整质量门禁和 Changesets 状态检查。发布凭证只能通过 CI Secret 或当前进程的临时配置注入，不得写入仓库、脚本、命令示例或长期用户配置。

完整的新增包清单、本地联调、发布核验和部分失败恢复流程见 [维护指南](./docs/maintenance.md)。

## License

[MIT](./LICENSE) © ChenYu

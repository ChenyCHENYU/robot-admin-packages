# robot-admin-packages

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

> Robot Admin 项目可复用、可插拔的企业级公共包，由 Monorepo 统一管理
>
> **本仓库是容器项目**（`private: true`），不会发布到 npm，只发布内部的各个包。

---

## 📦 包列表

| 包名                                                   | 本仓库版本 | npm 最新版                                                     | 描述                                                       |
| ------------------------------------------------------ | ---------- | -------------------------------------------------------------- | ---------------------------------------------------------- |
| [@robot-admin/layout](./packages/layout)               | `2.3.2`    | [![npm](https://img.shields.io/npm/v/@robot-admin/layout)](https://www.npmjs.com/package/@robot-admin/layout) | 6 种布局、设置 Store、智能容器与无障碍交互                 |
| [@robot-admin/theme](./packages/theme)                 | `0.4.0`    | [![npm](https://img.shields.io/npm/v/@robot-admin/theme)](https://www.npmjs.com/package/@robot-admin/theme) | 亮色/暗色/跟随系统、设计风格与安全持久化                   |
| [@robot-admin/directives](./packages/directives)       | `1.1.1`    | [![npm](https://img.shields.io/npm/v/@robot-admin/directives)](https://www.npmjs.com/package/@robot-admin/directives) | 11 个 Vue 3 指令，零运行时依赖                              |
| [@robot-admin/file-utils](./packages/file-utils)       | `2.0.0`    | [![npm](https://img.shields.io/npm/v/@robot-admin/file-utils)](https://www.npmjs.com/package/@robot-admin/file-utils) | Excel、ZIP、RFC 4180 CSV、图片及可取消的大文件分片          |
| [@robot-admin/request-core](./packages/request-core)   | `0.2.0`    | [![npm](https://img.shields.io/npm/v/@robot-admin/request-core)](https://www.npmjs.com/package/@robot-admin/request-core) | Axios 请求编排、6 类插件能力与 CRUD Composables             |
| [@robot-admin/form-validate](./packages/form-validate) | `3.4.1`    | [![npm](https://img.shields.io/npm/v/@robot-admin/form-validate)](https://www.npmjs.com/package/@robot-admin/form-validate) | 面向 Naive UI 的类型安全表单验证规则库                      |
| [@robot-admin/git-standards](./packages/git-standards) | `1.0.4`    | [![npm](https://img.shields.io/npm/v/@robot-admin/git-standards)](https://www.npmjs.com/package/@robot-admin/git-standards) | 幂等初始化、配置备份与 4 种 Git 工程化预设                  |

> “本仓库版本”随版本提交更新；“npm 最新版”徽章反映注册表状态，发布传播期间可能短暂滞后。

---

## 🏗️ 项目架构

```
robot-admin-packages/           # 容器项目，不发布
├── .changeset/                 # Changesets 配置与待发布变更
├── packages/
│   ├── directives/             # 11 个 Vue 3 自定义指令
│   ├── file-utils/             # Excel/ZIP/CSV/图片/文件分片
│   ├── form-validate/          # 表单与表格验证规则
│   ├── git-standards/          # Git 工程化 CLI 与配置生成器
│   ├── layout/                 # 布局组件、设置 Store 与样式
│   ├── request-core/           # Axios 请求编排与 CRUD Composables
│   └── theme/                  # 主题 Store、过渡与设计风格 CSS
├── package.json                # 根脚本（private: true）
└── bun.lock                    # 统一依赖锁文件
```

---

## 🚀 完整工作流程

### 1️⃣ 初始化（首次使用）

```bash
git clone https://github.com/ChenyCHENYU/robot-admin-packages.git
cd robot-admin-packages
bun install
```

### 2️⃣ 日常开发

#### 监听模式

```bash
cd packages/layout
bun run dev
```

#### 手动构建

```bash
cd packages/layout
bun run build
```

### 3️⃣ 发布新版本

#### 步骤 1: 创建变更集

**方式 A - 交互式创建**：

```bash
bun run changeset
# 按空格选择包 → 选择版本类型 → 输入变更描述
```

也可以按 `.changeset/*.md` 的格式手动创建变更集；文件名需唯一，摘要应准确描述对应包的用户可见变化。

#### 步骤 2: 更新版本和 CHANGELOG

```bash
bun run version-packages
```

#### 步骤 3: 发布前质量门禁

```bash
bun run test
bun run type-check
bun run build
```

#### 步骤 4: 提交并推送版本变更

```bash
git add .
git commit -m "chore(release): publish package updates"
git push origin main
```

#### 步骤 5: 发布到 npm 并推送标签

```bash
bun run release
git push origin --tags
```

> 发布前必须确认 npm 登录身份与目标 registry。若发布中断，应先逐包查询 npm
> 线上版本，确认哪些包已经成功，避免在未知状态下重复发布。

---

## 📚 扩展维护

### ➕ 添加新包

```bash
cd packages
mkdir new-package && cd new-package
mkdir src

# 复制配置
cp ../request-core/tsconfig.json .
cp ../request-core/tsup.config.ts .

# 创建 package.json
cat > package.json << 'EOF'
{
  "name": "@robot-admin/new-package",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": { "dev": "tsup --watch", "build": "tsup" },
  "peerDependencies": { "vue": "^3.4.0" }
}
EOF

# 创建入口
echo 'export const hello = () => "Hello!"' > src/index.ts

# 安装 + 构建
bun install && bun run build
```

### 🔄 版本策略

遵循 [语义化版本](https://semver.org/lang/zh-CN/)：

| 类型      | 示例    | 场景                 |
| --------- | ------- | -------------------- |
| **patch** | `0.1.x` | Bug 修复，不影响 API |
| **minor** | `0.x.0` | 新增功能，向下兼容   |
| **major** | `x.0.0` | 破坏性更新           |

---

## 🔗 本地调试

### 在 Robot_Admin 中调试源码

```bash
cd ../Robot_Admin
bun run dev:local
```

Robot_Admin 的 `dev:local` 会设置 `USE_LOCAL_PACKAGES=true`，由 Vite 将全部
`@robot-admin/*` 包直接别名到相邻 `robot-admin-packages/packages` 源码，无需创建
全局 `bun link`，也不会改写主项目依赖锁文件。两仓库默认应保持同级目录：

```text
robot/
├── Robot_Admin/
└── robot-admin-packages/
```

### 使用场景

| 场景               | 在 Robot_Admin 中执行           | 说明                              |
| ------------------ | ------------------------------- | --------------------------------- |
| 本地开发调试包源码 | `bun run dev:local`             | 使用相邻 Monorepo 源码与 HMR      |
| 本地生产构建验证   | PowerShell: `$env:USE_LOCAL_PACKAGES='true'; bun run build` | 验证包源码与主项目生产构建集成 |
| 日常开发（npm 包） | `bun run dev`                   | 使用已安装的 npm 稳定版           |
| CI/CD 自动构建     | `bun install && bun run build`  | 从 npm 安装，无需本地链接          |

---

## 📄 License

MIT © ChenYu

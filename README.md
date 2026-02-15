# robot-admin-packages

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

> Robot Admin 项目可复用插拔式公共依赖包 - Monorepo 统一管理
>
> **本仓库是容器项目**（`private: true`），不会发布到 npm，只发布内部的各个包。

---

## 📦 包列表

| 包名                                                   | 版本                                                            | 描述                                                 | npm 链接                                                        |
| ------------------------------------------------------ | --------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------- |
| [@robot-admin/layout](./packages/layout)               | ![npm](https://img.shields.io/npm/v/@robot-admin/layout)        | 布局和设置管理系统（6 种布局 + 智能容器 + 主题预设） | [npm](https://www.npmjs.com/package/@robot-admin/layout)        |
| [@robot-admin/theme](./packages/theme)                 | ![npm](https://img.shields.io/npm/v/@robot-admin/theme)         | 主题切换管理系统（亮色/暗色/跟随系统）               | [npm](https://www.npmjs.com/package/@robot-admin/theme)         |
| [@robot-admin/directives](./packages/directives)       | ![npm](https://img.shields.io/npm/v/@robot-admin/directives)    | Vue3 自定义指令集合（7 个常用指令 + 零依赖）         | [npm](https://www.npmjs.com/package/@robot-admin/directives)    |
| [@robot-admin/file-utils](./packages/file-utils)       | ![npm](https://img.shields.io/npm/v/@robot-admin/file-utils)    | 文件处理工具集（Excel/下载/压缩/CSV/图片/分片）      | [npm](https://www.npmjs.com/package/@robot-admin/file-utils)    |
| [@robot-admin/request-core](./packages/request-core)   | ![npm](https://img.shields.io/npm/v/@robot-admin/request-core)  | Axios 封装 + 7 插件 + CRUD Composables               | [npm](https://www.npmjs.com/package/@robot-admin/request-core)  |
| [@robot-admin/form-validate](./packages/form-validate) | ![npm](https://img.shields.io/npm/v/@robot-admin/form-validate) | 企业级表单验证规则库（专为 Naive UI 设计）           | [npm](https://www.npmjs.com/package/@robot-admin/form-validate) |
| [@robot-admin/git-standards](./packages/git-standards) | ![npm](https://img.shields.io/npm/v/@robot-admin/git-standards) | 零配置 Git 工程化标准工具包（CLI + 4 预设模式）      | [npm](https://www.npmjs.com/package/@robot-admin/git-standards) |

---

## 🏗️ 项目架构

```
robot-admin-packages/                  # 【容器项目，不发布】
├── package.json                       # 根配置（private: true）
├── .changeset/                        # Changesets 版本管理配置
│   └── config.json
├── packages/                          # 【所有可发布的包】
│   ├── layout/                        # ✅ 布局和设置管理系统
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── C_LayoutContainer/ #   智能布局容器（主入口）
│   │   │   │   ├── layouts/           #   📐 6 种布局骨架
│   │   │   │   │   ├── SideLayout/
│   │   │   │   │   ├── TopLayout/
│   │   │   │   │   ├── MixLayout/
│   │   │   │   │   ├── MixTopLayout/
│   │   │   │   │   ├── ReverseHorizontalMixLayout/
│   │   │   │   │   └── CardLayout/
│   │   │   │   ├── SettingsDrawer/    #   设置抽屉
│   │   │   │   └── ... (辅助组件)
│   │   │   ├── composables/           #   组合式函数
│   │   │   ├── stores/                #   Pinia Store
│   │   │   ├── styles/                #   公共样式
│   │   │   └── types/                 #   类型定义
│   │   ├── dist/                      #   构建产物
│   │   ├── package.json
│   │   ├── vite.config.ts             #   Vite Library 构建配置
│   │   └── README.md
│   │
│   ├── theme/                         # ✅ 主题切换管理系统
│   │   ├── src/
│   │   ├── dist/
│   │   ├── package.json
│   │   ├── tsup.config.ts
│   │   └── README.md
│   │
│   ├── request-core/                  # ✅ HTTP 请求核心
│   │   ├── src/
│   │   ├── dist/
│   │   ├── package.json
│   │   ├── tsup.config.ts
│   │   └── README.md
│   │
│   └── form-validate/                 # ✅ 表单验证规则库
│   │   ├── src/
│   │   ├── dist/
│   │   ├── package.json
│   │   ├── tsup.config.ts
│   │   └── README.md
│   │
│   ├── file-utils/                    # ✅ 文件处理工具集
│   │   ├── src/
│   │   │   ├── excel/                 #   Excel 读写（基于 xlsx）
│   │   │   ├── download/             #   通用文件下载（20+ 格式）
│   │   │   ├── zip/                   #   文件压缩（基于 jszip）
│   │   │   ├── csv/                   #   CSV 解析/生成
│   │   │   ├── file/                  #   Base64/JSON/XML 处理
│   │   │   ├── image/                 #   图片压缩/裁剪/格式转换
│   │   │   ├── chunk/                 #   大文件分片上传/下载
│   │   │   ├── config.ts              #   全局配置（解耦 UI 框架）
│   │   │   └── types.ts               #   公共类型
│   │   ├── dist/
│   │   ├── package.json
│   │   ├── tsup.config.ts
│   │   └── README.md
│   │
│   └── git-standards/                 # ✅ Git 工程化标准工具包
│       ├── src/
│       │   ├── cli/                   #   CLI 命令（init / doctor）
│       │   ├── configs/               #   lint-staged 配置生成
│       │   └── utils/                 #   工具函数
│       ├── bin/                       #   CLI 入口
│       ├── dist/
│       ├── package.json
│       ├── tsup.config.ts
│       └── README.md
│
└── scripts/                           # 辅助脚本
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

#### 监听模式（推荐）

```bash
cd packages/layout
bun run dev    # 自动重新构建，主项目通过 bun link 立即生效
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

**方式 B - 手动创建文件（推荐）**：

```bash
cat > .changeset/update-layout.md << 'EOF'
---
"@robot-admin/layout": minor
---

重构目录结构，布局组件迁入 layouts/ 目录
EOF
```

#### 步骤 2: 更新版本和 CHANGELOG

```bash
bunx @changesets/cli version
```

#### 步骤 3: 发布到 npm

```bash
bun run release
```

#### 步骤 4: 推送到 Git

```bash
git add .
git commit -m "chore: release @robot-admin/layout@x.x.x"
git push origin main && git push gitee main
git push origin --tags && git push gitee --tags
```

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

### 链接到主项目

```bash
# 在包目录创建全局链接
cd packages/layout
bun link

# 在主项目中链接
cd /d/project/robot/Robot_Admin
bun link @robot-admin/layout
```

### 主项目推荐配置

```json
{
  "scripts": {
    "dev": "vite",
    "dev:local": "bun run link:packages && bun run dev",
    "link:packages": "bun link @robot-admin/layout @robot-admin/theme @robot-admin/request-core @robot-admin/form-validate || echo '⚠️ Monorepo not found'",
    "unlink:packages": "bun unlink @robot-admin/layout @robot-admin/theme @robot-admin/request-core @robot-admin/form-validate && bun install --force"
  }
}
```

### 使用场景

| 场景               | 命令                           | 说明                       |
| ------------------ | ------------------------------ | -------------------------- |
| 本地开发调试包源码 | `bun run dev:local`            | 修改包源码立即生效 + HMR   |
| 日常开发（npm 包） | `bun run dev`                  | 使用已安装的稳定版         |
| 切换回 npm 包      | `bun run unlink:packages`      | 解除链接，从 npm 重新下载  |
| CI/CD 自动构建     | `bun install && bun run build` | 自动从 npm 下载，无需 link |

---

## 📄 License

MIT © ChenYu

# robot-admin-packages

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

> Robot Admin 项目可复用插拔式公共依赖包 - Monorepo 统一管理
> 
> **本仓库是容器项目**（`private: true`），不会发布到 npm，只发布内部的各个包。

---

## 📦 包列表

| 包名 | 版本 | 描述 | npm 链接 |
|------|------|------|----------|
| [@robot-admin/request-core](./packages/request-core) | ![npm](https://img.shields.io/npm/v/@robot-admin/request-core) | Axios 封装 + CRUD Composables | [npm](https://www.npmjs.com/package/@robot-admin/request-core) |

> 未来所有 `@robot-admin/*` 包都在 `packages/` 目录下统一管理

---

## 🏗️ 项目架构

```
robot-admin-packages/              # 【容器项目，不发布】
├── package.json                   # 根配置（private: true）
├── .changeset/                    # Changesets 版本管理配置
│   └── config.json               
├── packages/                      # 【所有可发布的包】
│   ├── request-core/             # ✅ 已发布 v0.1.2
│   │   ├── src/                  # 源代码
│   │   ├── dist/                 # 构建产物（不提交到 Git）
│   │   ├── package.json          # 包配置
│   │   ├── tsconfig.json         # TypeScript 配置
│   │   ├── tsup.config.ts        # 构建配置
│   │   └── README.md             # 包文档
│   │
│   └── [未来的包]/               # 如：ui-components, utils 等
│       ├── src/
│       ├── package.json
│       └── ...
│
└── scripts/                       # 辅助脚本
```

---

## 🚀 完整工作流程

### 1️⃣ 初始化（首次使用）

```bash
# 克隆仓库
git clone https://github.com/ChenyCHENYU/robot-admin-packages.git
cd robot-admin-packages

# 安装依赖
bun install
```

### 2️⃣ 日常开发流程

#### 方式 A：监听模式（推荐）

```bash
# 在包目录下开启监听模式
cd packages/request-core
bun run dev

# 修改代码后自动重新构建
# 在主项目中立即生效（因为使用了 bun link）
```

#### 方式 B：手动构建

```bash
# 修改代码后手动构建
cd packages/request-core
bun run build
```

### 3️⃣ 发布新版本

#### 步骤 1: 创建变更集（有两种方式）

**方式 A - 交互式创建（适合新手）**：
```bash
cd /d/project/robot/robot-admin-packages
bun run changeset
```
根据提示：
- 按空格选择要发布的包
- 选择版本类型：`patch`（修复）/`minor`（新功能）/`major`（破坏性更新）
- 输入变更描述

**方式 B - 手动创建文件（推荐，更快）**：
```bash
# 在 .changeset/ 目录创建 xxx.md 文件
cat > .changeset/fix-bug.md << 'EOF'
---
"@robot-admin/request-core": patch
---

修复了 XXX 问题
EOF
```

#### 步骤 2: 更新版本和 CHANGELOG

```bash
bunx @changesets/cli version
```

这会：
- ✅ 更新包的 `package.json` 版本号
- ✅ 自动生成/更新 `CHANGELOG.md`
- ✅ 删除已应用的变更集文件

#### 步骤 3: 发布到 npm

```bash
bun run release
```

这会：
- ✅ 构建所有包（`bun run build`）
- ✅ 发布到 npm（`changeset publish`）
- ✅ 自动创建 Git 标签（如 `@robot-admin/request-core@0.1.3`）

#### 步骤 4: 推送到 Git

```bash
# 提交版本更新
git add .
git commit -m "chore: release @robot-admin/request-core@x.x.x"

# 推送到 GitHub
git push origin main
git push origin --tags

# 推送到 Gitee
git push gitee main
git push gitee --tags
```

### 4️⃣ 完整发布示例（一键复制）

```bash
# 1. 创建变更集（方式 B - 快速）
cat > .changeset/update-feature.md << 'EOF'
---
"@robot-admin/request-core": minor
---

新增 XXX 功能
EOF

# 2. 更新版本
bunx @changesets/cli version

# 3. 发布
bun run release

# 4. 推送
git add . && git commit -m "chore: release" && git push origin main && git push gitee main && git push origin --tags && git push gitee --tags
```

---

## 📚 扩展维护

### ➕ 添加新包

#### 1. 创建包目录结构

```bash
cd packages
mkdir new-package && cd new-package
mkdir src
```

#### 2. 创建 `package.json`

```json
{
  "name": "@robot-admin/new-package",
  "version": "0.1.0",
  "description": "包描述",
  "type": "module",
  "keywords": ["vue", "robot-admin"],
  "author": "ChenYu <ycyplus@gmail.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/ChenyCHENYU/robot-admin-packages",
    "directory": "packages/new-package"
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist", "README.md"],
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },
  "scripts": {
    "dev": "tsup --watch",
    "build": "tsup",
    "clean": "rm -rf dist",
    "type-check": "tsc --noEmit"
  },
  "peerDependencies": {
    "vue": "^3.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "typescript": "^5.8.0",
    "tsup": "^8.1.0",
    "vue": "^3.4.0"
  }
}
```

#### 3. 复制配置文件

```bash
# 复制 TypeScript 和构建配置
cp ../request-core/tsconfig.json .
cp ../request-core/tsup.config.ts .
```

#### 4. 创建入口文件

```bash
# src/index.ts
echo "export const hello = () => 'Hello from new-package!'" > src/index.ts
```

#### 5. 构建并测试

```bash
bun install  # 安装依赖
bun run build  # 构建
```

#### 6. 在主项目中使用

```bash
# 在新包目录创建全局链接
cd packages/new-package
bun link

# 在主项目中链接
cd /d/project/robot/Robot_Admin
bun link @robot-admin/new-package

# 在 package.json 中添加（版本号用实际发布后的版本）
{
  "dependencies": {
    "@robot-admin/new-package": "^0.1.0"
  }
}
```

### 🔄 版本策略

遵循 [语义化版本](https://semver.org/lang/zh-CN/)：

- **Patch（0.1.x）**: 修复 Bug，不影响 API
  ```bash
  ---
  "@robot-admin/request-core": patch
  ---
  ```

- **Minor（0.x.0）**: 新增功能，向下兼容
  ```bash
  ---
  "@robot-admin/request-core": minor
  ---
  ```

- **Major（x.0.0）**: 破坏性更新，不向下兼容
  ```bash
  ---
  "@robot-admin/request-core": major
  ---
  ```

### 📝 发布策略

#### 独立发布（默认，推荐）

每个包独立版本，互不影响：

```bash
# request-core 发布 v0.2.0
# ui-components 发布 v1.0.5
# 各自独立
```

#### 集中发布

所有包统一版本号，修改 `.changeset/config.json`：

```json
{
  "linked": [
    ["@robot-admin/*"]
  ]
}
```

---

## 🔗 本地开发关联

### 主项目配置

在 `Robot_Admin/package.json` 中：

```json
{
  "dependencies": {
    "@robot-admin/request-core": "^0.1.0"
  }
}
```

### 本地开发链接

```bash
# 1. 在包目录创建全局链接
cd /d/project/robot/robot-admin-packages/packages/request-core
bun link

# 2. 在主项目中链接
cd /d/project/robot/Robot_Admin
bun link @robot-admin/request-core

# 3. 验证链接
ls -la node_modules/@robot-admin/
# 应该看到符号链接指向 monorepo
```

**优势**：
- ✅ 本地修改实时生效
- ✅ `package.json` 保持正确的版本号
- ✅ 团队其他人直接 `bun install` 从 npm 安装
- ✅ 无需每次都发布测试

---

## 🛠️ 常用命令速查

```bash
# === 开发 ===
bun run dev                                    # 所有包并行开发
bun run --filter @robot-admin/request-core dev # 开发特定包

# === 构建 ===
bun run build                                  # 构建所有包
bun run --filter @robot-admin/request-core build

# === 清理 ===
bun run clean                                  # 清理所有包的 dist

# === 类型检查 ===
bun run type-check                             # 检查所有包

# === 版本管理 ===
bun run changeset                              # 创建变更集
bunx @changesets/cli version                   # 更新版本
bun run release                                # 发布

# === Git ===
git push origin main && git push gitee main    # 推送代码
git push origin --tags && git push gitee --tags # 推送标签
```

---

## 🔧 技术栈

| 工具 | 版本 | 用途 |
|------|------|------|
| **Bun** | 1.3.8 | 包管理器 + 运行时 |
| **Changesets** | ^2.27.1 | 版本管理 + 自动化发布 |
| **tsup** | ^8.1.0 | 构建工具（基于 esbuild） |
| **TypeScript** | ^5.8.0 | 类型系统 |

---

## ⚠️ 注意事项

1. **本仓库不会发布到 npm**
   - 根目录 `package.json` 设置了 `"private": true"`
   - 只发布 `packages/` 下的各个包

2. **构建产物不提交到 Git**
   - `dist/` 目录已在 `.gitignore` 中
   - 每次发布前自动构建

3. **npm Token 安全**
   - Token 保存在本地 `~/.npmrc`
   - **不要**提交到 Git
   - 定期更新 Token（90 天过期）

4. **双因素认证**
   - 使用 Granular Token 的 "绕过 2FA" 选项
   - 无需物理安全密钥或手机 App

---

## 📖 相关文档

- [Changesets 文档](https://github.com/changesets/changesets)
- [Bun Workspace 文档](https://bun.sh/docs/install/workspaces)
- [tsup 文档](https://tsup.egoist.dev/)
- [语义化版本](https://semver.org/lang/zh-CN/)

---

## 📄 License

MIT © [ChenYu](https://github.com/ChenyCHENYU)

**仓库链接**:
- GitHub: https://github.com/ChenyCHENYU/robot-admin-packages
- Gitee: https://gitee.com/ycyplus163/robot-admin-packages

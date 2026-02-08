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

## 🔗 使用包（消费者指南）

### 📥 安装包

```bash
# 在你的项目中安装
bun add @robot-admin/request-core

# 或使用 npm/pnpm
npm install @robot-admin/request-core
pnpm add @robot-admin/request-core
```

### 🎯 本地调试模式

#### 自动识别机制

```bash
# Node.js 模块解析机制（Bun/npm/yarn 通用）
node_modules/@robot-admin/request-core/
├── symlink → 本地 monorepo  # 开发环境
└── 真实目录 → npm 包         # 生产环境
```

**核心优势**：
- ✅ 包管理器**自动识别 symlink**，无需额外配置
- ✅ CI/CD 环境**自动从 npm 安装**，确保可复现构建
- ✅ `package.json` **保持正常版本号**，团队协作无障碍

#### 推荐项目配置

在你的项目 `package.json` 中添加这些脚本：

```json
{
  "scripts": {
    "dev": "vite",
    "dev:local": "bun run link:packages && bun run dev",
    "link:packages": "test -d ../robot-admin-packages/packages/request-core && bun link @robot-admin/request-core || echo '⚠️  Monorepo not found, using npm package'",
    "unlink:packages": "bun unlink @robot-admin/request-core && bun install --force"
  },
  "dependencies": {
    "@robot-admin/request-core": "^0.1.0"
  }
}
```

#### 使用场景

<details>
<summary><b>场景1：本地开发 + 调试包源码</b></summary>

如果你的项目和 `robot-admin-packages` 在同一台机器：

```bash
# 方法1：自动化脚本（推荐）
bun run dev:local

# 方法2：手动链接
bun run link:packages
bun run dev

# 效果：
# ✅ 修改包源码立即生效
# ✅ 无需重新发布到 npm
# ✅ 支持 Hot Module Reload

# 验证链接状态
ls -la node_modules/@robot-admin/request-core
# 输出：lrwxrwxrwx → /path/to/robot-admin-packages/packages/request-core/
```

</details>

<details>
<summary><b>场景2：普通开发（使用 npm 包）</b></summary>

```bash
# 正常启动（不链接本地包）
bun run dev

# 效果：
# ✅ 使用 node_modules 中已安装的 npm 稳定版
# ✅ 适合不需要调试包源码的日常开发
```

</details>

<details>
<summary><b>场景3：切换回 npm 包</b></summary>

```bash
# 解除链接 + 重新安装
bun run unlink:packages

# 效果：
# ✅ 删除 symlink
# ✅ 从 npm registry 重新下载稳定版
```

</details>

<details>
<summary><b>场景4：CI/CD 自动化构建</b></summary>

```yaml
# .github/workflows/build.yml
steps:
  - name: Install dependencies
    run: bun install  # 自动从 npm 下载

  - name: Build
    run: bun run build
```

**关键点**：
- 🚫 CI 环境**没有 monorepo**，link 命令会优雅失败
- ✅ `bun install` 自动从 npm 下载稳定版
- ✅ 构建使用 npm 包，确保可复现

</details>

### ✅ 最佳实践

#### 1. package.json 保持正常版本号

```json
// ✅ 正确
"@robot-admin/request-core": "^0.1.0"

// ❌ 错误 - 不要使用相对路径
"@robot-admin/request-core": "link:../robot-admin-packages/packages/request-core"
```

#### 2. 本地调试时才链接

```bash
# 需要修改包源码时
bun run dev:local

# 日常开发时
bun run dev
```

#### 3. 提交前验证 npm 包版本

```bash
# 1. 解除链接
bun run unlink:packages

# 2. 验证构建
bun run build
bun run type-check

# 3. 确认无误后提交
git add . && git commit -m "feat: xxx"
```

#### 4. 发布新版本后更新

```bash
# 在 monorepo 中发布新版本
cd robot-admin-packages
bun run release  # 发布 @robot-admin/request-core@0.1.4

# 在你的项目中更新
cd your-project
bun run unlink:packages
bun update @robot-admin/request-core
```

### 🔍 调试技巧

```bash
# 检查当前使用的包类型
ls -la node_modules/@robot-admin/request-core

# 查看实际版本
cat node_modules/@robot-admin/request-core/package.json | grep version

# 热更新验证（链接模式）
cd robot-admin-packages/packages/request-core
bun run dev  # 监听模式，修改代码自动构建
```

### 📊 对比总结

| 使用方式 | 命令 | 适用场景 | 包来源 | 优势 |
|---------|------|---------|--------|------|
| **本地链接** | `bun run dev:local` | 调试包源码 | Monorepo | 修改立即生效 |
| **npm 包** | `bun run dev` | 日常开发 | npm registry | 版本稳定 |
| **CI/CD** | `bun install` | 自动化构建 | npm registry | 可复现构建 |

---

## 🔗 包开发关联（维护者）

## 🔗 包开发关联（维护者）

> 以下内容针对 monorepo 维护者，如果你只是使用包，请看上面的"使用包（消费者指南）"

### Monorepo 与主项目关联

在开发包的同时测试主项目：

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

**开发流程**：
1. 在包目录启动监听模式：`bun run dev`
2. 在主项目启动开发服务器：`bun run dev`
3. 修改包源码 → 自动构建 → 主项目 HMR 更新
4. 测试通过后发布新版本

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

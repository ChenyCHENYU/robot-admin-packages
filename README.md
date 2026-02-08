# robot-admin-packages

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

> Robot Admin 项目可复用插拔式公共依赖包 - Monorepo 统一管理

## 📦 包列表

| 包名 | 版本 | 描述 |
|------|------|------|
| [@robot-admin/request-core](./packages/request-core) | ![npm](https://img.shields.io/npm/v/@robot-admin/request-core) | Axios 封装 + CRUD Composables |

## 🚀 快速开始

### 安装依赖

```bash
bun install
```

### 开发模式

```bash
# 所有包并行开发
bun run dev

# 开发特定包
bun run --filter @robot-admin/request-core dev
```

### 构建

```bash
# 构建所有包
bun run build

# 构建特定包
bun run --filter @robot-admin/request-core build
```

## 📝 发布流程

### 1. 添加变更集

```bash
bun run changeset
```

根据提示选择要发布的包和版本类型（patch/minor/major）。

### 2. 更新版本

```bash
bun run version-packages
```

这会根据变更集更新所有包的版本号和 CHANGELOG。

### 3. 发布到 npm

```bash
bun run release
```

这会构建所有包并发布到 npm。

## 🔗 本地开发关联

在主项目中使用：

```json
{
  "dependencies": {
    "@robot-admin/request-core": "workspace:*"
  }
}
```

然后在主项目根目录运行：

```bash
bun install
```

## 📚 包管理

### 添加新包

1. 在 `packages/` 下创建新目录
2. 创建 `package.json`，包名格式：`@robot-admin/package-name`
3. 确保 `package.json` 中配置了正确的 `main`、`module`、`types` 字段

### 独立发布 vs 集中发布

- **独立发布**：使用 changesets 只选择要发布的包
- **集中发布**：在 `.changeset/config.json` 中配置 `linked` 字段

## 🛠️ 技术栈

- **包管理器**: Bun + Workspace
- **版本管理**: Changesets
- **构建工具**: tsup
- **TypeScript**: ^5.8.0

## 📄 License

MIT © [ChenYu](https://github.com/ChenyCHENYU)

# Changelog

## 1.0.4

### Patch Changes

- Execute local tools correctly through `npx --no-install` or `pnpm exec`, passing executable and arguments separately to execa.
- Back up existing generated configuration files before replacement and make initialization repeatable.
- Deep-merge package scripts, tool configuration and lint-staged entries instead of replacing user-owned sections.
- Register the missing `--jsdoc` option, read CLI/banner versions at runtime, and surface actionable execa error details.
- Declare public npm publishing metadata and side-effect-free library modules explicitly.

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-02-13

### ✨ Features

#### 核心功能

- 🚀 零配置初始化命令 `robot-standards init`
- 🔍 诊断命令 `robot-standards doctor`
- 🎯 智能包管理器检测（npm/yarn/pnpm/bun）
- 🌈 多框架支持（Vue 3/React/Vanilla）

#### 集成工具

- ✅ Commitizen + cz-customizable（交互式提交）
- ✅ Commitlint（提交信息校验）
- ✅ ESLint 9.x（代码检查，支持 Flat Config）
- ✅ Oxlint（高性能 Lint，可选）
- ✅ Prettier（代码格式化，可选）
- ✅ Husky（Git Hooks 管理）
- ✅ Lint-staged（暂存文件检查）

#### 配置生成器

- 📝 `createCommitizenConfig` - Commitizen 配置
- 📝 `createCommitlintConfig` - Commitlint 配置
- 📝 `createESLintConfig` - ESLint 配置
- 📝 `createPrettierConfig` - Prettier 配置
- 📝 `createLintStagedConfig` - Lint-staged 配置

#### 工具函数

- 🔧 `detectPackageManager` - 包管理器检测
- 🔧 `isGitRepository` - Git 仓库检测
- 🔧 `fileExists` - 文件存在检查
- 🔧 更多实用工具...

### 🎨 Commit Types

支持以下提交类型：

- `wip` - 🚧 开发中
- `feat` - 🎯 新功能
- `fix` - 🐛 Bug 修复
- `perf` - ⚡️ 性能优化
- `deps` - 📦 依赖更新
- `refactor` - ♻️ 重构
- `docs` - 📚 文档变更
- `test` - 🔎 测试相关
- `style` - 💄 代码样式
- `build` - 🧳 构建/打包
- `chore` - 🔧 其他杂项
- `revert` - 🔙 回退

### 📦 Package

- 首次发布到 npm
- 支持 ESM + CJS 双模块格式
- 完整 TypeScript 类型定义

# Changelog

## 2.2.0

### 🐛 Bug 修复

- **ReverseHorizontalMixLayout 右侧菜单错位**: 修复右侧菜单显示在底部而非右侧的问题（`.main-area` 添加 `flex-direction: row`）
- **MixLayout 二级菜单消失**: 修复鼠标离开后二级菜单内容消失的问题（新增 `displayMenuItem` 作为 `hoveredMenuItem` 的 fallback）
- **MixTopLayout 全局 CSS 泄漏**: 修复 `.main-area`、`.content-layout` 等选择器污染其他布局的问题（嵌套到 `.mix-top-layout-container` 内）

### ✨ 功能优化

- **ResponsiveMenu 字符宽度估算**: 区分 CJK 字符（15px）和 ASCII 字符（8px），顶部菜单文字完整显示不截断
- **ReverseHorizontalMixLayout 折叠动画**: 用 width 过渡替代 Transition，避免黑色闪烁，动画更流畅（0.35s cubic-bezier）
- **MixLayout 交互模式**: 从悬停触发改为纯点击模式，点击同一菜单切换展开/折叠，点击不同菜单切换内容不关闭

### 🎨 视觉设计

- **ReverseHorizontalMixLayout 玻璃质感**: 参考搜索组件样式，应用 indigo 渐变玻璃设计（`linear-gradient` + `backdrop-filter` + 顶部高光线）
- **pure CSS 图标**: 替换所有 UnoCSS 图标（`i-ri:*`）为纯 CSS 实现（dots-icon、grid-icon、hamburger-icon、collapse-arrow），减少外部依赖

### 📦 依赖

- 移除对 UnoCSS 图标的依赖，提升包的独立性

---

## 2.1.0

### Minor Changes

- 重构目录结构 + 代码优化

  - **目录重构**: 6 种布局骨架迁入 `components/layouts/` 子目录，层次更清晰
  - **文件分离**: 每个布局的样式从 `<style>` 标签提取到独立的 `index.scss` 文件
  - **注释统一**: 所有组件注释标准化为 `@robot-admin/layout - ComponentName` 格式
  - **文档优化**: 重写 README，精简核心内容、添加目录树、API 参考更清晰

All notable changes to this project will be documented in this file.

## [2.0.2] - 2026-02-11

### 🗑️ Removed

- **Dead files**: Removed unused `tsup.config.ts` (actual build uses Vite)
- **Empty directories**: Removed `composables/`, `core/`, `layouts/` (8 empty directories total)
- **Unused dependencies**: Removed `vue-router` from peerDependencies and devDependencies (never used in source code)

### 🔧 Fixed

- **package.json**:
  - Refined `sideEffects` to `["*.css", "*.scss"]` for better tree-shaking
  - Removed blocking patterns `"*.vue"` and `"src/index.ts"`
- **Source code**:

  - `constants/index.ts`: Removed commented-out code, fixed version from `"1.0.0"` to `"2.0.2"`
  - `types/index.ts`: Removed unimplemented `storageKey` option from `SettingsStoreOptions`
  - `stores/settings.ts`:
    - Exported `adjustColor` utility function (was private)
    - Removed redundant `|| false` in collapsed state initialization
  - `data.ts`:
    - Fixed `COLOR_SWATCHES` duplication (now imports from constants)
    - Renamed `LAYOUT_MODES` to `LAYOUT_MODE_OPTIONS` to avoid naming conflict

- **SettingsDrawer component**:

  - Removed unimplemented `storageKey` prop
  - Fixed hardcoded timezone `"XIAn"` → `Intl.DateTimeFormat().resolvedOptions().timeZone`
  - Fixed `handleResetLayout` missing `fixedHeader` and `tagsViewStyle` resets
  - Fixed `handleImportConfig` to use `$patch` instead of `Object.assign` for proper reactivity

- **Styles (`settings.scss`)**:

  - Replaced hardcoded `#409EFF` with `var(--primary-color, #409eff)` for theme color support
  - Replaced hardcoded `rgba(32, 128, 240)` shadows with CSS variable fallbacks

- **Build config**:
  - Removed unused `globals` from `vite.config.ts` (no UMD output)

### 📖 Documentation

- **README.md**: Fixed multiple inconsistencies with actual code:
  - `themeMode` default: `'system'` → `'light'`
  - `transitionType` default: `'fade'` → `'slide'`
  - `tagsViewHeight` default: `40` → `44`
  - `showFooter` default: `false` → `true`
  - Removed non-existent store properties: `enableWatermark`, `watermarkText`, `enableGrayMode`, `enableColorWeakMode`
  - Removed non-existent methods: `exportSettings()`, `importSettings()`
  - Removed unimplemented feature: "持久化存储"
  - Removed all `storageKey` parameter references
  - Added `adjustColor` utility function documentation
  - Fixed `ThemeMode` type: `'system'` → `'auto'`

### ✨ Enhanced

- Exported `adjustColor` utility function for external use
- Improved CSS variable support for theme customization

---

## [2.0.1] - 2026-02-09

### ✨ Added

- Initial v2.0 release with decoupled architecture
- Complete settings management system
- SettingsDrawer UI component
- 6 layout mode presets
- Theme customization with CSS variables
- Full TypeScript support

---

## [2.0.0] - 2026-02-09

### 🎉 Initial Release

- Layout and settings management system
- Integration with @robot-admin/theme
- Naive UI components support

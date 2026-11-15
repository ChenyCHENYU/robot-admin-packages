# Changelog

## 3.3.4

### Patch Changes

- 隐藏侧栏导航及内部菜单容器的滚动条，保留长菜单的滚动能力；移除不再使用的滚动条颜色与滑块样式，不影响业务页面和弹层的滚动条。

## 3.3.3

### Patch Changes

- 移除显式侧栏导航预设的展开组装饰引导线，恢复清爽的分组层级；保留当前页面标记、原生缩进、尺寸和点击区域，不影响未启用预设的菜单。

## 3.3.2

### Patch Changes

- 为显式侧栏导航预设恢复根展开组的淡色渐隐引导线，跟随主题主色和字号，不改变原生缩进、行高或点击区域；深层菜单与收起浮层不叠加引导线，保留当前页的独立选中标记。

## 3.3.1

### Patch Changes

- 精简侧栏菜单隔离选择器：后代节点仅检查标记祖先，根菜单继续同时检查自身与标记祖先，减少重复 CSS；移除两条已被后续相同选择器完全覆盖的历史声明。保留零特异性边界以及 3.3.0 的显式侧栏预设、菜单插槽和既有布局外观，不新增公开配置或改变菜单尺寸。
- 修复 Side 布局长菜单的高度链：通过 NLayoutSider 原生内容样式约束滚动内容高度，菜单独立滚动时品牌区保持固定，不影响其他布局模式。

## 3.3.0

### Minor Changes

- 新增显式启用的 Side 侧栏菜单预设：普通行透明，当前页面使用全宽淡底与细指示条，菜单行与点击区域共用 Naive 行高，并保留原生缩进、图标尺寸和收起居中。预设只作用于 Side 插槽内标记 `data-ra-sidebar-menu` 的垂直菜单，未标记菜单、其他布局和内容区菜单保留原有样式。

  为 Side 菜单插槽兼容新增响应式 `collapsedWidth`，使宿主菜单与侧栏使用同一收起宽度；补齐原生图标槽内的 SVG 尺寸约束、可聚焦标签反馈、减少动画设置及接入说明。

## 3.2.3

### Patch Changes

- Limit ThemePresetSettings to the five supported layout settings and ignore unrelated runtime keys without overriding the preset primary color.
- Normalize menu metadata without inventing required host extension fields or preserving unsupported narrow title/icon values. Keep ordinary calls free of explicit generics.

## 3.2.2

### Patch Changes

- docs: 统一包品牌标识与使用指南结构，同步 npm 侧展示的 README

## 3.2.1

### Patch Changes

- Restore the 3.x `MenuOptions.type` contract to `group | divider`, preventing the
  normalized menu result from becoming wider than existing consumer menu components.

## 3.2.0

### Minor Changes

- Add layered `@robot-admin/layout/vue` and `@robot-admin/layout/naive` entrypoints. The Naive entry aggregates the Vue API for one-entry consumption, all runtime entries preserve shared InjectionKey/Store identity, and the Vue entry contains no Naive UI or Element Plus imports; the 3.x root entry remains fully compatible.
- Decouple `createLayoutContext()` from the package Pinia Store through the structural `LayoutSettingsSource` contract and add safe host-menu normalization.
- Extract UI-independent settings transactions, responsive-menu measurement, icon fallback, CSS-variable binding, and the shared routed-content renderer for reuse by future UI adapters.
- Scope layout selectors and animation names, add `--ra-layout-*` variables, support reactive custom CSS variable targets, and restore detached/disposed targets without allowing post-disposal writes while preserving 3.x legacy variables by default.
- Restore custom Store defaults correctly from SettingsDrawer, establish `C_*Layout` as the single canonical component naming system, and retain unprefixed 3.1 names only as deprecated compatibility exports until 4.0.
- Add browser contracts for all six layouts, typed/legacy collapse interoperability, scoped side effects, structural Store adapters, and CI verification of source, package, ESM/CJS and dependency boundaries.

## 3.1.0

### Minor Changes

- Add `createLayoutContext()` and `provideLayout()` to derive the complete reactive layout contract from a settings Store, menus, dark state, brand data, and an optional icon component.
- Keep the advanced `LayoutContext` API intact while formally deprecating the legacy `C_*Layout` aliases for removal in 4.0.
- Add browser interaction coverage for SettingsDrawer providers, atomic imports, reset rollback, host-owned cache clearing, and global visual-effect cleanup.
- Correct integration prerequisites, host-owned setting semantics, migration guidance, architecture diagrams, and stale version references without changing existing layout visuals or interactions.

## 3.0.0

### Major Changes

- Release the 3.0 architecture upgrade while preserving the existing Naive UI layouts, interactions, slots, and visual styling.

  - Add a UI-independent `@robot-admin/layout/core` entrypoint for validated settings and shared contracts.
  - Make layout/store injection and collapsed state work reliably with custom stores and multi-instance hosts.
  - Replace destructive built-in storage clearing with explicit host actions and add stable SettingsDrawer extension slots.
  - Validate complete imported configuration files before applying state and restore host-owned global classes on teardown.
  - Respect the transition enable switch, harden route caching and responsive measurement, and improve built-in menu keyboard semantics.
  - Verify all six layout modes in SSR and validate both ESM and CommonJS package entrypoints before publishing.

## 2.3.2

### Patch Changes

- Validate imported settings at runtime, support short hex colors safely, and preserve invalid color input instead of silently turning it black.
- Use route-segment-aware menu matching so `/users` no longer activates `/users-admin`.
- Disable cache debug logging and global window helpers by default; add configurable Settings Store ids.
- Standardize the automatic theme value on `system` and roll back settings if asynchronous theme synchronization fails.
- Improve menu/drawer keyboard navigation, focus restoration and ARIA state; guard browser and Canvas APIs for SSR or unsupported environments.
- Synchronize the exported version constant with package version 2.3.2 and add regression tests for the critical settings and routing contracts.

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

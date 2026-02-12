# Changelog

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

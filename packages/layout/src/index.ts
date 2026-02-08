/**
 * @robot-admin/layout
 *
 * 布局和设置管理系统 - 完整版（包含 UI 组件）
 * 提供完整的布局模式管理、设置配置、主题预设、可视化配置组件等功能
 */

// ============ 组件 ============
export { default as SettingsDrawer } from "./components/SettingsDrawer/index.vue";

// ============ 初始化 ============
export { setupLayout } from "./setup";

// ============ Store ============
export { createSettingsStore, useSettingsStore } from "./stores/settings";

// ============ Types ============
export type {
  LayoutMode,
  TransitionType,
  BorderRadiusSize,
  TagsViewStyle,
  SettingsState,
  ThemePreset,
  SettingsStoreOptions,
  LayoutInfo,
  PresetColor,
} from "./types";

// ============ Constants ============
export {
  PRESET_COLORS,
  THEME_PRESETS,
  LAYOUT_MODES,
  BORDER_RADIUS_MAP,
  TRANSITION_MAP,
  DEFAULT_SETTINGS,
  COLOR_SWATCHES,
} from "./constants";

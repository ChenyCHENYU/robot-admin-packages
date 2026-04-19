/**
 * @robot-admin/theme
 *
 * 主题切换和管理系统
 * 提供主题模式管理、暗色模式切换、设计风格切换、View Transition API 支持
 */

// Types
export type {
  ThemeMode,
  DesignStyle,
  ThemeConfig,
  ThemeStoreOptions,
  DesignStyleConfig,
} from "./types";

// Constants
export {
  DEFAULT_THEME_OPTIONS,
  THEME_MODE_LABELS,
  THEME_MODE_ICONS,
  DESIGN_STYLE_CONFIGS,
  DESIGN_STYLE_LABELS,
  DESIGN_STYLE_ICONS,
} from "./constants";

// Composables
export {
  useViewTransition,
  isViewTransitionSupported,
} from "./composables/useViewTransition";

// Store
export { createThemeStore, useThemeStore } from "./stores/theme";

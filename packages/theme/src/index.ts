/**
 * @robot-admin/theme
 *
 * 主题切换和管理系统
 * 提供主题模式管理、暗色模式切换、View Transition API 支持
 */

// Types
export type { ThemeMode, ThemeConfig, ThemeStoreOptions } from "./types";

// Constants
export {
  DEFAULT_THEME_OPTIONS,
  THEME_MODE_LABELS,
  THEME_MODE_ICONS,
} from "./constants";

// Composables
export {
  useViewTransition,
  isViewTransitionSupported,
} from "./composables/useViewTransition";

// Store
export { createThemeStore, useThemeStore } from "./stores/theme";

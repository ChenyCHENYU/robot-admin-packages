/**
 * 默认配置常量
 */
export const DEFAULT_THEME_OPTIONS = {
  defaultMode: "system" as const,
  storageKey: "theme-mode",
  enableTransition: true,
  transitionDuration: 500,
};

/**
 * 主题模式显示文本
 */
export const THEME_MODE_LABELS = {
  light: "浅色",
  dark: "深色",
  system: "自动",
} as const;

/**
 * 主题模式图标
 */
export const THEME_MODE_ICONS = {
  light: "i-mdi:white-balance-sunny",
  dark: "i-mdi:moon-waning-crescent",
  system: "i-mdi:theme-light-dark",
} as const;

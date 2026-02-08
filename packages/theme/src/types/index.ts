/**
 * 主题模式类型
 */
export type ThemeMode = "light" | "dark" | "system";

/**
 * 主题配置接口
 */
export interface ThemeConfig {
  /** 当前主题模式 */
  mode: ThemeMode;
  /** 是否为暗色模式 */
  isDark: boolean;
  /** 系统是否为暗色模式 */
  systemIsDark: boolean;
}

/**
 * 主题 Store 选项
 */
export interface ThemeStoreOptions {
  /** 默认主题模式 */
  defaultMode?: ThemeMode;
  /** localStorage 键名 */
  storageKey?: string;
  /** 是否启用 View Transition API */
  enableTransition?: boolean;
  /** 过渡动画时长（毫秒） */
  transitionDuration?: number;
}

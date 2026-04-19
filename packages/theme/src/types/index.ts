/**
 * 主题模式类型
 */
export type ThemeMode = "light" | "dark" | "system";

/**
 * 设计风格类型
 * - glass-morphism: 拟态玻璃（毛玻璃 + 半透明 + 内发光）
 * - corporate-minimal: 企业简约（极简 + 克制装饰 + 商务色彩）
 * - dark-tech: 深邃科技（深色主导 + 霓虹点缀 + 发光效果，仅暗色）
 */
export type DesignStyle = "glass-morphism" | "corporate-minimal" | "dark-tech";

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
  /** 当前设计风格 */
  designStyle: DesignStyle;
}

/**
 * 设计风格配置接口
 */
export interface DesignStyleConfig {
  /** 风格名称 */
  name: string;
  /** 风格描述 */
  description: string;
  /** 支持的视觉模式（light / dark），用于兼容性校验 */
  supportedThemeModes: ThemeMode[];
  /** 推荐搭配的菜单风格标识（供消费方参考，不强制） */
  recommendedMenuTheme: string;
}

/**
 * 主题 Store 选项
 */
export interface ThemeStoreOptions {
  /** 默认主题模式 */
  defaultMode?: ThemeMode;
  /** 默认设计风格 */
  defaultDesignStyle?: DesignStyle;
  /** localStorage 键名（主题模式） */
  storageKey?: string;
  /** localStorage 键名（设计风格） */
  designStyleStorageKey?: string;
  /** 是否启用 View Transition API */
  enableTransition?: boolean;
  /** 过渡动画时长（毫秒） */
  transitionDuration?: number;
}

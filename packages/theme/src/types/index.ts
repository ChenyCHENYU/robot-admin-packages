/**
 * 主题模式类型
 */
export type ThemeMode = "light" | "dark" | "system";

/** 实际呈现到页面的主题模式 */
export type ResolvedThemeMode = Exclude<ThemeMode, "system">;

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

/** 可替换的主题偏好存储协议。 */
export interface ThemeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** 主题运行时可观测的降级操作。 */
export type ThemeErrorOperation =
  | "storage-read"
  | "storage-write"
  | "storage-remove"
  | "system-preference";

/** 主题运行时错误上下文。 */
export interface ThemeErrorContext {
  readonly operation: ThemeErrorOperation;
  readonly key?: string;
}

/** 可选的主题运行时错误处理器。 */
export type ThemeErrorHandler = (
  error: unknown,
  context: ThemeErrorContext,
) => void;

/**
 * 设计风格配置接口
 */
export interface DesignStyleConfig {
  /** 风格名称 */
  readonly name: string;
  /** 风格描述 */
  readonly description: string;
  /** 支持的视觉模式（light / dark），用于兼容性校验 */
  readonly supportedThemeModes: readonly ResolvedThemeMode[];
  /** 推荐搭配的菜单风格标识（供消费方参考，不强制） */
  readonly recommendedMenuTheme: string;
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
  /** 可替换存储；传入 null 可显式禁用持久化 */
  storage?: ThemeStorage | null;
  /** 是否同步同源页面的 storage 变化（仅内置 localStorage 生效） */
  syncAcrossTabs?: boolean;
  /** 存储或系统偏好读取失败时的可选诊断回调 */
  onError?: ThemeErrorHandler;
  /** Pinia Store 唯一标识（默认 "theme"） */
  id?: string;
}

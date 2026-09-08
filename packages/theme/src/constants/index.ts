import type { DesignStyle, DesignStyleConfig } from "../types";

/**
 * 默认配置常量
 */
export const DEFAULT_THEME_OPTIONS = Object.freeze({
  defaultMode: "system" as const,
  defaultDesignStyle: "glass-morphism" as const,
  storageKey: "theme-mode",
  designStyleStorageKey: "robot-admin-design-style",
  enableTransition: true,
});

/**
 * 主题模式显示文本
 */
export const THEME_MODE_LABELS = Object.freeze({
  light: "浅色",
  dark: "深色",
  system: "自动",
} as const);

/**
 * 主题模式图标
 */
export const THEME_MODE_ICONS = Object.freeze({
  light: "i-mdi:white-balance-sunny",
  dark: "i-mdi:moon-waning-crescent",
  system: "i-mdi:theme-light-dark",
} as const);

/**
 * 设计风格配置
 */
export const DESIGN_STYLE_CONFIGS = Object.freeze({
  "glass-morphism": {
    name: "拟态玻璃",
    description: "现代化的毛玻璃效果，营造层次丰富的视觉体验",
    supportedThemeModes: Object.freeze(["light", "dark"] as const),
    recommendedMenuTheme: "signature",
  },
  "corporate-minimal": {
    name: "企业简约",
    description: "简洁专业的商务风格，注重功能性和可读性",
    supportedThemeModes: Object.freeze(["light", "dark"] as const),
    recommendedMenuTheme: "standard",
  },
  "dark-tech": {
    name: "深邃科技",
    description: "炫酷的科技感设计，适合技术类应用",
    supportedThemeModes: Object.freeze(["dark"] as const),
    recommendedMenuTheme: "signature",
  },
} satisfies Record<DesignStyle, DesignStyleConfig>);

/**
 * 设计风格显示文本
 */
export const DESIGN_STYLE_LABELS = Object.freeze({
  "glass-morphism": DESIGN_STYLE_CONFIGS["glass-morphism"].name,
  "corporate-minimal": DESIGN_STYLE_CONFIGS["corporate-minimal"].name,
  "dark-tech": DESIGN_STYLE_CONFIGS["dark-tech"].name,
});

/**
 * 设计风格图标
 */
export const DESIGN_STYLE_ICONS = Object.freeze({
  "glass-morphism": "i-mdi:blur",
  "corporate-minimal": "i-mdi:office-building",
  "dark-tech": "i-mdi:chip",
} as const);

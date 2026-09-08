import type { DesignStyle, ResolvedThemeMode, ThemeMode } from "../types";

/** 支持的主题模式，按切换顺序排列。 */
export const THEME_MODES = Object.freeze([
  "light",
  "dark",
  "system",
] as const satisfies readonly ThemeMode[]);

/** 支持的设计风格，按切换顺序排列。 */
export const DESIGN_STYLES = Object.freeze([
  "glass-morphism",
  "corporate-minimal",
  "dark-tech",
] as const satisfies readonly DesignStyle[]);

const VALID_THEME_MODES: ReadonlySet<string> = new Set(THEME_MODES);
const VALID_DESIGN_STYLES: ReadonlySet<string> = new Set(DESIGN_STYLES);

/** 判断未知值是否为合法主题模式。 */
export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && VALID_THEME_MODES.has(value);
}

/** 判断未知值是否为合法设计风格。 */
export function isDesignStyle(value: unknown): value is DesignStyle {
  return typeof value === "string" && VALID_DESIGN_STYLES.has(value);
}

/** 将用户主题偏好解析为实际的明暗视觉模式。 */
export function resolveThemeMode(
  mode: ThemeMode,
  systemIsDark: boolean,
): ResolvedThemeMode {
  return mode === "system" ? (systemIsDark ? "dark" : "light") : mode;
}

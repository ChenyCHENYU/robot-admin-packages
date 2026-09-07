import type { SettingsState } from "./types";

const ENUM_SETTINGS = {
  themeMode: new Set(["light", "dark", "system"]),
  borderRadius: new Set(["small", "medium", "large"]),
  transitionType: new Set(["fade", "slide", "zoom", "none"]),
  layoutMode: new Set([
    "side",
    "top",
    "mix",
    "mix-top",
    "reverse-horizontal-mix",
    "card-layout",
  ]),
  menuExpandMode: new Set(["inline", "panel"]),
  tagsViewStyle: new Set(["default", "card", "smart"]),
} as const;

const BOOLEAN_SETTINGS: ReadonlySet<keyof SettingsState> = new Set([
  "enableTransition",
  "collapsed",
  "fixedHeader",
  "showBreadcrumb",
  "showBreadcrumbIcon",
  "showTagsView",
  "showFooter",
  "enableHotkeys",
]);

const NUMBER_RANGES: Partial<
  Record<keyof SettingsState, readonly [number, number]>
> = {
  tagsViewHeight: [24, 100],
  sidebarWidth: [120, 480],
  sidebarCollapsedWidth: [32, 160],
  headerHeight: [32, 160],
};

/** 当前导入导出配置格式版本。 */
export const SETTINGS_CONFIG_SCHEMA_VERSION = 1 as const;

export interface LayoutVisualEffects {
  gray?: boolean;
  colorWeak?: boolean;
  watermark?: {
    enabled: boolean;
    text: string;
  };
}

/** 经校验后可原子应用的布局配置。 */
export interface LayoutSettingsConfig extends LayoutVisualEffects {
  schemaVersion?: number;
  settings?: Partial<SettingsState>;
}

/** 校验需要跨字段判断的布局尺寸约束。 */
export function assertLayoutSettingsRelationships(
  settings: Pick<SettingsState, "sidebarCollapsedWidth" | "sidebarWidth">,
): void {
  if (settings.sidebarCollapsedWidth > settings.sidebarWidth) {
    throw new RangeError("sidebarCollapsedWidth 不能大于 sidebarWidth");
  }
}

/**
 * 校验来自配置文件等不可信来源的设置。
 * 未知键为向前兼容而忽略；已知键的非法值会让整次导入失败。
 */
export function sanitizeSettingsPatch(input: unknown): Partial<SettingsState> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("settings 必须是对象");
  }

  const source = input as Record<string, unknown>;
  const result: Partial<SettingsState> = {};
  const assign = (key: keyof SettingsState, value: unknown) => {
    (result as Record<string, unknown>)[key] = value;
  };

  for (const [key, allowed] of Object.entries(ENUM_SETTINGS)) {
    const value = source[key];
    if (value === undefined) continue;
    if (typeof value !== "string" || !allowed.has(value as never)) {
      throw new RangeError(`无效的设置项 ${key}: ${String(value)}`);
    }
    assign(key as keyof SettingsState, value);
  }

  for (const key of BOOLEAN_SETTINGS) {
    const value = source[key];
    if (value === undefined) continue;
    if (typeof value !== "boolean") {
      throw new TypeError(`设置项 ${key} 必须是布尔值`);
    }
    assign(key, value);
  }

  for (const [key, range] of Object.entries(NUMBER_RANGES)) {
    const value = source[key];
    if (value === undefined) continue;
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < range[0] ||
      value > range[1]
    ) {
      throw new RangeError(`设置项 ${key} 超出允许范围`);
    }
    assign(key as keyof SettingsState, value);
  }

  if (source.primaryColor !== undefined) {
    if (
      typeof source.primaryColor !== "string" ||
      !/^#[0-9a-fA-F]{6}$/.test(source.primaryColor)
    ) {
      throw new RangeError("primaryColor 必须是 #rrggbb 格式");
    }
    result.primaryColor = source.primaryColor;
  }

  if (source.version !== undefined) {
    if (typeof source.version !== "string" || source.version.length > 50) {
      throw new TypeError("version 必须是长度不超过 50 的字符串");
    }
    result.version = source.version;
  }

  return result;
}

/**
 * 一次性校验完整导入文件。此函数不修改任何响应式状态或浏览器 API，
 * 消费方可以在成功返回后再原子应用结果。
 */
export function sanitizeLayoutSettingsConfig(
  input: unknown,
): LayoutSettingsConfig {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("配置文件根节点必须是对象");
  }

  const source = input as Record<string, unknown>;
  const result: LayoutSettingsConfig = {};

  if (source.schemaVersion !== undefined) {
    if (
      typeof source.schemaVersion !== "number" ||
      !Number.isInteger(source.schemaVersion) ||
      source.schemaVersion < 1 ||
      source.schemaVersion > SETTINGS_CONFIG_SCHEMA_VERSION
    ) {
      throw new RangeError("不支持的配置格式版本");
    }
    result.schemaVersion = source.schemaVersion;
  }

  if (source.settings !== undefined) {
    result.settings = sanitizeSettingsPatch(source.settings);
  }

  for (const key of ["gray", "colorWeak"] as const) {
    const value = source[key];
    if (value === undefined) continue;
    if (typeof value !== "boolean") {
      throw new TypeError(`${key} 必须是布尔值`);
    }
    result[key] = value;
  }

  if (source.watermark !== undefined) {
    if (
      !source.watermark ||
      typeof source.watermark !== "object" ||
      Array.isArray(source.watermark)
    ) {
      throw new TypeError("watermark 必须是对象");
    }
    const watermark = source.watermark as Record<string, unknown>;
    if (
      typeof watermark.enabled !== "boolean" ||
      typeof watermark.text !== "string" ||
      watermark.text.length > 200
    ) {
      throw new TypeError("watermark 配置无效");
    }
    result.watermark = {
      enabled: watermark.enabled,
      text: watermark.text,
    };
  }

  return result;
}

/**
 * 调整颜色亮度。
 * @returns 调整后的 #rrggbb；输入非法时原样返回。
 */
export function adjustColor(color: string, amount: number): string {
  if (typeof color !== "string") return "#000000";
  if (!Number.isFinite(amount)) return color;
  const normalizedAmount = Math.round(amount);
  const trimmedColor = color.trim();
  let hex = trimmedColor.startsWith("#") ? trimmedColor.slice(1) : trimmedColor;
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((character) => character + character)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return color;

  const value = parseInt(hex, 16);
  const red = Math.min(255, Math.max(0, (value >> 16) + normalizedAmount));
  const green = Math.min(
    255,
    Math.max(0, ((value >> 8) & 0x00ff) + normalizedAmount),
  );
  const blue = Math.min(
    255,
    Math.max(0, (value & 0x0000ff) + normalizedAmount),
  );
  return `#${((red << 16) | (green << 8) | blue).toString(16).padStart(6, "0")}`;
}

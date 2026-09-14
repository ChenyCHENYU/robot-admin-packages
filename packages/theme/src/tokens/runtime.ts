import { DEFAULT_THEME_TOKENS } from "./defaults";
import type {
  ThemeCssVariable,
  ThemeSchemeTokenOverrides,
  ThemeSchemeTokens,
  ThemeStyleTarget,
  ThemeTokenMode,
  ThemeTokenOverrides,
  ThemeTokenSet,
} from "./types";

type StringRecord = Record<string, string>;

function assertObject(value: unknown, path: string): asserts value is object {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${path} 必须是普通对象`);
  }
}

function mergeGroup<T extends object>(
  defaults: T,
  overrides: Partial<T> | undefined,
  path: string,
): Readonly<T> {
  if (overrides === undefined) return defaults;
  assertObject(overrides, path);
  const base = defaults as StringRecord;
  const source = overrides as Record<string, unknown>;
  const result: StringRecord = { ...base };

  for (const [key, value] of Object.entries(source)) {
    if (!Object.prototype.hasOwnProperty.call(base, key)) {
      throw new RangeError(`未知的主题 Token: ${path}.${key}`);
    }
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new TypeError(`${path}.${key} 必须是非空字符串`);
    }
    result[key] = value.trim();
  }

  return Object.freeze(result) as Readonly<T>;
}

function mergeScheme(
  defaults: ThemeSchemeTokens,
  overrides: ThemeSchemeTokenOverrides | undefined,
  path: string,
): ThemeSchemeTokens {
  if (overrides !== undefined) {
    assertObject(overrides, path);
    for (const key of Object.keys(overrides)) {
      if (!Object.prototype.hasOwnProperty.call(defaults, key)) {
        throw new RangeError(`未知的主题 Token 分组: ${path}.${key}`);
      }
    }
  }
  return Object.freeze({
    color: mergeGroup(defaults.color, overrides?.color, `${path}.color`),
    component: mergeGroup(
      defaults.component,
      overrides?.component,
      `${path}.component`,
    ),
    shadow: mergeGroup(defaults.shadow, overrides?.shadow, `${path}.shadow`),
  });
}

/**
 * 基于默认主题创建不可变 Token 集。只接受已声明字段，拼写错误和空值会立即失败。
 */
export function createThemeTokens(
  overrides: ThemeTokenOverrides = {},
): ThemeTokenSet {
  assertObject(overrides, "tokens");
  for (const key of Object.keys(overrides)) {
    if (!Object.prototype.hasOwnProperty.call(DEFAULT_THEME_TOKENS, key)) {
      throw new RangeError(`未知的主题 Token 分组: tokens.${key}`);
    }
  }

  return Object.freeze({
    brand: mergeGroup(DEFAULT_THEME_TOKENS.brand, overrides.brand, "tokens.brand"),
    light: mergeScheme(DEFAULT_THEME_TOKENS.light, overrides.light, "tokens.light"),
    dark: mergeScheme(DEFAULT_THEME_TOKENS.dark, overrides.dark, "tokens.dark"),
    radius: mergeGroup(DEFAULT_THEME_TOKENS.radius, overrides.radius, "tokens.radius"),
    spacing: mergeGroup(
      DEFAULT_THEME_TOKENS.spacing,
      overrides.spacing,
      "tokens.spacing",
    ),
    control: mergeGroup(
      DEFAULT_THEME_TOKENS.control,
      overrides.control,
      "tokens.control",
    ),
    typography: mergeGroup(
      DEFAULT_THEME_TOKENS.typography,
      overrides.typography,
      "tokens.typography",
    ),
    motion: mergeGroup(DEFAULT_THEME_TOKENS.motion, overrides.motion, "tokens.motion"),
  });
}

const toKebabCase = (value: string): string =>
  value.replace(/[A-Z]/g, character => `-${character.toLowerCase()}`);

function appendVariables(
  target: Record<ThemeCssVariable, string>,
  prefix: string,
  values: object,
): void {
  for (const [key, value] of Object.entries(values)) {
    target[`--ra-${prefix}${toKebabCase(key)}`] = value;
  }
}

/** 将指定明暗模式解析为扁平 CSS Variables。 */
export function getThemeCssVariables(
  tokens: ThemeTokenSet,
  mode: ThemeTokenMode,
): Readonly<Record<ThemeCssVariable, string>> {
  const result: Record<ThemeCssVariable, string> = {};
  const scheme = tokens[mode];

  appendVariables(result, "color-brand-", tokens.brand);
  appendVariables(result, "color-", scheme.color);
  appendVariables(result, "", scheme.component);
  appendVariables(result, "shadow-", scheme.shadow);
  appendVariables(result, "radius-", tokens.radius);
  appendVariables(result, "space-", tokens.spacing);
  appendVariables(result, "control-", tokens.control);
  appendVariables(result, "type-", tokens.typography);
  appendVariables(result, "motion-", tokens.motion);
  return Object.freeze(result);
}

/** 原子写入一套主题变量；用于模式切换时更新已接管的目标。 */
export function setThemeCssVariables(
  target: ThemeStyleTarget,
  tokens: ThemeTokenSet,
  mode: ThemeTokenMode,
): void {
  for (const [name, value] of Object.entries(getThemeCssVariables(tokens, mode))) {
    target.setProperty(name, value);
  }
}

/**
 * 应用主题变量并返回恢复函数。恢复时会还原目标原有值和优先级，适合微应用、HMR 和测试。
 */
export function applyThemeTokens(
  target: ThemeStyleTarget,
  tokens: ThemeTokenSet,
  mode: ThemeTokenMode,
): () => void {
  const variables = getThemeCssVariables(tokens, mode);
  const previous = new Map<string, { value: string; priority: string }>();

  for (const [name, value] of Object.entries(variables)) {
    previous.set(name, {
      value: target.getPropertyValue(name),
      priority: target.getPropertyPriority(name),
    });
    target.setProperty(name, value);
  }

  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    for (const [name, state] of previous) {
      if (state.value) target.setProperty(name, state.value, state.priority);
      else target.removeProperty(name);
    }
  };
}

function renderBlock(
  selector: string,
  variables: Readonly<Record<ThemeCssVariable, string>>,
): string {
  const declarations = Object.entries(variables)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");
  return `${selector} {\n${declarations}\n}`;
}

/** 从同一份 TypeScript 默认值生成可发布 CSS，避免配置与样式双事实源。 */
export function createThemeCss(tokens: ThemeTokenSet = DEFAULT_THEME_TOKENS): string {
  return [
    "/* Generated from @robot-admin/theme tokens. Do not edit dist output. */",
    renderBlock(":root,\n[data-theme=\"light\"]", getThemeCssVariables(tokens, "light")),
    renderBlock("[data-theme=\"dark\"]", getThemeCssVariables(tokens, "dark")),
    "",
  ].join("\n\n");
}

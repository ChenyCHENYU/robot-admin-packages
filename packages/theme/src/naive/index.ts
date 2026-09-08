import { computed, toValue } from "vue";
import type { ComputedRef, MaybeRefOrGetter } from "vue";
import {
  darkTheme,
  lightTheme,
  type GlobalTheme,
  type GlobalThemeOverrides,
} from "naive-ui";

/** 响应式或静态的 Naive UI 覆盖配置来源。 */
export type NaiveThemeOverridesSource = MaybeRefOrGetter<
  GlobalThemeOverrides | null | undefined
>;

/** Naive UI 主题适配选项。 */
export interface NaiveThemeOptions {
  /** 当前是否呈现暗色模式。 */
  isDark: MaybeRefOrGetter<boolean>;
  /** 亮色基础覆盖。 */
  lightOverrides?: NaiveThemeOverridesSource;
  /** 暗色基础覆盖。 */
  darkOverrides?: NaiveThemeOverridesSource;
  /** 当前消费方增量覆盖。 */
  overrides?: NaiveThemeOverridesSource;
}

/** 可直接绑定到 NConfigProvider 的响应式结果。 */
export interface NaiveThemeBinding {
  readonly currentTheme: ComputedRef<GlobalTheme>;
  readonly themeOverrides: ComputedRef<GlobalThemeOverrides>;
}

/** 判断未知值是否为可按属性合并的普通对象。 */
function isMergeableRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 合并 Naive UI 全局覆盖：顶层配置后者优先，各组件配置执行一层属性合并。
 * 该深度与 GlobalThemeOverrides 的实际结构一致，并避免递归污染特殊对象。
 */
export function mergeNaiveThemeOverrides(
  ...sources: ReadonlyArray<GlobalThemeOverrides | null | undefined>
): GlobalThemeOverrides {
  const result: Record<string, unknown> = {};
  for (const source of sources) {
    if (!isMergeableRecord(source)) continue;
    for (const [key, value] of Object.entries(source)) {
      const previous = result[key];
      result[key] =
        isMergeableRecord(previous) && isMergeableRecord(value)
          ? { ...previous, ...value }
          : value;
    }
  }
  return result as GlobalThemeOverrides;
}

/** 创建可直接用于 NConfigProvider 的主题与覆盖配置。 */
export function useNaiveTheme(options: NaiveThemeOptions): NaiveThemeBinding {
  const currentTheme = computed<GlobalTheme>(() =>
    toValue(options.isDark) ? darkTheme : lightTheme,
  );
  const themeOverrides = computed<GlobalThemeOverrides>(() =>
    mergeNaiveThemeOverrides(
      toValue(
        toValue(options.isDark)
          ? options.darkOverrides
          : options.lightOverrides,
      ),
      toValue(options.overrides),
    ),
  );

  return { currentTheme, themeOverrides };
}

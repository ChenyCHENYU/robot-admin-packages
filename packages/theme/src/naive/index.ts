import { computed, toValue } from "vue";
import type { ComputedRef, MaybeRefOrGetter } from "vue";
import {
  darkTheme,
  lightTheme,
  type GlobalTheme,
  type GlobalThemeOverrides,
} from "naive-ui";
import type { ThemeTokenMode, ThemeTokenSet } from "../tokens";

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
  /** 可选的统一语义 Token；传入后先映射为 Naive UI 基础配置，再合并消费方覆盖。 */
  tokens?: MaybeRefOrGetter<ThemeTokenSet | null | undefined>;
}

/** 将框架无关 Token 映射为 Naive UI 配置。消费方覆盖仍拥有最终优先级。 */
export function createNaiveThemeOverrides(
  tokens: ThemeTokenSet,
  mode: ThemeTokenMode,
): GlobalThemeOverrides {
  const scheme = tokens[mode];
  const { color, component, shadow } = scheme;
  return {
    common: {
      primaryColor: color.primary,
      primaryColorHover: color.primaryHover,
      primaryColorPressed: color.primaryPressed,
      primaryColorSuppl: color.primary,
      infoColor: color.info,
      infoColorHover: color.infoHover,
      infoColorPressed: color.info,
      infoColorSuppl: color.info,
      successColor: color.success,
      successColorHover: color.successHover,
      successColorPressed: color.success,
      successColorSuppl: color.success,
      warningColor: color.warning,
      warningColorHover: color.warningHover,
      warningColorPressed: color.warning,
      warningColorSuppl: color.warning,
      errorColor: color.danger,
      errorColorHover: color.dangerHover,
      errorColorPressed: color.danger,
      errorColorSuppl: color.danger,
      bodyColor: color.canvas,
      cardColor: color.surface,
      modalColor: color.elevated,
      popoverColor: color.elevated,
      tableColor: color.surface,
      textColorBase: color.textPrimary,
      textColor1: color.textPrimary,
      textColor2: color.textSecondary,
      textColor3: color.textTertiary,
      textColorDisabled: color.textDisabled,
      placeholderColor: color.placeholder,
      borderColor: color.border,
      dividerColor: color.divider,
      hoverColor: color.fillHover,
      actionColor: color.surfaceMuted,
      borderRadius: tokens.radius.md,
      borderRadiusSmall: tokens.radius.sm,
      fontSize: tokens.typography.fontSizeMd,
      fontSizeMini: tokens.typography.fontSizeXs,
      fontSizeSmall: tokens.typography.fontSizeSm,
      fontSizeMedium: tokens.typography.fontSizeMd,
      fontSizeLarge: tokens.typography.fontSizeLg,
      boxShadow1: shadow.sm,
      boxShadow2: shadow.md,
      boxShadow3: shadow.lg,
    },
    DataTable: {
      borderColor: color.divider,
      thColor: component.tableHeaderBg,
      thColorHover: color.fillHover,
      thColorSorting: color.fillActive,
      thTextColor: component.tableHeaderText,
      tdTextColor: color.textPrimary,
      tdColorHover: component.tableRowHover,
      tdColorStriped: color.surfaceMuted,
    },
    Tabs: {
      barColor: component.tabIndicator,
      colorSegment: color.surfaceMuted,
      tabColor: color.surface,
      tabColorSegment: color.surface,
      tabBorderColor: color.border,
      paneTextColor: color.textPrimary,
      tabTextColorLine: component.tabText,
      tabTextColorActiveLine: component.tabTextActive,
      tabTextColorHoverLine: color.primaryHover,
      tabTextColorSegment: component.tabText,
      tabTextColorActiveSegment: component.tabTextActive,
      tabTextColorHoverSegment: color.primaryHover,
      tabTextColorBar: component.tabText,
      tabTextColorActiveBar: component.tabTextActive,
      tabTextColorHoverBar: color.primaryHover,
      tabTextColorCard: component.tabText,
      tabTextColorActiveCard: component.tabTextActive,
      tabTextColorHoverCard: color.primaryHover,
    },
  };
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
  const themeOverrides = computed<GlobalThemeOverrides>(() => {
    const isDark = toValue(options.isDark);
    const tokens = toValue(options.tokens);
    return mergeNaiveThemeOverrides(
      tokens
        ? createNaiveThemeOverrides(tokens, isDark ? "dark" : "light")
        : undefined,
      toValue(isDark ? options.darkOverrides : options.lightOverrides),
      toValue(options.overrides),
    );
  });

  return { currentTheme, themeOverrides };
}

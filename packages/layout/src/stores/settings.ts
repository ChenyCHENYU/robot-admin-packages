import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import type { ThemeMode } from "@robot-admin/theme";
import type {
  SettingsState,
  ThemePreset,
  LayoutMode,
  MenuExpandMode,
  TransitionType,
  BorderRadiusSize,
  TagsViewStyle,
  SettingsStoreOptions,
} from "../types";
import {
  DEFAULT_SETTINGS,
  BORDER_RADIUS_MAP,
  TRANSITION_MAP,
} from "../constants";

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
 * 调整颜色亮度
 * @param color - 十六进制颜色值（支持 #rgb / #rrggbb）
 * @param amount - 调整量，正数变亮，负数变暗
 * @returns 调整后的 #rrggbb；输入非法时原样返回（避免静默变黑）
 */
export function adjustColor(color: string, amount: number): string {
  if (typeof color !== "string") return "#000000";
  if (!Number.isFinite(amount)) return color;
  const normalizedAmount = Math.round(amount);
  const trimmedColor = color.trim();
  let hex = trimmedColor.startsWith("#")
    ? trimmedColor.slice(1)
    : trimmedColor;
  // 支持 3 位简写（#rgb → #rrggbb）
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  // 仅当为合法的 6 位十六进制时才计算，否则原样返回
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return color;
  }
  const num = parseInt(hex, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + normalizedAmount));
  const g = Math.min(
    255,
    Math.max(0, ((num >> 8) & 0x00ff) + normalizedAmount),
  );
  const b = Math.min(
    255,
    Math.max(0, (num & 0x0000ff) + normalizedAmount),
  );
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/**
 * 创建设置管理 Store
 * @param options - 配置选项
 */
export function createSettingsStore(options: SettingsStoreOptions = {}) {
  const { id = "settings", defaults = {}, onThemeModeChange } = options;
  if (typeof id !== "string" || !id.trim()) {
    throw new RangeError("Settings store id 不能为空");
  }

  // 合并默认配置
  const finalDefaults = {
    ...DEFAULT_SETTINGS,
    ...sanitizeSettingsPatch(defaults),
  };

  return defineStore(id, () => {
    // ============ 状态定义 ============

    // 外观设置
    const themeMode = ref<ThemeMode>(finalDefaults.themeMode);
    const primaryColor = ref<string>(finalDefaults.primaryColor);
    const borderRadius = ref<BorderRadiusSize>(finalDefaults.borderRadius);
    const transitionType = ref<TransitionType>(finalDefaults.transitionType);
    const enableTransition = ref<boolean>(finalDefaults.enableTransition);

    // 布局设置
    const layoutMode = ref<LayoutMode>(finalDefaults.layoutMode);
    const menuExpandMode = ref<MenuExpandMode>(finalDefaults.menuExpandMode);
    const collapsed = ref<boolean>(finalDefaults.collapsed);
    const fixedHeader = ref<boolean>(finalDefaults.fixedHeader);
    const showBreadcrumb = ref<boolean>(finalDefaults.showBreadcrumb);
    const showBreadcrumbIcon = ref<boolean>(finalDefaults.showBreadcrumbIcon);
    const showTagsView = ref<boolean>(finalDefaults.showTagsView);
    const tagsViewHeight = ref<number>(finalDefaults.tagsViewHeight);
    const tagsViewStyle = ref<TagsViewStyle>(finalDefaults.tagsViewStyle);
    const showFooter = ref<boolean>(finalDefaults.showFooter);
    const sidebarWidth = ref<number>(finalDefaults.sidebarWidth);
    const sidebarCollapsedWidth = ref<number>(
      finalDefaults.sidebarCollapsedWidth,
    );
    const headerHeight = ref<number>(finalDefaults.headerHeight);

    // 高级设置
    const enableHotkeys = ref<boolean>(finalDefaults.enableHotkeys);
    const version = ref<string>(finalDefaults.version);

    // ============ 计算属性 ============

    /** 获取圆角值 */
    const borderRadiusValue = computed(
      () => BORDER_RADIUS_MAP[borderRadius.value],
    );

    /** 获取过渡动画名称 */
    const transitionName = computed(() => TRANSITION_MAP[transitionType.value]);

    /** 是否启用过渡动画 */
    const shouldEnableTransition = computed(
      () => enableTransition.value && transitionType.value !== "none",
    );

    /** 获取完整的设置状态 */
    const settingsState = computed<SettingsState>(() => ({
      themeMode: themeMode.value,
      primaryColor: primaryColor.value,
      borderRadius: borderRadius.value,
      transitionType: transitionType.value,
      enableTransition: enableTransition.value,
      layoutMode: layoutMode.value,
      menuExpandMode: menuExpandMode.value,
      collapsed: collapsed.value,
      fixedHeader: fixedHeader.value,
      showBreadcrumb: showBreadcrumb.value,
      showBreadcrumbIcon: showBreadcrumbIcon.value,
      showTagsView: showTagsView.value,
      tagsViewHeight: tagsViewHeight.value,
      tagsViewStyle: tagsViewStyle.value,
      showFooter: showFooter.value,
      sidebarWidth: sidebarWidth.value,
      sidebarCollapsedWidth: sidebarCollapsedWidth.value,
      headerHeight: headerHeight.value,
      enableHotkeys: enableHotkeys.value,
      version: version.value,
    }));

    // ============ 方法 ============

    /**
     * 同步 CSS Variables
     */
    const syncCSSVariables = () => {
      if (typeof document === "undefined") return;

      const root = document.documentElement;

      // 主题色
      root.style.setProperty("--primary-color", primaryColor.value);
      root.style.setProperty(
        "--primary-color-hover",
        adjustColor(primaryColor.value, 10),
      );
      root.style.setProperty(
        "--primary-color-pressed",
        adjustColor(primaryColor.value, -10),
      );

      // 圆角
      root.style.setProperty("--border-radius", borderRadiusValue.value);

      // 尺寸
      root.style.setProperty("--sidebar-width", `${sidebarWidth.value}px`);
      root.style.setProperty(
        "--sidebar-collapsed-width",
        `${sidebarCollapsedWidth.value}px`,
      );
      root.style.setProperty("--header-height", `${headerHeight.value}px`);
      root.style.setProperty("--tags-view-height", `${tagsViewHeight.value}px`);
    };

    /**
     * 应用主题预设方案
     * 注意：只应用颜色配置，不改变布局模式和主题模式
     */
    const applyPreset = async (preset: ThemePreset) => {
      // 只应用主题色
      primaryColor.value = preset.primaryColor;

      // 应用其他细节配置（如果存在）
      if (preset.settings) {
        if (preset.settings.borderRadius)
          borderRadius.value = preset.settings.borderRadius;
        if (preset.settings.transitionType)
          transitionType.value = preset.settings.transitionType;
        if (preset.settings.showBreadcrumb !== undefined)
          showBreadcrumb.value = preset.settings.showBreadcrumb;
        if (preset.settings.showTagsView !== undefined)
          showTagsView.value = preset.settings.showTagsView;
        if (preset.settings.tagsViewStyle)
          tagsViewStyle.value = preset.settings.tagsViewStyle;
      }
    };

    /**
     * 重置配置
     */
    const resetSettings = () => {
      themeMode.value = finalDefaults.themeMode;
      primaryColor.value = finalDefaults.primaryColor;
      borderRadius.value = finalDefaults.borderRadius;
      transitionType.value = finalDefaults.transitionType;
      enableTransition.value = finalDefaults.enableTransition;

      layoutMode.value = finalDefaults.layoutMode;
      menuExpandMode.value = finalDefaults.menuExpandMode;
      collapsed.value = finalDefaults.collapsed;
      fixedHeader.value = finalDefaults.fixedHeader;
      showBreadcrumb.value = finalDefaults.showBreadcrumb;
      showBreadcrumbIcon.value = finalDefaults.showBreadcrumbIcon;
      showTagsView.value = finalDefaults.showTagsView;
      tagsViewHeight.value = finalDefaults.tagsViewHeight;
      tagsViewStyle.value = finalDefaults.tagsViewStyle;
      showFooter.value = finalDefaults.showFooter;
      sidebarWidth.value = finalDefaults.sidebarWidth;
      sidebarCollapsedWidth.value = finalDefaults.sidebarCollapsedWidth;
      headerHeight.value = finalDefaults.headerHeight;

      enableHotkeys.value = finalDefaults.enableHotkeys;
    };

    /**
     * 更新主题模式
     */
    const updateThemeMode = async (mode: ThemeMode) => {
      if (!ENUM_SETTINGS.themeMode.has(mode)) {
        throw new RangeError(`未知的主题模式: ${String(mode)}`);
      }
      const previousMode = themeMode.value;
      themeMode.value = mode;
      try {
        if (onThemeModeChange) {
          await onThemeModeChange(mode);
        }
      } catch (error) {
        themeMode.value = previousMode;
        throw error;
      }
    };

    /**
     * 切换侧边栏折叠状态
     */
    const toggleCollapse = () => {
      collapsed.value = !collapsed.value;
    };

    // ============ 监听器 ============

    // 监听配置变化，同步 CSS Variables
    watch(
      [
        primaryColor,
        borderRadiusValue,
        sidebarWidth,
        sidebarCollapsedWidth,
        headerHeight,
        tagsViewHeight,
      ],
      () => {
        syncCSSVariables();
      },
      { immediate: true },
    );

    // ============ 返回 ============

    return {
      // 状态
      themeMode,
      primaryColor,
      borderRadius,
      transitionType,
      enableTransition,
      layoutMode,
      menuExpandMode,
      collapsed,
      fixedHeader,
      showBreadcrumb,
      showBreadcrumbIcon,
      showTagsView,
      tagsViewHeight,
      tagsViewStyle,
      showFooter,
      sidebarWidth,
      sidebarCollapsedWidth,
      headerHeight,
      enableHotkeys,
      version,

      // 计算属性
      borderRadiusValue,
      transitionName,
      shouldEnableTransition,
      settingsState,

      // 方法
      syncCSSVariables,
      applyPreset,
      resetSettings,
      updateThemeMode,
      toggleCollapse,
    };
  });
}

/**
 * 默认的设置 Store（使用默认配置）
 */
export const useSettingsStore = createSettingsStore();

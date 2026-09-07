import { defineStore } from "pinia";
import { ref, computed, onScopeDispose } from "vue";
import type {
  SettingsState,
  ThemePreset,
  LayoutMode,
  MenuExpandMode,
  TransitionType,
  BorderRadiusSize,
  TagsViewStyle,
  SettingsStoreOptions,
  ThemeMode,
} from "../types";
import {
  DEFAULT_SETTINGS,
  BORDER_RADIUS_MAP,
  TRANSITION_MAP,
} from "../constants";
export { adjustColor, sanitizeSettingsPatch } from "../core/settings";
import {
  assertLayoutSettingsRelationships,
  sanitizeSettingsPatch,
} from "../core/settings";
import { bindLayoutCssVariables } from "../composables/useLayoutCssVariables";

/**
 * 创建设置管理 Store
 * @param options - 配置选项
 */
export function createSettingsStore(options: SettingsStoreOptions = {}) {
  const {
    id = "settings",
    defaults = {},
    onThemeModeChange,
    syncCssVariables = true,
  } = options;
  if (typeof id !== "string" || !id.trim()) {
    throw new RangeError("Settings store id 不能为空");
  }

  // 合并默认配置
  const finalDefaults = {
    ...DEFAULT_SETTINGS,
    ...sanitizeSettingsPatch(defaults),
  };
  assertLayoutSettingsRelationships(finalDefaults);
  const resolvedDefaults = Object.freeze({ ...finalDefaults });

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

    /** 是否启用过渡动画 */
    const shouldEnableTransition = computed(
      () => enableTransition.value && transitionType.value !== "none",
    );

    /** 获取实际生效的过渡动画名称 */
    const transitionName = computed(() =>
      shouldEnableTransition.value ? TRANSITION_MAP[transitionType.value] : "",
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

    const cssVariableBinding = syncCssVariables
      ? bindLayoutCssVariables(
          {
            primaryColor,
            borderRadiusValue,
            sidebarWidth,
            sidebarCollapsedWidth,
            headerHeight,
            tagsViewHeight,
          },
          { legacyAliases: true },
        )
      : undefined;
    if (cssVariableBinding) onScopeDispose(cssVariableBinding.dispose);

    /** 立即把当前设置同步到已配置的 CSS 变量作用域。 */
    const syncCSSVariables = () => cssVariableBinding?.sync();

    /**
     * 应用主题预设方案
     * 注意：只应用颜色配置，不改变布局模式和主题模式
     */
    const applyPreset = async (preset: ThemePreset) => {
      const safePreset = sanitizeSettingsPatch({
        primaryColor: preset.primaryColor,
        ...preset.settings,
      });

      // 完整校验成功后再修改状态，避免部分应用。
      primaryColor.value = safePreset.primaryColor!;

      // 应用其他细节配置（如果存在）
      if (safePreset.borderRadius) borderRadius.value = safePreset.borderRadius;
      if (safePreset.transitionType)
        transitionType.value = safePreset.transitionType;
      if (safePreset.showBreadcrumb !== undefined)
        showBreadcrumb.value = safePreset.showBreadcrumb;
      if (safePreset.showTagsView !== undefined)
        showTagsView.value = safePreset.showTagsView;
      if (safePreset.tagsViewStyle) {
        tagsViewStyle.value = safePreset.tagsViewStyle;
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
      version.value = finalDefaults.version;
    };

    /**
     * 更新主题模式
     */
    const updateThemeMode = async (mode: ThemeMode) => {
      sanitizeSettingsPatch({ themeMode: mode });
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

    // ============ 返回 ============

    return {
      /** 当前 Store 实例实际使用的默认值。 */
      defaults: resolvedDefaults,

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

/** 默认设置 Store 实例类型，供组件注入或显式传入。 */
export type SettingsStoreInstance = ReturnType<typeof useSettingsStore>;

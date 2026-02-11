/**
 * @robot-admin/layout
 *
 * 布局和设置管理系统 v2.1
 * 提供智能布局容器、6 种布局骨架、设置配置、主题预设等功能
 *
 * 架构：智能容器模式
 * - C_LayoutContainer 根据 layoutMode 自动切换骨架，内置品牌/菜单默认实现
 * - 消费方仅需提供业务组件（垂直菜单、头部、标签页、页脚）
 * - 所有 slot 均可覆盖默认实现
 */

// ============ 主入口组件（C_ 前缀 = 对外暴露） ============
export { default as C_LayoutContainer } from "./components/C_LayoutContainer/index.vue";

// ============ 配置组件 ============
export { default as SettingsDrawer } from "./components/SettingsDrawer/index.vue";

// ============ 内置子组件（无 C_ 前缀，高级用户可单独使用） ============
export { default as BrandLogo } from "./components/BrandLogo/index.vue";
export { default as IconMenu } from "./components/IconMenu/index.vue";
export { default as FloatingMenu } from "./components/FloatingMenu/index.vue";
export { default as SideMenu } from "./components/SideMenu/index.vue";
export { default as DrawerMenu } from "./components/DrawerMenu/index.vue";
export { default as MenuTrigger } from "./components/MenuTrigger/index.vue";
export { default as ResponsiveMenu } from "./components/ResponsiveMenu/index.vue";

// ============ 骨架组件（内部使用，高级用户可单独导入） ============
export { default as SideLayout } from "./components/SideLayout/index.vue";
export { default as TopLayout } from "./components/TopLayout/index.vue";
export { default as MixLayout } from "./components/MixLayout/index.vue";
export { default as MixTopLayout } from "./components/MixTopLayout/index.vue";
export { default as ReverseHorizontalMixLayout } from "./components/ReverseHorizontalMixLayout/index.vue";
export { default as CardLayout } from "./components/CardLayout/index.vue";

// ============ 初始化 ============
export { setupLayout } from "./setup";

// ============ Store ============
export { createSettingsStore, useSettingsStore } from "./stores/settings";

// ============ Utils ============
export { adjustColor } from "./stores/settings";

// ============ Composables ============
export { useLayoutCache } from "./composables/useLayoutCache";
export type { LayoutCacheOptions } from "./composables/useLayoutCache";
export {
  useLayoutContext,
  LAYOUT_CONTEXT_KEY,
  DEFAULT_BRAND_CONFIG,
  DRAWER_HANDLER_KEY,
} from "./composables/useLayoutContext";
export type {
  LayoutContext,
  LayoutBrandConfig,
  DrawerHandlers,
} from "./composables/useLayoutContext";
export { useMenuSplit } from "./composables/useMenuSplit";
export type {
  UseMenuSplitOptions,
  UseMenuSplitReturn,
} from "./composables/useMenuSplit";

// ============ Types ============
export type {
  LayoutMode,
  TransitionType,
  BorderRadiusSize,
  TagsViewStyle,
  SettingsState,
  ThemePreset,
  SettingsStoreOptions,
  LayoutInfo,
  PresetColor,
  MenuOptions,
  MenuTag,
  MenuItemType,
} from "./types";

// ============ Constants ============
export {
  PRESET_COLORS,
  THEME_PRESETS,
  LAYOUT_MODES,
  BORDER_RADIUS_MAP,
  TRANSITION_MAP,
  DEFAULT_SETTINGS,
  COLOR_SWATCHES,
} from "./constants";

// ============ 向后兼容别名（deprecated，下个大版本移除） ============
export { default as C_SideLayout } from "./components/SideLayout/index.vue";
export { default as C_TopLayout } from "./components/TopLayout/index.vue";
export { default as C_MixLayout } from "./components/MixLayout/index.vue";
export { default as C_MixTopLayout } from "./components/MixTopLayout/index.vue";
export { default as C_ReverseHorizontalMixLayout } from "./components/ReverseHorizontalMixLayout/index.vue";
export { default as C_CardLayout } from "./components/CardLayout/index.vue";

/**
 * Vue 运行时入口。
 *
 * 提供布局上下文、Store 与路由相关 composable，不导入任何 UI 组件库。
 * Naive UI 与 Element Plus 项目都可以复用这一层。
 */
export * from "../core";

export { setupLayout } from "../setup";
export { createSettingsStore, useSettingsStore } from "../stores/settings";
export type { SettingsStoreInstance } from "../stores/settings";
export { normalizeLayoutMenus } from "../utils/menu";
export type { LayoutMenuItem } from "../utils/menu";

export {
  DEFAULT_BRAND_CONFIG,
  DRAWER_HANDLER_KEY,
  LAYOUT_CONTEXT_KEY,
  LAYOUT_SETTINGS_KEY,
  MENU_COLLAPSE_KEY,
  provideLayoutContext,
  useLayoutContext,
} from "../composables/useLayoutContext";
export type {
  DrawerHandlers,
  LayoutBrandConfig,
  LayoutContext,
  MenuCollapseHandlers,
} from "../composables/useLayoutContext";

export {
  createLayoutContext,
  provideLayout,
} from "../composables/createLayoutContext";
export type {
  CreateLayoutContextOptions,
  LayoutSettingsSource,
} from "../composables/createLayoutContext";

export {
  shouldCacheRoute,
  useLayoutCache,
} from "../composables/useLayoutCache";
export type { LayoutCacheOptions } from "../composables/useLayoutCache";
export { isPathSegmentPrefix, useMenuSplit } from "../composables/useMenuSplit";
export type {
  UseMenuSplitOptions,
  UseMenuSplitReturn,
} from "../composables/useMenuSplit";
export {
  calculateVisibleMenuCount,
  estimateMenuItemWidth,
  useResponsiveMenu,
} from "../composables/useResponsiveMenu";
export type { UseResponsiveMenuOptions } from "../composables/useResponsiveMenu";
export { useLayoutIcon } from "../composables/useLayoutIcon";
export {
  LayoutActionUnavailableError,
  useSettingsController,
} from "../composables/useSettingsController";
export {
  bindLayoutCssVariables,
  useLayoutCssVariables,
} from "../composables/useLayoutCssVariables";
export type {
  LayoutCssVariableBinding,
  LayoutCssVariableOptions,
  LayoutCssVariableSource,
  LayoutCssVariableTarget,
  LayoutStyleDeclaration,
} from "../composables/useLayoutCssVariables";
export type {
  ExportedLayoutSettings,
  SettingsControllerOptions,
} from "../composables/useSettingsController";

export type {
  MenuItemType,
  MenuMeta,
  MenuOptions,
  MenuTag,
} from "../types/menu";

import {
  computed,
  toValue,
  type Component,
  type MaybeRefOrGetter,
} from "vue";
import type { MenuOptions } from "../types/menu";
import type { SettingsStoreInstance } from "../stores/settings";
import {
  DEFAULT_BRAND_CONFIG,
  provideLayoutContext,
  type LayoutBrandConfig,
  type LayoutContext,
} from "./useLayoutContext";

/** 创建标准布局上下文所需的最小宿主适配。 */
export interface CreateLayoutContextOptions {
  /** 布局设置 Store，可使用默认 Store 或 createSettingsStore() 创建的实例。 */
  settings: SettingsStoreInstance;
  /** 宿主菜单；支持普通值、Ref、ComputedRef 或 getter。 */
  menus: MaybeRefOrGetter<MenuOptions[]>;
  /** 宿主暗色状态；支持普通值、Ref、ComputedRef 或 getter。 */
  isDark: MaybeRefOrGetter<boolean>;
  /** 品牌信息，未提供的字段使用包内安全默认值。 */
  brand?: LayoutBrandConfig;
  /** 布局内部用于渲染菜单图标的宿主组件。 */
  iconComponent?: Component;
}

/**
 * 将最小宿主输入转换为完整 LayoutContext。
 *
 * 保留底层 LayoutContext 作为高级扩展协议，同时避免普通接入重复桥接 Store 字段。
 */
export function createLayoutContext(
  options: CreateLayoutContextOptions,
): LayoutContext {
  const { settings } = options;

  return {
    menus: computed(() => toValue(options.menus)),
    isDark: computed(() => toValue(options.isDark)),
    layoutMode: computed(() => settings.layoutMode),
    collapsed: computed({
      get: () => settings.collapsed,
      set: (value: boolean) => {
        settings.collapsed = value;
      },
    }),
    menuExpandMode: computed(() => settings.menuExpandMode),
    sidebarWidth: computed(() => settings.sidebarWidth),
    sidebarCollapsedWidth: computed(() => settings.sidebarCollapsedWidth),
    showFooter: computed(() => settings.showFooter),
    showTagsView: computed(() => settings.showTagsView),
    tagsViewHeight: computed(() => settings.tagsViewHeight),
    headerHeight: computed(() => settings.headerHeight),
    transitionName: computed(() => settings.transitionName),
    showBreadcrumb: computed(() => settings.showBreadcrumb),
    showBreadcrumbIcon: computed(() => settings.showBreadcrumbIcon),
    fixedHeader: computed(() => settings.fixedHeader),
    brand: { ...DEFAULT_BRAND_CONFIG, ...options.brand },
    iconComponent: options.iconComponent,
  };
}

/** 在组件 setup 中创建并提供标准布局上下文。 */
export function provideLayout(
  options: CreateLayoutContextOptions,
): LayoutContext {
  return provideLayoutContext(createLayoutContext(options));
}

/**
 * @robot-admin/layout
 *
 * 布局上下文 - Provide/Inject 机制
 * 消费方通过 provide 注入数据，骨架组件通过 inject 读取
 * 实现布局骨架与业务数据的完全解耦
 */

import type { InjectionKey, ComputedRef, Component } from "vue";
import { inject } from "vue";
import type { MenuOptions } from "../types/menu";
import type { LayoutMode } from "../types";

/**
 * 品牌配置
 */
export interface LayoutBrandConfig {
  /** 品牌名称，如 'Robot Admin' */
  name?: string;
  /** 品牌副标题，如 '机器人管理系统' */
  subtitle?: string;
  /** Logo 地址（图片或视频） */
  logoSrc?: string;
  /** Logo 类型 */
  logoType?: "video" | "image";
  /** Logo 尺寸 */
  logoSize?: number;
  /** 首页路径，默认 '/home' */
  homePath?: string;
  /** 页脚版权文本 */
  copyright?: string;
}

/**
 * 布局上下文数据接口
 * 骨架组件通过 inject 获取这些数据
 */
export interface LayoutContext {
  // ============ 菜单数据 ============
  /** 菜单列表数据 */
  menus: ComputedRef<MenuOptions[]>;

  // ============ 主题状态 ============
  /** 是否为暗色模式 */
  isDark: ComputedRef<boolean>;

  // ============ 布局配置（来自 settings store） ============
  /** 当前布局模式 */
  layoutMode: ComputedRef<LayoutMode>;
  /** 侧边栏宽度 (px) */
  sidebarWidth: ComputedRef<number>;
  /** 侧边栏折叠后宽度 (px) */
  sidebarCollapsedWidth: ComputedRef<number>;
  /** 是否显示页脚 */
  showFooter: ComputedRef<boolean>;
  /** 是否显示标签页 */
  showTagsView: ComputedRef<boolean>;
  /** 标签页高度 (px) */
  tagsViewHeight: ComputedRef<number>;
  /** 头部高度 (px) */
  headerHeight: ComputedRef<number>;
  /** 过渡动画名称 */
  transitionName: ComputedRef<string>;
  /** 是否显示面包屑 */
  showBreadcrumb: ComputedRef<boolean>;
  /** 是否显示面包屑图标 */
  showBreadcrumbIcon: ComputedRef<boolean>;
  /** 是否固定头部 */
  fixedHeader: ComputedRef<boolean>;

  // ============ 品牌配置 ============
  /** 品牌信息 */
  brand: LayoutBrandConfig;

  // ============ 可选：图标组件 ============
  /**
   * 自定义图标组件（如 @iconify/vue 的 Icon 组件）
   * 用于布局内部组件渲染菜单图标
   * 组件需接受 name (string) 和 size (number) 两个 props
   * 如果不提供，将使用 CSS class 渲染图标
   */
  iconComponent?: Component;
}

/**
 * 布局上下文 Injection Key
 */
export const LAYOUT_CONTEXT_KEY: InjectionKey<LayoutContext> =
  Symbol("layout-context");

/**
 * 抽屉菜单统一控制器
 * 解决 MenuTrigger 与 DrawerMenu 各自拥有独立定时器导致的
 * "鼠标从 trigger 移到 drawer 过程中 drawer 被关闭"问题
 */
export interface DrawerHandlers {
  /** 显示抽屉并取消所有待执行的隐藏操作 */
  show: () => void;
  /** 启动延迟隐藏（300ms） */
  startHide: () => void;
  /** 立即隐藏抽屉（如导航跳转后） */
  hide: () => void;
}

/**
 * 抽屉菜单控制器 Injection Key
 */
export const DRAWER_HANDLER_KEY: InjectionKey<DrawerHandlers> =
  Symbol("drawer-handlers");

/**
 * 在骨架组件中获取布局上下文
 *
 * @throws 如果没有 provide LayoutContext 会抛出错误
 *
 * @example
 * ```vue
 * <script setup>
 * // 在包的骨架组件内部使用
 * const ctx = useLayoutContext()
 * const menus = ctx.menus
 * const isDark = ctx.isDark
 * </script>
 * ```
 */
export function useLayoutContext(): LayoutContext {
  const ctx = inject(LAYOUT_CONTEXT_KEY);
  if (!ctx) {
    throw new Error(
      "[Layout] LayoutContext not provided. " +
        "请在上层组件中使用 provide(LAYOUT_CONTEXT_KEY, ...) 注入布局数据。",
    );
  }
  return ctx;
}

/**
 * 默认品牌配置
 */
export const DEFAULT_BRAND_CONFIG: Required<LayoutBrandConfig> = {
  name: "Admin",
  subtitle: "",
  logoSrc: "",
  logoType: "image",
  logoSize: 36,
  homePath: "/home",
  copyright: "",
};

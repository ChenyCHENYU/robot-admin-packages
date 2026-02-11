/**
 * @robot-admin/layout
 *
 * 菜单拆分 Composable - 通用的一级/二级菜单拆分逻辑
 * 用于 Mix / MixTop / ReverseHorizontalMix 等需要菜单拆分的布局
 */

import {
  ref,
  computed,
  watch,
  onMounted,
  toValue,
  type ComputedRef,
  type Ref,
  type MaybeRefOrGetter,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import type { MenuOptions } from "../types/menu";

export interface UseMenuSplitOptions {
  /** 菜单数据（响应式） */
  menus: ComputedRef<MenuOptions[]>;
  /** 是否使用悬浮式二级菜单（MixLayout 的 toggle 模式） */
  floatingSecondMenu?: MaybeRefOrGetter<boolean>;
}

export interface UseMenuSplitReturn {
  /** 当前激活的一级菜单路径 */
  activeFirstMenu: Ref<string>;
  /** 当前激活的一级菜单完整数据 */
  activeFirstMenuItem: ComputedRef<MenuOptions | undefined>;
  /** 当前一级菜单对应的二级菜单列表 */
  currentSecondMenus: ComputedRef<MenuOptions[]>;
  /** 悬浮的菜单项（MixLayout 使用） */
  hoveredMenuItem: Ref<MenuOptions | null>;
  /** 是否显示悬浮二级菜单（MixLayout 使用） */
  showSecondMenu: Ref<boolean>;
  /** 处理一级菜单点击 */
  handleFirstMenuClick: (item: MenuOptions) => void;
  /** 处理二级菜单点击 */
  handleSecondMenuClick: (item: MenuOptions) => void;
  /** 检查路由是否匹配菜单项 */
  isMenuItemActive: (menuPath: string | undefined) => boolean;
}

/**
 * 菜单拆分 Composable
 *
 * 提供一级/二级菜单拆分状态管理、路由自动匹配、菜单点击处理。
 * 供 MixLayout / MixTopLayout / ReverseHorizontalMixLayout 共用。
 *
 * @example
 * ```ts
 * const menuSplit = useMenuSplit({
 *   menus: ctx.menus,
 *   floatingSecondMenu: computed(() => layoutMode.value === 'mix'),
 * })
 * ```
 */
export function useMenuSplit(options: UseMenuSplitOptions): UseMenuSplitReturn {
  const { menus, floatingSecondMenu = false } = options;
  const route = useRoute();
  const router = useRouter();

  const activeFirstMenu = ref<string>("");
  const hoveredMenuItem = ref<MenuOptions | null>(null);
  const showSecondMenu = ref(false);

  // ============ 路径匹配 ============

  const normalizePath = (path: string) =>
    path.startsWith("/") ? path : `/${path}`;

  const isMenuItemActive = (menuPath: string | undefined): boolean => {
    if (!menuPath) return false;
    const currentPath = route.path;
    if (currentPath === menuPath) return true;
    const normalizedMenuPath = normalizePath(menuPath);
    const normalizedCurrentPath = normalizePath(currentPath);
    if (normalizedCurrentPath === normalizedMenuPath) return true;
    return normalizedCurrentPath.includes(`/${menuPath}`);
  };

  // ============ 查找一级菜单 ============

  const findActiveTopMenu = (items: MenuOptions[]): MenuOptions | null => {
    for (const item of items) {
      if (isMenuItemActive(item.path)) return item;
      if (item.children?.length) {
        const found = findActiveTopMenu(item.children);
        if (found) return item;
      }
    }
    return null;
  };

  // ============ 计算属性 ============

  const activeFirstMenuItem = computed(() =>
    menus.value.find((item) => item.path === activeFirstMenu.value),
  );

  const currentSecondMenus = computed(
    () => activeFirstMenuItem.value?.children || [],
  );

  // ============ 交互处理 ============

  const handleFirstMenuClick = (item: MenuOptions) => {
    activeFirstMenu.value = item.path || "";

    if (toValue(floatingSecondMenu)) {
      // MixLayout: toggle 悬浮二级菜单
      if (item.children && item.children.length > 0) {
        if (showSecondMenu.value && hoveredMenuItem.value?.path === item.path) {
          showSecondMenu.value = false;
          hoveredMenuItem.value = null;
        } else {
          hoveredMenuItem.value = item;
          showSecondMenu.value = true;
        }
      } else {
        showSecondMenu.value = false;
        hoveredMenuItem.value = null;
        if (item.path) router.push(item.path);
      }
    } else {
      // MixTop / Reverse: 直接切换
      if (!item.children || item.children.length === 0) {
        if (item.path) router.push(item.path);
      }
    }
  };

  const handleSecondMenuClick = (item: MenuOptions) => {
    if (item.path) router.push(item.path);
  };

  // ============ 路由自动匹配 ============

  const updateActiveMenuByRoute = () => {
    const menuList = menus.value;
    const matchedFirstMenu = findActiveTopMenu(menuList);
    if (matchedFirstMenu) {
      activeFirstMenu.value = matchedFirstMenu.path || "";
    } else if (menuList.length > 0 && !activeFirstMenu.value) {
      activeFirstMenu.value = menuList[0].path || "";
    }
  };

  watch(
    () => route.path,
    () => updateActiveMenuByRoute(),
    { immediate: true },
  );

  watch(
    menus,
    (newMenus) => {
      if (newMenus && newMenus.length > 0) updateActiveMenuByRoute();
    },
    { immediate: true },
  );

  onMounted(() => updateActiveMenuByRoute());

  return {
    activeFirstMenu,
    activeFirstMenuItem,
    currentSecondMenus,
    hoveredMenuItem,
    showSecondMenu,
    handleFirstMenuClick,
    handleSecondMenuClick,
    isMenuItemActive,
  };
}

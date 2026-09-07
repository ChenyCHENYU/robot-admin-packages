import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from "vue";
import type { MenuOptions } from "../types/menu";

/** 响应式菜单测量选项。 */
export interface UseResponsiveMenuOptions {
  data: MaybeRefOrGetter<readonly MenuOptions[]>;
  /** 溢出菜单按钮和安全间距占用的宽度，默认 95px。 */
  overflowReserve?: number;
  /** ResizeObserver 触发后的防抖时间，默认 100ms。 */
  debounceMs?: number;
}

/** 按现有菜单字号与间距估算单项宽度。 */
export function estimateMenuItemWidth(item: MenuOptions): number {
  const title = item.meta?.title || item.label || item.name || "";
  let textWidth = 0;

  for (const character of title) {
    const code = character.charCodeAt(0);
    const isWide =
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x3000 && code <= 0x303f) ||
      (code >= 0xff00 && code <= 0xffef) ||
      (code >= 0x3040 && code <= 0x309f) ||
      (code >= 0x30a0 && code <= 0x30ff);
    textWidth += isWide ? 15 : 8;
  }

  const iconWidth = item.meta?.icon || item.icon ? 26 : 0;
  return textWidth + iconWidth + 36 + 8 + 8;
}

/** 计算指定容器内可直接展示的菜单项数量。 */
export function calculateVisibleMenuCount(
  items: readonly MenuOptions[],
  containerWidth: number,
  overflowReserve = 95,
): number {
  if (items.length === 0 || containerWidth <= 0) return 0;

  const totalWidth = items.reduce(
    (total, item) => total + estimateMenuItemWidth(item),
    0,
  );
  const safetyWidth = 15;
  if (totalWidth + safetyWidth <= containerWidth) return items.length;

  const availableWidth = Math.max(0, containerWidth - overflowReserve);
  let usedWidth = 0;
  let count = 0;

  for (const item of items) {
    const itemWidth = estimateMenuItemWidth(item);
    if (usedWidth + itemWidth > availableWidth) break;
    usedWidth += itemWidth;
    count += 1;
  }

  // 与既有交互一致：有菜单时至少保留一个直接可见项。
  return Math.max(count, 1);
}

/**
 * UI 框架无关的响应式菜单测量逻辑。
 * Naive UI 和 Element Plus 适配器只负责把 visible/hidden 数据渲染出来。
 */
export function useResponsiveMenu(options: UseResponsiveMenuOptions) {
  const normalizedDebounce =
    Number.isFinite(options.debounceMs) && (options.debounceMs ?? 0) >= 0
      ? Math.floor(options.debounceMs ?? 100)
      : 100;
  const normalizedReserve =
    Number.isFinite(options.overflowReserve) &&
    (options.overflowReserve ?? 0) >= 0
      ? (options.overflowReserve ?? 95)
      : 95;

  const containerRef = ref<HTMLElement>();
  const menuData = computed(() => [...toValue(options.data)]);
  const visibleItems = ref<MenuOptions[]>([]);
  const hiddenItems = ref<MenuOptions[]>([]);

  const refresh = () => {
    const containerWidth = containerRef.value?.offsetWidth ?? 0;
    if (containerWidth <= 0 || menuData.value.length === 0) {
      visibleItems.value = [];
      hiddenItems.value = [];
      return;
    }

    const count = calculateVisibleMenuCount(
      menuData.value,
      containerWidth,
      normalizedReserve,
    );
    visibleItems.value = menuData.value.slice(0, count);
    hiddenItems.value = menuData.value.slice(count);
  };

  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  const scheduleRefresh = () => {
    if (resizeTimer !== undefined) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(refresh, normalizedDebounce);
  };

  let resizeObserver: ResizeObserver | undefined;
  onMounted(() => {
    void nextTick(refresh);
    if (containerRef.value && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(scheduleRefresh);
      resizeObserver.observe(containerRef.value);
    } else if (typeof window !== "undefined") {
      window.addEventListener("resize", scheduleRefresh, { passive: true });
    }
  });

  onUnmounted(() => {
    resizeObserver?.disconnect();
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", scheduleRefresh);
    }
    if (resizeTimer !== undefined) clearTimeout(resizeTimer);
  });

  watch(
    () => toValue(options.data),
    () => void nextTick(refresh),
    { deep: true },
  );

  return {
    containerRef,
    hiddenItems,
    refresh,
    visibleItems,
  };
}

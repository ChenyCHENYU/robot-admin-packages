/**
 * @robot-admin/layout
 *
 * 统一的 KeepAlive 缓存管理
 * 从主项目提取的通用 composable，零业务依赖
 */

import { onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import type { RouteLocationNormalizedLoaded } from "vue-router";

interface LayoutCacheDebugWindow extends Window {
  __clearCache__?: () => void;
  __removeCache__?: (name: string) => void;
  __getCachedViews__?: () => string[];
}

/** KeepAlive 缓存选项 */
export interface LayoutCacheOptions {
  /** 最大缓存数量，默认 20 */
  maxCacheCount?: number;
  /** 是否输出缓存调试日志，默认 false */
  enableDevLog?: boolean;
  /** 是否暴露调试方法到 window，默认 false */
  exposeToWindow?: boolean;
}

/** KeepAlive 仅接受具名组件，并由路由 meta.keepAlive 明确开启。 */
export function shouldCacheRoute(
  route: Pick<RouteLocationNormalizedLoaded, "name" | "meta">,
): route is Pick<RouteLocationNormalizedLoaded, "name" | "meta"> & {
  name: string;
} {
  return typeof route.name === "string" && route.meta.keepAlive === true;
}

/**
 * 统一的 KeepAlive 缓存管理 composable
 *
 * @param options - 缓存配置选项
 * @returns 缓存视图列表和管理方法
 *
 * @example
 * ```vue
 * <script setup>
 * import { useLayoutCache } from '@robot-admin/layout'
 *
 * const { cachedViews, maxCacheCount } = useLayoutCache({ maxCacheCount: 30 })
 * </script>
 *
 * <template>
 *   <KeepAlive :include="cachedViews" :max="maxCacheCount">
 *     <RouterView />
 *   </KeepAlive>
 * </template>
 * ```
 */
export function useLayoutCache(options: LayoutCacheOptions = {}) {
  const {
    maxCacheCount: maxCount = 20,
    enableDevLog = false,
    exposeToWindow: expose = false,
  } = options;

  const route = useRoute();
  const normalizedMaxCount =
    Number.isFinite(maxCount) && maxCount > 0 ? Math.floor(maxCount) : 20;
  const cachedViews = ref<string[]>([]);
  const maxCacheCount = ref(normalizedMaxCount);

  /** 添加缓存 */
  const addCache = (name: string) => {
    if (name && !cachedViews.value.includes(name)) {
      cachedViews.value.push(name);

      // 控制缓存数量
      if (cachedViews.value.length > maxCacheCount.value) {
        cachedViews.value.shift();
      }

      if (enableDevLog) {
        console.debug(
          `[KeepAlive] ✅ 缓存: ${name} (${cachedViews.value.length}/${maxCacheCount.value})`,
        );
      }
    }
  };

  /** 移除缓存 */
  const removeCache = (name: string) => {
    const index = cachedViews.value.indexOf(name);
    if (index > -1) {
      cachedViews.value.splice(index, 1);
      if (enableDevLog) {
        console.debug(`[KeepAlive] ❌ 移除: ${name}`);
      }
    }
  };

  /** 清空所有缓存 */
  const clearAllCache = () => {
    cachedViews.value = [];
    if (enableDevLog) {
      console.debug("[KeepAlive] 🗑️ 清空所有缓存");
    }
  };

  // 暴露调试方法到 window
  const getCachedViews = () => cachedViews.value;
  if (expose && typeof window !== "undefined") {
    const debugWindow = window as LayoutCacheDebugWindow;
    debugWindow.__clearCache__ = clearAllCache;
    debugWindow.__removeCache__ = removeCache;
    debugWindow.__getCachedViews__ = getCachedViews;

    onUnmounted(() => {
      if (debugWindow.__clearCache__ === clearAllCache) {
        delete debugWindow.__clearCache__;
      }
      if (debugWindow.__removeCache__ === removeCache) {
        delete debugWindow.__removeCache__;
      }
      if (debugWindow.__getCachedViews__ === getCachedViews) {
        delete debugWindow.__getCachedViews__;
      }
    });
  }

  // 监听路由变化，动态管理缓存
  watch(
    () => [route.name, route.meta.keepAlive] as const,
    () => {
      if (shouldCacheRoute(route)) addCache(route.name);
    },
    { immediate: true },
  );

  return {
    cachedViews,
    maxCacheCount,
    addCache,
    removeCache,
    clearAllCache,
  };
}

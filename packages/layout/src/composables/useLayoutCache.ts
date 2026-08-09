/**
 * @robot-admin/layout
 *
 * 统一的 KeepAlive 缓存管理
 * 从主项目提取的通用 composable，零业务依赖
 */

import { onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

/** KeepAlive 缓存选项 */
export interface LayoutCacheOptions {
  /** 最大缓存数量，默认 20 */
  maxCacheCount?: number;
  /** 是否输出缓存调试日志，默认 false */
  enableDevLog?: boolean;
  /** 是否暴露调试方法到 window，默认 false */
  exposeToWindow?: boolean;
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
  const cachedViews = ref<string[]>([]);
  const maxCacheCount = ref(maxCount);

  /**
   * 判断页面是否应该被缓存
   * 极简策略：只有明确配置 meta.keepAlive = true 才缓存
   */
  const shouldCache = (routeName: string | symbol | undefined | null) => {
    if (!routeName || typeof routeName !== "string") return false;
    return route.meta?.keepAlive === true;
  };

  /** 添加缓存 */
  const addCache = (name: string) => {
    if (!cachedViews.value.includes(name) && shouldCache(name)) {
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
    (window as any).__clearCache__ = clearAllCache;
    (window as any).__removeCache__ = removeCache;
    (window as any).__getCachedViews__ = getCachedViews;

    onUnmounted(() => {
      if ((window as any).__clearCache__ === clearAllCache) {
        delete (window as any).__clearCache__;
      }
      if ((window as any).__removeCache__ === removeCache) {
        delete (window as any).__removeCache__;
      }
      if ((window as any).__getCachedViews__ === getCachedViews) {
        delete (window as any).__getCachedViews__;
      }
    });
  }

  // 监听路由变化，动态管理缓存
  watch(
    () => route.name,
    (newName) => {
      if (newName && typeof newName === "string") {
        addCache(newName);
      }
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

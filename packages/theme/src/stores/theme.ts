import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { ThemeMode, ThemeStoreOptions } from "../types";
import { DEFAULT_THEME_OPTIONS } from "../constants";
import { useViewTransition } from "../composables/useViewTransition";

/**
 * 创建主题管理 Store
 * @param options - 配置选项
 */
export function createThemeStore(options: ThemeStoreOptions = {}) {
  const {
    defaultMode = DEFAULT_THEME_OPTIONS.defaultMode,
    storageKey = DEFAULT_THEME_OPTIONS.storageKey,
    enableTransition = DEFAULT_THEME_OPTIONS.enableTransition,
    transitionDuration = DEFAULT_THEME_OPTIONS.transitionDuration,
  } = options;

  return defineStore("theme", () => {
    // ============ 初始化 ============

    // 获取系统主题偏好
    const mediaQuery =
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;

    // 从 localStorage 读取保存的模式
    const savedMode =
      typeof window !== "undefined"
        ? (localStorage.getItem(storageKey) as ThemeMode)
        : null;

    // ============ 状态定义 ============

    /** 当前主题模式 */
    const mode = ref<ThemeMode>(savedMode || defaultMode);

    /** 系统是否为暗色模式 */
    const systemIsDark = ref(mediaQuery?.matches ?? false);

    // ============ 计算属性 ============

    /** 当前是否为暗色模式 */
    const isDark = computed(() => {
      if (mode.value === "system") {
        return systemIsDark.value;
      }
      return mode.value === "dark";
    });

    // ============ 内部方法 ============

    /**
     * 同步主题属性到 HTML 元素
     */
    const syncThemeAttr = () => {
      if (typeof document !== "undefined") {
        const themeValue = isDark.value ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", themeValue);
      }
    };

    // ============ Actions ============

    /**
     * 初始化主题系统
     */
    const init = () => {
      // 确保状态同步
      if (mediaQuery) {
        systemIsDark.value = mediaQuery.matches;
      }

      // 同步 data-theme 属性到 html 元素
      syncThemeAttr();

      // 监听系统主题变化
      if (mediaQuery) {
        mediaQuery.addEventListener("change", (e) => {
          systemIsDark.value = e.matches;
          // 如果当前是 system 模式，需要更新 DOM
          if (mode.value === "system") {
            syncThemeAttr();
          }
        });
      }
    };

    /**
     * 设置主题模式
     * @param newMode - 新的主题模式
     */
    const setMode = async (newMode: ThemeMode) => {
      // 记录切换前的视觉状态
      const oldDark = isDark.value;

      // 更新状态
      mode.value = newMode;

      // 保存到 localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, newMode);
      }

      // 新的视觉状态
      const newDark = isDark.value;

      // 如果视觉效果没变化，直接同步 DOM 即可（无需动画）
      if (oldDark === newDark) {
        syncThemeAttr();
        return;
      }

      // 视觉有变化，执行过渡动画
      if (enableTransition) {
        await useViewTransition(syncThemeAttr, {
          duration: transitionDuration,
        });
      } else {
        syncThemeAttr();
      }
    };

    /**
     * 切换主题模式（在 light/dark/system 之间循环）
     */
    const toggleMode = async () => {
      const modes: ThemeMode[] = ["light", "dark", "system"];
      const currentIndex = modes.indexOf(mode.value);
      const nextIndex = (currentIndex + 1) % modes.length;
      await setMode(modes[nextIndex]);
    };

    /**
     * 切换暗色模式（仅在 light 和 dark 之间切换）
     */
    const toggleDark = async () => {
      const newMode = mode.value === "dark" ? "light" : "dark";
      await setMode(newMode);
    };

    // ============ 返回 ============

    return {
      // State
      mode,
      systemIsDark,

      // Getters
      isDark,

      // Actions
      init,
      setMode,
      toggleMode,
      toggleDark,
    };
  });
}

/**
 * 默认的主题 Store（使用默认配置）
 */
export const useThemeStore = createThemeStore();

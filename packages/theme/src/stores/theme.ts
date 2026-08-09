import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { ThemeMode, DesignStyle, ThemeStoreOptions } from "../types";
import { DEFAULT_THEME_OPTIONS, DESIGN_STYLE_CONFIGS } from "../constants";
import { useViewTransition } from "../composables/useViewTransition";

/** 合法主题模式集合（用于校验 localStorage 中的脏值） */
const VALID_THEME_MODES: ReadonlySet<ThemeMode> = new Set<ThemeMode>([
  "light",
  "dark",
  "system",
]);

/** 合法设计风格集合 */
const VALID_DESIGN_STYLES: ReadonlySet<DesignStyle> = new Set<DesignStyle>(
  Object.keys(DESIGN_STYLE_CONFIGS) as DesignStyle[],
);

/**
 * 安全读取 localStorage（兼容隐私模式 / 配额限制 / SSR）
 */
function safeGetItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * 安全写入 localStorage
 */
function safeSetItem(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 隐私模式 / 配额满 / 禁用存储时静默降级（仅在内存中保持本会话有效）
  }
}

/**
 * 创建主题管理 Store
 * @param options - 配置选项
 */
export function createThemeStore(options: ThemeStoreOptions = {}) {
  const {
    defaultMode = DEFAULT_THEME_OPTIONS.defaultMode,
    storageKey = DEFAULT_THEME_OPTIONS.storageKey,
    enableTransition = DEFAULT_THEME_OPTIONS.enableTransition,
    defaultDesignStyle = DEFAULT_THEME_OPTIONS.defaultDesignStyle,
    designStyleStorageKey = DEFAULT_THEME_OPTIONS.designStyleStorageKey,
    id = "theme",
  } = options;

  if (!VALID_THEME_MODES.has(defaultMode)) {
    throw new RangeError(`未知的默认主题模式: ${String(defaultMode)}`);
  }
  if (!VALID_DESIGN_STYLES.has(defaultDesignStyle)) {
    throw new RangeError(`未知的默认设计风格: ${String(defaultDesignStyle)}`);
  }

  return defineStore(id, () => {
    // ============ 初始化 ============

    // 从 localStorage 读取并校验保存的模式（脏值回退到默认值）
    const savedModeRaw =
      typeof window !== "undefined" ? safeGetItem(storageKey) : null;
    const savedMode =
      savedModeRaw && VALID_THEME_MODES.has(savedModeRaw as ThemeMode)
        ? (savedModeRaw as ThemeMode)
        : null;

    // ============ 状态定义 ============

    /** 当前主题模式 */
    const mode = ref<ThemeMode>(savedMode || defaultMode);

    /** 系统是否为暗色模式 */
    const systemIsDark = ref(false);

    // 从 localStorage 读取并校验保存的设计风格
    const savedDesignStyleRaw =
      typeof window !== "undefined"
        ? safeGetItem(designStyleStorageKey)
        : null;
    const savedDesignStyle =
      savedDesignStyleRaw &&
      VALID_DESIGN_STYLES.has(savedDesignStyleRaw as DesignStyle)
        ? (savedDesignStyleRaw as DesignStyle)
        : null;

    /** 当前设计风格 */
    const designStyle = ref<DesignStyle>(
      savedDesignStyle || defaultDesignStyle,
    );

    // ============ 计算属性 ============

    /** 当前是否为暗色模式 */
    const isDark = computed(() => {
      if (mode.value === "system") {
        return systemIsDark.value;
      }
      return mode.value === "dark";
    });

    /** 当前设计风格配置（只读） */
    const currentDesignStyleConfig = computed(
      () => DESIGN_STYLE_CONFIGS[designStyle.value],
    );

    // ============ 内部方法 ============

    /**
     * 同步主题属性到 HTML 元素
     */
    const syncThemeAttr = () => {
      if (typeof document !== "undefined") {
        const themeValue = isDark.value ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", themeValue);
        document.documentElement.setAttribute(
          "data-design-style",
          designStyle.value,
        );
      }
    };

    // ============ init 幂等与监听清理 ============

    let initialized = false;
    let mediaQuery: MediaQueryList | null = null;
    let mediaQueryHandler: ((e: MediaQueryListEvent) => void) | null = null;
    let mediaQueryCleanup: (() => void) | null = null;

    /**
     * 初始化主题系统（幂等：重复调用安全，监听只注册一次）
     */
    const init = () => {
      if (initialized) return;
      // 懒读取 matchMedia（避免 SSR / 旧浏览器缺失）
      if (
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function"
      ) {
        try {
          mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
          systemIsDark.value = mediaQuery.matches;

          mediaQueryHandler = (e) => {
            systemIsDark.value = e.matches;
            if (mode.value === "system") syncThemeAttr();
          };

          if (typeof mediaQuery.addEventListener === "function") {
            mediaQuery.addEventListener("change", mediaQueryHandler);
            mediaQueryCleanup = () =>
              mediaQuery?.removeEventListener("change", mediaQueryHandler!);
          } else if (typeof mediaQuery.addListener === "function") {
            mediaQuery.addListener(mediaQueryHandler);
            mediaQueryCleanup = () =>
              mediaQuery?.removeListener(mediaQueryHandler!);
          }
        } catch {
          mediaQuery = null;
          mediaQueryHandler = null;
          mediaQueryCleanup = null;
        }
      }

      syncThemeAttr();
      initialized = true;
    };

    /**
     * 销毁主题系统（移除监听、重置初始化标记），用于测试 / HMR / 显式清理
     */
    const destroy = () => {
      mediaQueryCleanup?.();
      mediaQuery = null;
      mediaQueryHandler = null;
      mediaQueryCleanup = null;
      initialized = false;
    };

    /**
     * 设置主题模式
     * @param newMode - 新的主题模式
     */
    const setMode = async (newMode: ThemeMode) => {
      if (!VALID_THEME_MODES.has(newMode)) {
        throw new RangeError(`未知的主题模式: ${String(newMode)}`);
      }

      // 记录切换前的视觉状态
      const oldDark = isDark.value;

      // 更新状态
      mode.value = newMode;

      // 保存到 localStorage
      safeSetItem(storageKey, newMode);

      // 新的视觉状态
      const newDark = isDark.value;

      // 如果视觉效果没变化，直接同步 DOM 即可（无需动画）
      if (oldDark === newDark) {
        syncThemeAttr();
        return;
      }

      // 视觉有变化，执行过渡动画
      if (enableTransition) {
        await useViewTransition(syncThemeAttr);
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

    /**
     * 设置设计风格
     * @param style - 目标设计风格
     */
    const setDesignStyle = async (style: DesignStyle) => {
      const config = DESIGN_STYLE_CONFIGS[style];
      if (!config) {
        throw new RangeError(`未知的设计风格: ${String(style)}`);
      }

      // 更新设计风格状态
      designStyle.value = style;
      safeSetItem(designStyleStorageKey, style);

      // 自动适配主题模式（例如 dark-tech 仅支持暗色）
      const resolvedVisual = isDark.value ? "dark" : "light";
      if (
        config.supportedThemeModes.length > 0 &&
        !config.supportedThemeModes.includes(resolvedVisual)
      ) {
        // 直接更新 mode，由 syncThemeAttr 一次性同步所有变更
        mode.value = config.supportedThemeModes[0];
        safeSetItem(storageKey, mode.value);
      }

      // 一次性同步所有变更到 DOM（带过渡动画）
      if (enableTransition) {
        await useViewTransition(syncThemeAttr);
      } else {
        syncThemeAttr();
      }
    };

    /**
     * 循环切换设计风格
     */
    const toggleDesignStyle = async () => {
      const styles = Object.keys(DESIGN_STYLE_CONFIGS) as DesignStyle[];
      if (styles.length === 0) return;
      const currentIndex = styles.indexOf(designStyle.value);
      const nextIndex = (currentIndex + 1) % styles.length;
      await setDesignStyle(styles[nextIndex]);
    };

    // ============ 返回 ============

    return {
      // State
      mode,
      systemIsDark,
      designStyle,

      // Getters
      isDark,
      currentDesignStyleConfig,

      // Actions
      init,
      destroy,
      setMode,
      toggleMode,
      toggleDark,
      setDesignStyle,
      toggleDesignStyle,
    };
  });
}

/**
 * 默认的主题 Store（使用默认配置）
 */
export const useThemeStore = createThemeStore();

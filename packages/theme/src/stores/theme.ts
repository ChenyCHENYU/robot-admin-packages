import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type {
  ThemeMode,
  DesignStyle,
  ResolvedThemeMode,
  ThemeStoreOptions,
} from "../types";
import { DEFAULT_THEME_OPTIONS, DESIGN_STYLE_CONFIGS } from "../constants";
import { useViewTransition } from "../composables/useViewTransition";
import {
  DESIGN_STYLES,
  THEME_MODES,
  isDesignStyle,
  isThemeMode,
  resolveThemeMode,
} from "../core/theme";

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

/** 安全删除无效的历史存储值。 */
function safeRemoveItem(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // 存储不可用时保持内存状态，不阻断主题初始化。
  }
}

/** 校验 Store 字符串选项，避免空标识和存储键冲突。 */
function assertNonEmptyOption(name: string, value: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${name} 不能为空`);
  }
}

/** 安全读取当前系统颜色偏好。 */
function readSystemIsDark(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
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

  if (!isThemeMode(defaultMode)) {
    throw new RangeError(`未知的默认主题模式: ${String(defaultMode)}`);
  }
  if (!isDesignStyle(defaultDesignStyle)) {
    throw new RangeError(`未知的默认设计风格: ${String(defaultDesignStyle)}`);
  }
  assertNonEmptyOption("id", id);
  assertNonEmptyOption("storageKey", storageKey);
  assertNonEmptyOption("designStyleStorageKey", designStyleStorageKey);
  if (storageKey === designStyleStorageKey) {
    throw new TypeError("主题模式和设计风格不能共用同一个存储键");
  }

  return defineStore(id, () => {
    // ============ 初始化 ============

    // 从 localStorage 读取并校验保存的模式（脏值回退到默认值）
    const savedModeRaw =
      typeof window !== "undefined" ? safeGetItem(storageKey) : null;
    const savedMode = isThemeMode(savedModeRaw) ? savedModeRaw : null;
    if (savedModeRaw !== null && savedMode === null) safeRemoveItem(storageKey);

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
    const savedDesignStyle = isDesignStyle(savedDesignStyleRaw)
      ? savedDesignStyleRaw
      : null;
    if (savedDesignStyleRaw !== null && savedDesignStyle === null) {
      safeRemoveItem(designStyleStorageKey);
    }

    /** 当前设计风格 */
    const designStyle = ref<DesignStyle>(
      savedDesignStyle || defaultDesignStyle,
    );

    // ============ 计算属性 ============

    /** 当前是否为暗色模式 */
    const isDark = computed(() => {
      return resolveThemeMode(mode.value, systemIsDark.value) === "dark";
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
      if (!isThemeMode(newMode)) {
        throw new RangeError(`未知的主题模式: ${String(newMode)}`);
      }

      if (!initialized && (mode.value === "system" || newMode === "system")) {
        systemIsDark.value = readSystemIsDark();
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
      const currentIndex = THEME_MODES.indexOf(mode.value);
      const nextIndex = (currentIndex + 1) % THEME_MODES.length;
      await setMode(THEME_MODES[nextIndex]);
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
      const supportedThemeModes: readonly ResolvedThemeMode[] =
        config.supportedThemeModes;

      if (!initialized && mode.value === "system") {
        systemIsDark.value = readSystemIsDark();
      }

      // 更新设计风格状态
      designStyle.value = style;
      safeSetItem(designStyleStorageKey, style);

      // 自动适配主题模式（例如 dark-tech 仅支持暗色）
      const resolvedVisual = isDark.value ? "dark" : "light";
      if (
        supportedThemeModes.length > 0 &&
        !supportedThemeModes.includes(resolvedVisual)
      ) {
        // 直接更新 mode，由 syncThemeAttr 一次性同步所有变更
        mode.value = supportedThemeModes[0];
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
      const currentIndex = DESIGN_STYLES.indexOf(designStyle.value);
      const nextIndex = (currentIndex + 1) % DESIGN_STYLES.length;
      await setDesignStyle(DESIGN_STYLES[nextIndex]);
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

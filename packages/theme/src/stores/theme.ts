import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type {
  ThemeMode,
  DesignStyle,
  ThemeErrorContext,
  ThemeErrorHandler,
  ThemeStorage,
  ThemeStoreOptions,
} from "../types";
import { DEFAULT_THEME_OPTIONS, DESIGN_STYLE_CONFIGS } from "../constants";
import { useViewTransition } from "../composables/useViewTransition";
import {
  DESIGN_STYLES,
  THEME_MODES,
  isDesignStyle,
  isThemeMode,
  resolveCompatibleThemeMode,
  resolveThemeMode,
} from "../core/theme";

/** 安全通知宿主运行时降级信息，避免诊断回调反向阻断主题。 */
function reportRuntimeError(
  handler: ThemeErrorHandler | undefined,
  error: unknown,
  context: ThemeErrorContext,
): void {
  try {
    handler?.(error, context);
  } catch {
    // 诊断回调不得影响主题可用性。
  }
}

/** 解析显式存储或浏览器 localStorage。 */
function resolveStorage(
  configuredStorage: ThemeStorage | null | undefined,
  onError: ThemeErrorHandler | undefined,
): ThemeStorage | null {
  if (configuredStorage !== undefined) return configuredStorage;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch (error) {
    reportRuntimeError(onError, error, { operation: "storage-read" });
    return null;
  }
}

/** 安全读取持久化值。 */
function safeGetItem(
  storage: ThemeStorage | null,
  key: string,
  onError: ThemeErrorHandler | undefined,
): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch (error) {
    reportRuntimeError(onError, error, { operation: "storage-read", key });
    return null;
  }
}

/** 安全写入持久化值。 */
function safeSetItem(
  storage: ThemeStorage | null,
  key: string,
  value: string,
  onError: ThemeErrorHandler | undefined,
): void {
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch (error) {
    reportRuntimeError(onError, error, { operation: "storage-write", key });
  }
}

/** 安全删除无效的历史存储值。 */
function safeRemoveItem(
  storage: ThemeStorage | null,
  key: string,
  onError: ThemeErrorHandler | undefined,
): void {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch (error) {
    reportRuntimeError(onError, error, { operation: "storage-remove", key });
  }
}

/** 校验 Store 字符串选项，避免空标识和存储键冲突。 */
function assertNonEmptyOption(name: string, value: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${name} 不能为空`);
  }
}

/** 安全读取当前系统颜色偏好。 */
function readSystemIsDark(onError?: ThemeErrorHandler): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch (error) {
    reportRuntimeError(onError, error, { operation: "system-preference" });
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
    storage: configuredStorage,
    syncAcrossTabs = DEFAULT_THEME_OPTIONS.syncAcrossTabs,
    onError,
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

    const storage = resolveStorage(configuredStorage, onError);

    // 从 localStorage 读取并校验保存的模式（脏值回退到默认值）
    const savedModeRaw = safeGetItem(storage, storageKey, onError);
    const savedMode = isThemeMode(savedModeRaw) ? savedModeRaw : null;
    if (savedModeRaw !== null && savedMode === null) {
      safeRemoveItem(storage, storageKey, onError);
    }

    // ============ 状态定义 ============

    /** 当前主题模式 */
    const mode = ref<ThemeMode>(savedMode || defaultMode);

    /** 系统是否为暗色模式 */
    const systemIsDark = ref(false);

    // 从 localStorage 读取并校验保存的设计风格
    const savedDesignStyleRaw = safeGetItem(
      storage,
      designStyleStorageKey,
      onError,
    );
    const savedDesignStyle = isDesignStyle(savedDesignStyleRaw)
      ? savedDesignStyleRaw
      : null;
    if (savedDesignStyleRaw !== null && savedDesignStyle === null) {
      safeRemoveItem(storage, designStyleStorageKey, onError);
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

    /** 根据当前设计风格约束规范化主题模式。 */
    const normalizeMode = (candidate: ThemeMode): ThemeMode =>
      resolveCompatibleThemeMode(
        candidate,
        systemIsDark.value,
        currentDesignStyleConfig.value,
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
    let storageCleanup: (() => void) | null = null;

    /** 应用其他同源页面发送的主题偏好。 */
    const handleStorageChange = (event: StorageEvent) => {
      if (event.storageArea && event.storageArea !== storage) return;
      if (event.key === null) {
        designStyle.value = defaultDesignStyle;
        if (defaultMode === "system") {
          systemIsDark.value = readSystemIsDark(onError);
        }
        mode.value = normalizeMode(defaultMode);
        syncThemeAttr();
        return;
      }
      if (event.key === storageKey) {
        const candidate = event.newValue === null ? defaultMode : event.newValue;
        if (!isThemeMode(candidate)) return;
        if (candidate === "system") {
          systemIsDark.value = readSystemIsDark(onError);
        }
        mode.value = normalizeMode(candidate);
        syncThemeAttr();
        return;
      }

      if (event.key === designStyleStorageKey) {
        const candidate =
          event.newValue === null ? defaultDesignStyle : event.newValue;
        if (!isDesignStyle(candidate)) return;
        designStyle.value = candidate;
        mode.value = normalizeMode(mode.value);
        syncThemeAttr();
      }
    };

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
            if (mode.value === "system") {
              const compatibleMode = normalizeMode(mode.value);
              if (compatibleMode !== mode.value) {
                mode.value = compatibleMode;
                safeSetItem(storage, storageKey, compatibleMode, onError);
              }
              syncThemeAttr();
            }
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
        } catch (error) {
          reportRuntimeError(onError, error, {
            operation: "system-preference",
          });
          mediaQuery = null;
          mediaQueryHandler = null;
          mediaQueryCleanup = null;
        }
      }

      // 修复历史上可能持久化出的不兼容组合，例如 dark-tech + light。
      const compatibleMode = normalizeMode(mode.value);
      if (compatibleMode !== mode.value) {
        mode.value = compatibleMode;
        safeSetItem(storage, storageKey, compatibleMode, onError);
      }

      if (
        syncAcrossTabs &&
        configuredStorage === undefined &&
        storage !== null &&
        typeof window !== "undefined" &&
        typeof window.addEventListener === "function"
      ) {
        window.addEventListener("storage", handleStorageChange);
        storageCleanup = () =>
          window.removeEventListener("storage", handleStorageChange);
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
      storageCleanup?.();
      storageCleanup = null;
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
        systemIsDark.value = readSystemIsDark(onError);
      }

      // 记录切换前的视觉状态
      const oldDark = isDark.value;

      // 更新状态
      mode.value = normalizeMode(newMode);

      // 保存到 localStorage
      safeSetItem(storage, storageKey, mode.value, onError);

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
      if (!initialized && mode.value === "system") {
        systemIsDark.value = readSystemIsDark(onError);
      }

      // 更新设计风格状态
      designStyle.value = style;
      safeSetItem(storage, designStyleStorageKey, style, onError);

      // 自动适配主题模式（例如 dark-tech 仅支持暗色）
      const compatibleMode = normalizeMode(mode.value);
      if (compatibleMode !== mode.value) {
        mode.value = compatibleMode;
        safeSetItem(storage, storageKey, mode.value, onError);
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

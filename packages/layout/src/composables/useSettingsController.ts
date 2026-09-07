import { computed, getCurrentScope, onScopeDispose, ref, watch } from "vue";
import {
  assertLayoutSettingsRelationships,
  sanitizeLayoutSettingsConfig,
  SETTINGS_CONFIG_SCHEMA_VERSION,
  type LayoutSettingsConfig,
} from "../core/settings";
import type { SettingsDrawerActions, ThemeMode, ThemePreset } from "../types";
import type { SettingsStoreInstance } from "../stores/settings";

/** 宿主没有实现可选高副作用操作。 */
export class LayoutActionUnavailableError extends Error {
  constructor(action: keyof SettingsDrawerActions) {
    super(`[Layout] Host action "${action}" is not configured.`);
    this.name = "LayoutActionUnavailableError";
  }
}

export interface SettingsControllerOptions {
  store: SettingsStoreInstance;
  actions?: SettingsDrawerActions;
  maxImportBytes?: number;
  /** 灰度/色弱 class 的作用元素；默认 document.documentElement。 */
  visualRoot?: HTMLElement | null;
  /** 水印挂载容器；默认 document.body。 */
  watermarkContainer?: HTMLElement | null;
  watermarkText?: string;
  onVisualEffectError?: (message: string) => void;
}

export interface ExportedLayoutSettings extends LayoutSettingsConfig {
  schemaVersion: typeof SETTINGS_CONFIG_SCHEMA_VERSION;
  exportTime: string;
}

const getDefaultDocument = (): Document | undefined =>
  typeof document === "undefined" ? undefined : document;

/**
 * SettingsDrawer 的 UI 框架无关控制器。
 *
 * 负责配置事务、导入导出和页面级视觉效果；Naive UI / Element Plus
 * 适配器只处理组件渲染、消息和确认框。
 * 在 Vue setup/effect scope 内会自动清理；在作用域外创建时应调用返回值的 dispose()。
 */
export function useSettingsController(options: SettingsControllerOptions) {
  const { store } = options;
  const ownerDocument =
    options.visualRoot?.ownerDocument ??
    options.watermarkContainer?.ownerDocument ??
    getDefaultDocument();
  const visualRoot = options.visualRoot ?? ownerDocument?.documentElement;
  const watermarkContainer = options.watermarkContainer ?? ownerDocument?.body;
  const maxImportBytes =
    Number.isFinite(options.maxImportBytes) && (options.maxImportBytes ?? 0) > 0
      ? Math.floor(options.maxImportBytes ?? 1024 * 1024)
      : 1024 * 1024;

  const initialGrayMode = visualRoot?.classList.contains("gray-mode") ?? false;
  const initialColorWeakMode =
    visualRoot?.classList.contains("color-weak-mode") ?? false;
  const grayMode = ref(initialGrayMode);
  const colorWeakMode = ref(initialColorWeakMode);
  const watermarkEnabled = ref(false);
  const watermarkText = ref(options.watermarkText ?? "Robot Admin");
  let watermarkElement: HTMLElement | undefined;

  const removeWatermark = () => {
    watermarkElement?.remove();
    watermarkElement = undefined;
  };

  const createWatermark = (text: string) => {
    removeWatermark();
    if (!ownerDocument || !watermarkContainer) return;

    const canvas = ownerDocument.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      options.onVisualEffectError?.("当前浏览器无法创建水印画布");
      return;
    }

    canvas.width = 200;
    canvas.height = 150;
    context.font = "14px Microsoft JhengHei";
    context.fillStyle = "rgba(120, 120, 120, 0.15)";
    context.rotate((-20 * Math.PI) / 180);
    context.fillText(text, 0, 80);

    watermarkElement = ownerDocument.createElement("div");
    watermarkElement.dataset.robotAdminLayoutWatermark = "true";
    Object.assign(watermarkElement.style, {
      backgroundImage: `url(${canvas.toDataURL()})`,
      backgroundRepeat: "repeat",
      height: "100%",
      left: "0",
      pointerEvents: "none",
      position: "fixed",
      top: "0",
      userSelect: "none",
      width: "100%",
      zIndex: "9999",
    });
    watermarkContainer.appendChild(watermarkElement);
  };

  const stopGrayMode = watch(grayMode, (value) =>
    visualRoot?.classList.toggle("gray-mode", value),
  );
  const stopColorWeakMode = watch(colorWeakMode, (value) =>
    visualRoot?.classList.toggle("color-weak-mode", value),
  );
  const stopWatermarkEnabled = watch(watermarkEnabled, (value) => {
    if (value) createWatermark(watermarkText.value);
    else removeWatermark();
  });
  const stopWatermarkText = watch(watermarkText, (value) => {
    if (watermarkEnabled.value) createWatermark(value);
  });

  const systemInfo = computed(() => {
    const view = ownerDocument?.defaultView;
    const navigatorInfo = view?.navigator;
    if (!view || !navigatorInfo) {
      return {
        browser: "Unknown",
        os: "Unknown",
        resolution: "Unknown",
        pixelRatio: "Unknown",
        language: "Unknown",
        timezone: "Unknown",
      };
    }

    const userAgent = navigatorInfo.userAgent;
    let browser = "Unknown";
    let os = "Unknown";
    if (userAgent.includes("Edg/")) browser = "Edge";
    else if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Chrome")) browser = "Chrome";
    else if (userAgent.includes("Safari")) browser = "Safari";

    if (userAgent.includes("Windows")) os = "Windows";
    else if (userAgent.includes("Mac")) os = "macOS";
    else if (userAgent.includes("Android")) os = "Android";
    else if (userAgent.includes("iOS")) os = "iOS";
    else if (userAgent.includes("Linux")) os = "Linux";

    return {
      browser,
      os,
      resolution: `${view.screen.width} × ${view.screen.height}`,
      pixelRatio: `${view.devicePixelRatio}x`,
      language: navigatorInfo.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  });

  const applyPreset = (preset: ThemePreset) => store.applyPreset(preset);
  const updateThemeMode = (mode: ThemeMode) => store.updateThemeMode(mode);

  const resetAppearance = async () => {
    await store.updateThemeMode(store.defaults.themeMode);
    store.primaryColor = store.defaults.primaryColor;
    store.borderRadius = store.defaults.borderRadius;
    store.transitionType = store.defaults.transitionType;
    store.enableTransition = store.defaults.enableTransition;
  };

  const resetLayout = () => {
    store.layoutMode = store.defaults.layoutMode;
    store.menuExpandMode = store.defaults.menuExpandMode;
    store.fixedHeader = store.defaults.fixedHeader;
    store.showBreadcrumb = store.defaults.showBreadcrumb;
    store.showBreadcrumbIcon = store.defaults.showBreadcrumbIcon;
    store.showTagsView = store.defaults.showTagsView;
    store.tagsViewHeight = store.defaults.tagsViewHeight;
    store.tagsViewStyle = store.defaults.tagsViewStyle;
    store.showFooter = store.defaults.showFooter;
    store.sidebarWidth = store.defaults.sidebarWidth;
    store.sidebarCollapsedWidth = store.defaults.sidebarCollapsedWidth;
    store.headerHeight = store.defaults.headerHeight;
  };

  const resetAll = async () => {
    const previousSettings = { ...store.settingsState };
    try {
      store.resetSettings();
      await store.updateThemeMode(store.themeMode);
    } catch (error) {
      store.$patch(previousSettings);
      throw error;
    }
  };

  const clearCache = async () => {
    if (!options.actions?.clearCache) {
      throw new LayoutActionUnavailableError("clearCache");
    }
    await options.actions.clearCache();
  };

  const reloadPage = () => {
    if (options.actions?.reloadPage) options.actions.reloadPage();
    else ownerDocument?.defaultView?.location.reload();
  };

  const createExportConfig = (): ExportedLayoutSettings => ({
    schemaVersion: SETTINGS_CONFIG_SCHEMA_VERSION,
    settings: store.settingsState,
    gray: grayMode.value,
    colorWeak: colorWeakMode.value,
    watermark: {
      enabled: watermarkEnabled.value,
      text: watermarkText.value,
    },
    exportTime: new Date().toISOString(),
  });

  const downloadConfig = () => {
    if (
      !ownerDocument ||
      typeof Blob === "undefined" ||
      typeof URL === "undefined" ||
      typeof URL.createObjectURL !== "function"
    ) {
      return false;
    }
    const blob = new Blob([JSON.stringify(createExportConfig(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = ownerDocument.createElement("a");
    anchor.href = url;
    anchor.download = `robot-admin-config-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    return true;
  };

  const applyImportedConfig = async (input: unknown) => {
    const imported = sanitizeLayoutSettingsConfig(input);
    assertLayoutSettingsRelationships({
      ...store.settingsState,
      ...imported.settings,
    });
    if (imported.settings !== undefined) {
      const { themeMode, ...settingsPatch } = imported.settings;
      if (themeMode !== undefined) await store.updateThemeMode(themeMode);
      store.$patch(settingsPatch);
    }
    if (imported.gray !== undefined) grayMode.value = imported.gray;
    if (imported.colorWeak !== undefined)
      colorWeakMode.value = imported.colorWeak;
    if (imported.watermark !== undefined) {
      watermarkEnabled.value = imported.watermark.enabled;
      watermarkText.value = imported.watermark.text;
    }
    return imported;
  };

  const importFile = async (file: Pick<File, "size" | "text">) => {
    if (file.size > maxImportBytes) throw new RangeError("配置文件过大");
    return applyImportedConfig(JSON.parse(await file.text()));
  };

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    stopGrayMode();
    stopColorWeakMode();
    stopWatermarkEnabled();
    stopWatermarkText();
    removeWatermark();
    visualRoot?.classList.toggle("gray-mode", initialGrayMode);
    visualRoot?.classList.toggle("color-weak-mode", initialColorWeakMode);
  };
  if (getCurrentScope()) onScopeDispose(dispose);

  return {
    applyImportedConfig,
    applyPreset,
    clearCache,
    colorWeakMode,
    createExportConfig,
    dispose,
    downloadConfig,
    grayMode,
    importFile,
    reloadPage,
    resetAll,
    resetAppearance,
    resetLayout,
    systemInfo,
    updateThemeMode,
    watermarkEnabled,
    watermarkText,
  };
}

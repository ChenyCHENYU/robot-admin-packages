/**
 * @robot-admin/layout
 *
 * 布局系统一键初始化
 */

import type { App } from "vue";
import type { SettingsStoreOptions } from "./types";
import { createSettingsStore } from "./stores/settings";
import { LAYOUT_SETTINGS_KEY } from "./composables/useLayoutContext";

/**
 * 初始化布局系统
 *
 * @example
 * ```ts
 * import { setupLayout } from '@robot-admin/layout/vue'
 * setupLayout(app, {
 *   onThemeModeChange: async (mode) => {
 *     const themeStore = useThemeStore()
 *     await themeStore.setMode(mode)
 *   }
 * })
 * ```
 */
export function setupLayout(app: App, options: SettingsStoreOptions = {}) {
  const settingsStore = createSettingsStore(options);
  const settings = settingsStore();

  // 让所有内置组件读取同一个实例；Store 内的 immediate watcher 负责同步 CSS 变量。
  app.provide(LAYOUT_SETTINGS_KEY, settings);

  return settingsStore;
}

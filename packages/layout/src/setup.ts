/**
 * @robot-admin/layout
 *
 * 布局系统一键初始化
 */

import type { App } from "vue";
import type { SettingsStoreOptions } from "./types";
import { createSettingsStore } from "./stores/settings";

/**
 * 初始化布局系统
 *
 * @example
 * ```ts
 * import { setupLayout } from '@robot-admin/layout'
 * setupLayout(app, {
 *   onThemeModeChange: async (mode) => {
 *     const themeStore = useThemeStore()
 *     await themeStore.setMode(mode)
 *   }
 * })
 * ```
 */
export function setupLayout(_app: App, options: SettingsStoreOptions = {}) {
  // 注册 settings store
  const settingsStore = createSettingsStore(options);

  // 初始化 CSS Variables
  settingsStore().syncCSSVariables();

  return settingsStore;
}

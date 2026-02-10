/**
 * SettingsDrawer - 常量数据
 */

import { THEME_PRESETS, COLOR_SWATCHES } from "../../constants";
import type { ThemePreset } from "../../types";

// 重新导出（内部使用）
export { COLOR_SWATCHES, THEME_PRESETS };
export type { ThemePreset };

// 布局模式选项 - 完整的 6 种布局（含 SVG 图标，仅 UI 内部使用）
export const LAYOUT_MODE_OPTIONS = [
  {
    label: "左侧菜单（默认）",
    value: "side",
    disabled: false,
    svg: `
      <rect x="0" y="0" width="16" height="48" rx="1" fill="currentColor" fill-opacity="0.9"/>
      <rect x="18" y="0" width="38" height="10" rx="1" fill="currentColor" fill-opacity="0.7"/>
      <rect x="18" y="12" width="38" height="34" rx="1" fill="currentColor" fill-opacity="0.4"/>
    `,
  },
  {
    label: "顶部菜单（清爽）",
    value: "top",
    disabled: false,
    svg: `
      <rect x="0" y="0" width="56" height="10" rx="1" fill="currentColor" fill-opacity="0.9"/>
      <rect x="0" y="12" width="56" height="8" rx="1" fill="currentColor" fill-opacity="0.7"/>
      <rect x="0" y="22" width="56" height="24" rx="1" fill="currentColor" fill-opacity="0.4"/>
    `,
  },
  {
    label: "左侧混合（灵巧）",
    value: "mix",
    disabled: false,
    svg: `
      <rect x="0" y="0" width="8" height="48" rx="1" fill="currentColor" fill-opacity="0.9"/>
      <rect x="10" y="0" width="14" height="48" rx="1" fill="currentColor" fill-opacity="0.7"/>
      <rect x="26" y="0" width="30" height="10" rx="1" fill="currentColor" fill-opacity="0.6"/>
      <rect x="26" y="12" width="30" height="34" rx="1" fill="currentColor" fill-opacity="0.4"/>
    `,
  },
  {
    label: "顶部混合（侧优）",
    value: "mix-top",
    disabled: false,
    svg: `
      <rect x="0" y="0" width="8" height="48" rx="1" fill="currentColor" fill-opacity="0.9"/>
      <rect x="10" y="0" width="46" height="10" rx="1" fill="currentColor" fill-opacity="0.7"/>
      <rect x="10" y="12" width="46" height="34" rx="1" fill="currentColor" fill-opacity="0.4"/>
    `,
  },
  {
    label: "反转混合（另类）",
    value: "reverse-horizontal-mix",
    disabled: false,
    svg: `
      <rect x="0" y="0" width="56" height="10" rx="1" fill="currentColor" fill-opacity="0.9"/>
      <rect x="44" y="12" width="12" height="34" rx="1" fill="currentColor" fill-opacity="0.7"/>
      <rect x="0" y="12" width="42" height="34" rx="1" fill="currentColor" fill-opacity="0.4"/>
    `,
  },
  {
    label: "卡片网格（新颖）",
    value: "card-layout",
    disabled: false,
    svg: `
      <rect x="0" y="0" width="24" height="20" rx="2" fill="currentColor" fill-opacity="0.9"/>
      <rect x="32" y="0" width="24" height="20" rx="2" fill="currentColor" fill-opacity="0.7"/>
      <rect x="0" y="24" width="24" height="20" rx="2" fill="currentColor" fill-opacity="0.6"/>
      <rect x="32" y="24" width="24" height="20" rx="2" fill="currentColor" fill-opacity="0.4"/>
    `,
  },
];

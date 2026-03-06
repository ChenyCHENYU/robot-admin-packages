/**
 * 布局和设置系统 - 常量定义
 */

import type {
  ThemePreset,
  SettingsState,
  LayoutInfo,
  PresetColor,
} from "../types";

// ============ 主题色预设 ============
export const PRESET_COLORS: PresetColor[] = [
  { name: "拂晓蓝", value: "#409eff" },
  { name: "薄暮红", value: "#f5222d" },
  { name: "火山橙", value: "#fa541c" },
  { name: "日暮黄", value: "#faad14" },
  { name: "极光绿", value: "#52c41a" },
  { name: "明青", value: "#13c2c2" },
  { name: "极客蓝", value: "#2f54eb" },
  { name: "酱紫", value: "#722ed1" },
] as const;

// ============ 主题预设方案 ============
export const THEME_PRESETS: ThemePreset[] = [
  {
    name: "科技蓝",
    icon: "💙",
    primaryColor: "#409eff",
  },
  {
    name: "清新绿",
    icon: "💚",
    primaryColor: "#52c41a",
  },
  {
    name: "商务灰",
    icon: "🖤",
    primaryColor: "#595959",
  },
  {
    name: "活力橙",
    icon: "🧡",
    primaryColor: "#fa8c16",
  },
  {
    name: "优雅紫",
    icon: "💜",
    primaryColor: "#722ed1",
  },
  {
    name: "经典红",
    icon: "❤️",
    primaryColor: "#f5222d",
  },
];

// ============ 布局模式信息 ============
export const LAYOUT_MODES: LayoutInfo[] = [
  {
    mode: "side",
    label: "左侧菜单",
    description: "经典的左侧导航布局",
    icon: "i-mdi:page-layout-sidebar-left",
  },
  {
    mode: "top",
    label: "顶部菜单",
    description: "顶部水平导航布局",
    icon: "i-mdi:page-layout-header",
  },
  {
    mode: "mix",
    label: "混合菜单",
    description: "顶部 + 侧边混合布局",
    icon: "i-mdi:view-dashboard-outline",
  },
  {
    mode: "mix-top",
    label: "顶部混合",
    description: "侧边优先的混合布局",
    icon: "i-mdi:view-dashboard-variant-outline",
  },
  {
    mode: "reverse-horizontal-mix",
    label: "反转混合",
    description: "反转的水平混合布局",
    icon: "i-mdi:page-layout-header-footer",
  },
  {
    mode: "card-layout",
    label: "卡片布局",
    description: "卡片式布局风格",
    icon: "i-mdi:card-outline",
  },
];

// ============ 圆角映射 ============
export const BORDER_RADIUS_MAP = {
  small: "4px",
  medium: "6px",
  large: "8px",
} as const;

// ============ 动画映射 ============
export const TRANSITION_MAP = {
  fade: "fade-transform",
  slide: "fade-slide",
  zoom: "fade-zoom",
  none: "",
} as const;

// ============ 默认配置 ============
export const DEFAULT_SETTINGS: SettingsState = {
  // 外观
  themeMode: "light",
  primaryColor: "#409eff",
  borderRadius: "medium",
  transitionType: "slide",
  enableTransition: true,

  // 布局
  layoutMode: "side",
  collapsed: false,
  fixedHeader: true,
  showBreadcrumb: true,
  showBreadcrumbIcon: true,
  showTagsView: true,
  tagsViewHeight: 44,
  tagsViewStyle: "default",
  showFooter: true,
  sidebarWidth: 220,
  sidebarCollapsedWidth: 64,
  headerHeight: 56,

  // 高级
  enableHotkeys: true,
  version: "2.0.2",
};

// ============ 其他常量 ============

/** Color swatches for color picker */
export const COLOR_SWATCHES = PRESET_COLORS.map((c) => c.value);

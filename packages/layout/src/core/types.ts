/** 与具体主题实现无关的标准主题模式。 */
export type ThemeMode = "light" | "dark" | "system";

/** 内置布局模式。 */
export type LayoutMode =
  "side" | "top" | "mix" | "mix-top" | "reverse-horizontal-mix" | "card-layout";

/** 菜单展开方式。 */
export type MenuExpandMode = "inline" | "panel";

/** 页面动画类型。 */
export type TransitionType = "fade" | "slide" | "zoom" | "none";

/** 圆角大小。 */
export type BorderRadiusSize = "small" | "medium" | "large";

/** 标签页风格。 */
export type TagsViewStyle = "default" | "card" | "smart";

/** UI 无关的布局设置协议。 */
export interface SettingsState {
  themeMode: ThemeMode;
  primaryColor: string;
  borderRadius: BorderRadiusSize;
  transitionType: TransitionType;
  enableTransition: boolean;
  layoutMode: LayoutMode;
  menuExpandMode: MenuExpandMode;
  collapsed: boolean;
  fixedHeader: boolean;
  showBreadcrumb: boolean;
  showBreadcrumbIcon: boolean;
  showTagsView: boolean;
  tagsViewHeight: number;
  tagsViewStyle: TagsViewStyle;
  showFooter: boolean;
  sidebarWidth: number;
  sidebarCollapsedWidth: number;
  headerHeight: number;
  enableHotkeys: boolean;
  /** @deprecated 包版本不应参与配置迁移，请使用 SETTINGS_CONFIG_SCHEMA_VERSION。 */
  version: string;
}

/** 主题预设方案。 */
export interface ThemePreset {
  name: string;
  description?: string;
  icon: string;
  primaryColor: string;
  settings?: Partial<
    Omit<SettingsState, "themeMode" | "layoutMode" | "primaryColor">
  >;
}

/** Settings Store 初始化选项。 */
export interface SettingsStoreOptions {
  id?: string;
  defaults?: Partial<SettingsState>;
  onThemeModeChange?: (mode: ThemeMode) => void | Promise<void>;
  /** 是否自动同步 CSS 变量；默认 true，微前端可关闭后自行绑定作用域。 */
  syncCssVariables?: boolean;
}

/** 由宿主应用实现的高副作用操作。 */
export interface SettingsDrawerActions {
  clearCache?: () => void | Promise<void>;
  reloadPage?: () => void;
}

/** 布局模式展示信息。 */
export interface LayoutInfo {
  mode: LayoutMode;
  label: string;
  description: string;
  icon: string;
}

/** 预设颜色。 */
export interface PresetColor {
  name: string;
  value: string;
}

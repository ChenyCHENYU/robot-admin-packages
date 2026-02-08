/**
 * 布局和设置相关类型定义
 */

import type { ThemeMode } from "@robot-admin/theme";

/**
 * 布局模式
 */
export type LayoutMode =
  | "side" // 左侧菜单
  | "top" // 顶部菜单
  | "mix" // 混合菜单
  | "mix-top" // 顶部混合（侧边优先）
  | "reverse-horizontal-mix" // 反转混合
  | "card-layout"; // 卡片布局

/**
 * 页面动画类型
 */
export type TransitionType = "fade" | "slide" | "zoom" | "none";

/**
 * 圆角大小
 */
export type BorderRadiusSize = "small" | "medium" | "large";

/**
 * 标签页风格
 */
export type TagsViewStyle = "default" | "card" | "smart";

/**
 * 设置状态接口
 */
export interface SettingsState {
  // ============ 外观设置 ============
  /** 主题模式：浅色/深色/自动 */
  themeMode: ThemeMode;

  /** 主题色 */
  primaryColor: string;

  /** 圆角大小 */
  borderRadius: BorderRadiusSize;

  /** 页面动画 */
  transitionType: TransitionType;

  /** 启用页面动画 */
  enableTransition: boolean;

  // ============ 布局设置 ============
  /** 布局模式：左侧/顶部/混合 */
  layoutMode: LayoutMode;

  /** 固定头部 */
  fixedHeader: boolean;

  /** 显示面包屑 */
  showBreadcrumb: boolean;

  /** 显示面包屑图标 */
  showBreadcrumbIcon: boolean;

  /** 显示标签页 */
  showTagsView: boolean;

  /** 标签页高度 */
  tagsViewHeight: number;

  /** 标签页风格 */
  tagsViewStyle: TagsViewStyle;

  /** 显示页脚 */
  showFooter: boolean;

  /** 侧边栏宽度 */
  sidebarWidth: number;

  /** 侧边栏折叠宽度 */
  sidebarCollapsedWidth: number;

  /** 头部高度 */
  headerHeight: number;

  // ============ 高级设置 ============
  /** 启用快捷键 */
  enableHotkeys: boolean;

  /** 配置版本（用于迁移） */
  version: string;
}

/**
 * 主题预设方案接口
 */
export interface ThemePreset {
  /** 方案名称 */
  name: string;

  /** 方案描述 */
  description?: string;

  /** 方案图标（emoji 或图标名） */
  icon: string;

  /** 主题色 */
  primaryColor: string;

  /** 其他配置（可选） */
  settings?: Partial<
    Omit<SettingsState, "themeMode" | "layoutMode" | "primaryColor">
  >;
}

/**
 * Settings Store 选项
 */
export interface SettingsStoreOptions {
  /** 默认配置 */
  defaults?: Partial<SettingsState>;
  /** localStorage 键名 */
  storageKey?: string;
  /** 主题模式变化回调（用于同步到 theme store） */
  onThemeModeChange?: (mode: ThemeMode) => void | Promise<void>;
}

/**
 * 布局模式信息
 */
export interface LayoutInfo {
  mode: LayoutMode;
  label: string;
  description: string;
  icon: string;
}

/**
 * 预设颜色
 */
export interface PresetColor {
  name: string;
  value: string;
}

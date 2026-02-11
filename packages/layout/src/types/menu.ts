/**
 * @robot-admin/layout
 *
 * 菜单路由相关类型定义
 * 从主项目提取的通用菜单类型，供布局骨架和消费方共用
 */

import type { VNode } from "vue";

/**
 * 菜单项类型
 * - `group` 分组
 * - `divider` 分割线
 * - `item` 普通菜单项
 */
export type MenuItemType = "group" | "divider" | "item";

/**
 * 菜单选项的详细类型定义
 */
export interface MenuOptions {
  /** 菜单项类型（分组/分割线） */
  type?: "group" | "divider";
  /** 唯一标识 */
  key?: string;
  /** 菜单跳转路径 */
  path?: string;
  /** 菜单名称（可对应路由名） */
  name?: string;
  /** 菜单项对应的组件名称 */
  component?: string;
  /** 重定向路径 */
  redirect?: string;
  /** 菜单显示的文本 */
  label?: string;
  /** 图标 */
  icon?: string | (() => VNode) | VNode;
  /** 是否禁用此菜单项 */
  disabled?: boolean;
  /** 元数据 */
  meta?: {
    /** 页面标题 */
    title?: string;
    /** 菜单项的图标 */
    icon?: string;
    /** 是否在菜单中隐藏 */
    hidden?: boolean;
    /** 是否固定在标签栏 */
    affix?: boolean;
    /** 是否缓存该页面 */
    keepAlive?: boolean;
    /** 是否全屏显示 */
    full?: boolean;
    /** 外部链接 URL */
    link?: string;
    /** 扩展属性 */
    [key: string]: any;
  };
  /** 子菜单 */
  children?: MenuOptions[];
}

/**
 * 标签栏项类型定义
 */
export interface MenuTag {
  /** 标签项对应的路由路径 */
  path: string;
  /** 标签显示的标题（已翻译） */
  title: string;
  /** 原始标题（中文，用于重新翻译） */
  originalTitle?: string;
  /** 显示的图标 */
  icon?: string;
  /** 标签相关元数据 */
  meta?: {
    /** 是否固定在标签栏 */
    affix?: boolean;
  };
}

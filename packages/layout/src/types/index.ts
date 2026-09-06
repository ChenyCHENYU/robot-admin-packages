/**
 * 布局包公共类型入口。
 * 与 UI 无关的协议由 core 统一维护，菜单渲染类型保留在 Vue 入口。
 */
export type {
  BorderRadiusSize,
  LayoutInfo,
  LayoutMode,
  MenuExpandMode,
  PresetColor,
  SettingsDrawerActions,
  SettingsState,
  SettingsStoreOptions,
  TagsViewStyle,
  ThemeMode,
  ThemePreset,
  TransitionType,
} from "../core/types";

export type { MenuOptions, MenuTag, MenuItemType } from "./menu";

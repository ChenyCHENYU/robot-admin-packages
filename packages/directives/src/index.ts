/**
 * @robot-admin/directives
 * Vue3 自定义指令集合 - 复制、防抖、节流、拖拽、长按、权限、水印、懒加载、Loading、Tooltip、点击外部
 */

// ==================== 全局安装插件 ====================
export { setupDirectives } from "./install";

// ==================== 按需导入指令 ====================
export { default as vCopy } from "./directives/copy";
export { default as vDebounce } from "./directives/debounce";
export { default as vThrottle } from "./directives/throttle";
export { default as vDrag } from "./directives/drag";
export { default as vLongpress } from "./directives/longpress";
export { default as vPermission } from "./directives/permission";
export { default as vWatermark } from "./directives/watermark";
export { default as vLazy } from "./directives/lazy";
export { default as vLoading } from "./directives/loading";
export { default as vTooltip } from "./directives/tooltip";
export { default as vClickOutside } from "./directives/click-outside";

// ==================== 导出类型 ====================
export type { CopyOptions, CopyBinding } from "./directives/copy";
export type { DebounceOptions } from "./directives/debounce";
export type { ThrottleOptions } from "./directives/throttle";
export type { DragOptions } from "./directives/drag";
export type { LongPressOptions } from "./directives/longpress";
export type { PermissionOptions } from "./directives/permission";
export type {
  WatermarkOptions,
  WatermarkBinding,
} from "./directives/watermark";
export type { LazyOptions, LazyBinding } from "./directives/lazy";
export type { LoadingOptions, LoadingBinding } from "./directives/loading";
export type { TooltipOptions, TooltipBinding } from "./directives/tooltip";
export type {
  ClickOutsideOptions,
  ClickOutsideBinding,
} from "./directives/click-outside";

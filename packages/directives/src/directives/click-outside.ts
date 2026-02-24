/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-24
 * @Description: 点击外部区域指令
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import type { Directive } from "vue";

/**
 * * @description ClickOutside 指令配置选项接口
 */
export interface ClickOutsideOptions {
  /** 点击外部时的回调 */
  handler: (event: MouseEvent | TouchEvent) => void;
  /** 是否启用 */
  enabled?: boolean;
  /** 排除的元素选择器列表（点击这些元素不触发） */
  exclude?: string[];
}

/**
 * * @description 指令绑定值类型
 */
export type ClickOutsideBinding =
  | ((event: MouseEvent | TouchEvent) => void)
  | ClickOutsideOptions;

/**
 * * @description 扩展的 HTML 元素类型
 */
interface ElType extends HTMLElement {
  _clickOutsideHandler?: (event: MouseEvent | TouchEvent) => void;
  _clickOutsideOptions?: ClickOutsideOptions;
}

/**
 * * @description 解析指令参数
 * ? @param value - 指令绑定值
 * ! @return 标准化配置
 */
function parseOptions(
  value: ClickOutsideBinding | undefined,
): ClickOutsideOptions {
  if (!value) return { handler: () => {}, enabled: false };
  if (typeof value === "function") return { handler: value, enabled: true };
  return { enabled: true, ...value };
}

/**
 * * @description 检查事件目标是否在排除列表中
 * ? @param target - 事件目标元素
 * ? @param exclude - 排除的选择器列表
 * ! @return 是否应排除
 */
function isExcluded(target: EventTarget | null, exclude?: string[]): boolean {
  if (!exclude?.length || !(target instanceof Element)) return false;
  return exclude.some((selector) => target.closest(selector));
}

/**
 * * @description 绑定外部点击事件
 * ? @param el - 目标元素
 * ? @param options - 配置选项
 * ! @return void
 */
function bindListener(el: ElType, options: ClickOutsideOptions): void {
  // 先清理旧的
  unbindListener(el);

  el._clickOutsideOptions = options;

  if (!options.enabled) return;

  const handler = (event: Event) => {
    const target = event.target as Node | null;
    // 点击发生在元素内部 → 不触发
    if (!target || el.contains(target)) return;
    // 在排除列表中 → 不触发
    if (isExcluded(target, options.exclude)) return;
    options.handler(event as MouseEvent | TouchEvent);
  };

  el._clickOutsideHandler = handler as ElType["_clickOutsideHandler"];

  // 使用捕获阶段 + 延迟绑定（避免挂载当帧的点击事件被误捕获）
  setTimeout(() => {
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
  }, 0);
}

/**
 * * @description 解绑事件
 * ? @param el - 目标元素
 * ! @return void
 */
function unbindListener(el: ElType): void {
  if (el._clickOutsideHandler) {
    document.removeEventListener("mousedown", el._clickOutsideHandler);
    document.removeEventListener("touchstart", el._clickOutsideHandler);
    el._clickOutsideHandler = undefined;
  }
}

/**
 * * @description Vue 点击外部区域指令
 * * @description 监听 mousedown + touchstart，支持排除元素和条件控制
 *
 * @example
 * ```vue
 * <!-- 基础用法 -->
 * <div v-click-outside="handleClose">下拉内容</div>
 *
 * <!-- 带条件 -->
 * <div v-click-outside="{ handler: close, enabled: isOpen }">内容</div>
 *
 * <!-- 排除元素 -->
 * <div v-click-outside="{ handler: close, exclude: ['.trigger-btn'] }">
 *   内容
 * </div>
 * ```
 */
const clickOutsideDirective: Directive<
  HTMLElement,
  ClickOutsideBinding | undefined
> = {
  /**
   * * @description 指令挂载时绑定事件监听
   * ? @param el - 绑定指令的 DOM 元素
   * ? @param binding - 指令绑定对象
   * ! @return void
   */
  mounted(el: ElType, binding) {
    bindListener(el, parseOptions(binding.value));
  },

  /**
   * * @description 指令更新时重新绑定
   * ? @param el - 绑定指令的 DOM 元素
   * ? @param binding - 指令绑定对象
   * ! @return void
   */
  updated(el: ElType, binding) {
    const options = parseOptions(binding.value);
    const prev = el._clickOutsideOptions;

    // 仅在 enabled 状态或 handler 变化时重新绑定
    if (
      options.enabled !== prev?.enabled ||
      options.handler !== prev?.handler
    ) {
      bindListener(el, options);
    }
  },

  /**
   * * @description 指令卸载时清理事件
   * ? @param el - 绑定指令的 DOM 元素
   * ! @return void
   */
  unmounted(el: ElType) {
    unbindListener(el);
  },
};

export default clickOutsideDirective;

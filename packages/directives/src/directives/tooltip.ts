/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-24
 * @Description: 轻量级 Tooltip 指令
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import type { Directive } from "vue";

/**
 * * @description Tooltip 指令配置选项接口
 */
export interface TooltipOptions {
  /** 提示文本内容 */
  content: string;
  /** 弹出方向 */
  placement?: "top" | "bottom" | "left" | "right";
  /** 显示延迟（ms） */
  showDelay?: number;
  /** 隐藏延迟（ms） */
  hideDelay?: number;
  /** 是否仅文字溢出时才显示 */
  ellipsis?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * * @description 指令绑定值类型
 */
export type TooltipBinding = string | TooltipOptions;

/**
 * * @description 扩展的 HTML 元素类型
 */
interface ElType extends HTMLElement {
  _tooltipContent?: string;
  _tooltipPlacement?: string;
  _tooltipShowDelay?: number;
  _tooltipHideDelay?: number;
  _tooltipEllipsis?: boolean;
  _tooltipDisabled?: boolean;
  _tooltipEl?: HTMLElement;
  _tooltipShowTimer?: number;
  _tooltipHideTimer?: number;
  _tooltipHandlers?: {
    mouseenter: (e: MouseEvent) => void;
    mouseleave: () => void;
  };
}

/**
 * * @description 注入全局样式（仅执行一次）
 * ! @return void
 */
let styleInjected = false;
function injectStyles(): void {
  if (styleInjected) return;
  styleInjected = true;

  const style = document.createElement("style");
  style.textContent = `
    .v-tooltip {
      position: fixed;
      z-index: 9999;
      max-width: 300px;
      padding: 6px 10px;
      font-size: 12px;
      line-height: 1.5;
      word-wrap: break-word;
      color: #fff;
      background: rgba(0, 0, 0, 0.78);
      border-radius: 4px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .v-tooltip.is-visible { opacity: 1; }
    .v-tooltip::after {
      content: '';
      position: absolute;
      border: 5px solid transparent;
    }
    .v-tooltip[data-placement="top"]::after {
      bottom: -10px; left: 50%; transform: translateX(-50%);
      border-top-color: rgba(0, 0, 0, 0.78);
    }
    .v-tooltip[data-placement="bottom"]::after {
      top: -10px; left: 50%; transform: translateX(-50%);
      border-bottom-color: rgba(0, 0, 0, 0.78);
    }
    .v-tooltip[data-placement="left"]::after {
      right: -10px; top: 50%; transform: translateY(-50%);
      border-left-color: rgba(0, 0, 0, 0.78);
    }
    .v-tooltip[data-placement="right"]::after {
      left: -10px; top: 50%; transform: translateY(-50%);
      border-right-color: rgba(0, 0, 0, 0.78);
    }
  `;
  document.head.appendChild(style);
}

/**
 * * @description 解析指令参数
 * ? @param value - 指令绑定值
 * ? @param modifiers - 指令修饰符
 * ! @return 标准化配置
 */
function parseOptions(
  value: TooltipBinding | undefined,
  modifiers: Partial<Record<string, boolean>>,
): Required<TooltipOptions> {
  const defaults: Required<TooltipOptions> = {
    content: "",
    placement: "top",
    showDelay: 200,
    hideDelay: 100,
    ellipsis: false,
    disabled: false,
  };

  // 从修饰符中提取方向和 ellipsis
  if (modifiers.top) defaults.placement = "top";
  if (modifiers.bottom) defaults.placement = "bottom";
  if (modifiers.left) defaults.placement = "left";
  if (modifiers.right) defaults.placement = "right";
  if (modifiers.ellipsis) defaults.ellipsis = true;

  if (!value) return defaults;
  if (typeof value === "string") return { ...defaults, content: value };
  return { ...defaults, ...value };
}

/**
 * * @description 检测元素文本是否被截断（ellipsis）
 * ? @param el - 目标元素
 * ! @return 是否溢出
 */
function isTextOverflow(el: HTMLElement): boolean {
  return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
}

/**
 * * @description 创建 tooltip DOM 元素
 * ? @param content - 提示文本
 * ? @param placement - 弹出方向
 * ! @return tooltip DOM 元素
 */
function createTooltipEl(content: string, placement: string): HTMLElement {
  const tip = document.createElement("div");
  tip.className = "v-tooltip";
  tip.setAttribute("data-placement", placement);
  tip.textContent = content;
  return tip;
}

/**
 * * @description 计算 tooltip 定位
 * ? @param el - 目标元素
 * ? @param tip - tooltip 元素
 * ? @param placement - 弹出方向
 * ! @return void
 */
function positionTooltip(
  el: HTMLElement,
  tip: HTMLElement,
  placement: string,
): void {
  const rect = el.getBoundingClientRect();
  const tipRect = tip.getBoundingClientRect();
  const gap = 8;

  let top = 0;
  let left = 0;

  switch (placement) {
    case "top":
      top = rect.top - tipRect.height - gap;
      left = rect.left + (rect.width - tipRect.width) / 2;
      break;
    case "bottom":
      top = rect.bottom + gap;
      left = rect.left + (rect.width - tipRect.width) / 2;
      break;
    case "left":
      top = rect.top + (rect.height - tipRect.height) / 2;
      left = rect.left - tipRect.width - gap;
      break;
    case "right":
      top = rect.top + (rect.height - tipRect.height) / 2;
      left = rect.right + gap;
      break;
  }

  // 边界修正：防止超出视口
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (left < 4) left = 4;
  if (left + tipRect.width > vw - 4) left = vw - tipRect.width - 4;
  if (top < 4) top = 4;
  if (top + tipRect.height > vh - 4) top = vh - tipRect.height - 4;

  tip.style.top = `${top}px`;
  tip.style.left = `${left}px`;
}

/**
 * * @description 显示 tooltip
 * ? @param el - 目标元素
 * ! @return void
 */
function showTooltip(el: ElType): void {
  if (el._tooltipDisabled) return;
  if (el._tooltipEllipsis && !isTextOverflow(el)) return;
  if (!el._tooltipContent) return;

  injectStyles();

  // 清除隐藏定时器
  if (el._tooltipHideTimer) {
    clearTimeout(el._tooltipHideTimer);
    el._tooltipHideTimer = undefined;
  }

  el._tooltipShowTimer = setTimeout(() => {
    // 移除已有的
    el._tooltipEl?.remove();

    const placement = el._tooltipPlacement ?? "top";
    const tip = createTooltipEl(el._tooltipContent!, placement);
    document.body.appendChild(tip);
    el._tooltipEl = tip;

    // 先渲染获取尺寸，再定位
    requestAnimationFrame(() => {
      positionTooltip(el, tip, placement);
      tip.classList.add("is-visible");
    });
  }, el._tooltipShowDelay ?? 200) as unknown as number;
}

/**
 * * @description 隐藏 tooltip
 * ? @param el - 目标元素
 * ! @return void
 */
function hideTooltip(el: ElType): void {
  // 清除显示定时器
  if (el._tooltipShowTimer) {
    clearTimeout(el._tooltipShowTimer);
    el._tooltipShowTimer = undefined;
  }

  el._tooltipHideTimer = setTimeout(() => {
    if (el._tooltipEl) {
      el._tooltipEl.classList.remove("is-visible");
      // 等过渡结束移除
      setTimeout(() => {
        el._tooltipEl?.remove();
        el._tooltipEl = undefined;
      }, 200);
    }
  }, el._tooltipHideDelay ?? 100) as unknown as number;
}

/**
 * * @description 将配置同步到元素属性上
 * ? @param el - 目标元素
 * ? @param options - tooltip 配置
 * ! @return void
 */
function syncOptions(el: ElType, options: Required<TooltipOptions>): void {
  el._tooltipContent = options.content;
  el._tooltipPlacement = options.placement;
  el._tooltipShowDelay = options.showDelay;
  el._tooltipHideDelay = options.hideDelay;
  el._tooltipEllipsis = options.ellipsis;
  el._tooltipDisabled = options.disabled;
}

/**
 * * @description Vue 轻量级 Tooltip 指令
 * * @description 不依赖组件，纯 DOM 实现，支持文字溢出自动触发
 *
 * @example
 * ```vue
 * <!-- 基础用法 -->
 * <span v-tooltip="'提示文本'">悬停查看</span>
 *
 * <!-- 仅溢出时显示 -->
 * <span v-tooltip.ellipsis="'完整文本'">很长的文本...</span>
 *
 * <!-- 指定方向 -->
 * <span v-tooltip.bottom="'底部提示'">文字</span>
 * ```
 */
const tooltipDirective: Directive<HTMLElement, TooltipBinding | undefined> = {
  /**
   * * @description 指令挂载时绑定事件
   * ? @param el - 绑定指令的 DOM 元素
   * ? @param binding - 指令绑定对象
   * ! @return void
   */
  mounted(el: ElType, binding) {
    const options = parseOptions(binding.value, binding.modifiers);
    syncOptions(el, options);

    const handleMouseenter = () => showTooltip(el);
    const handleMouseleave = () => hideTooltip(el);

    el.addEventListener("mouseenter", handleMouseenter);
    el.addEventListener("mouseleave", handleMouseleave);

    el._tooltipHandlers = {
      mouseenter: handleMouseenter,
      mouseleave: handleMouseleave,
    };
  },

  /**
   * * @description 指令更新时同步配置
   * ? @param el - 绑定指令的 DOM 元素
   * ? @param binding - 指令绑定对象
   * ! @return void
   */
  updated(el: ElType, binding) {
    const options = parseOptions(binding.value, binding.modifiers);
    syncOptions(el, options);
  },

  /**
   * * @description 指令卸载时清理
   * ? @param el - 绑定指令的 DOM 元素
   * ! @return void
   */
  unmounted(el: ElType) {
    if (el._tooltipHandlers) {
      el.removeEventListener("mouseenter", el._tooltipHandlers.mouseenter);
      el.removeEventListener("mouseleave", el._tooltipHandlers.mouseleave);
    }
    if (el._tooltipShowTimer) clearTimeout(el._tooltipShowTimer);
    if (el._tooltipHideTimer) clearTimeout(el._tooltipHideTimer);
    el._tooltipEl?.remove();
    el._tooltipEl = undefined;
  },
};

export default tooltipDirective;

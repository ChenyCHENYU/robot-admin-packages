/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-24
 * @Description: 局部 Loading 指令
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import type { Directive } from "vue";

/**
 * * @description Loading 指令配置选项接口
 */
export interface LoadingOptions {
  /** 是否显示 loading */
  value: boolean;
  /** 加载提示文本 */
  text?: string;
  /** 遮罩背景色 */
  background?: string;
  /** spinner 颜色 */
  spinnerColor?: string;
  /** spinner 大小（px） */
  spinnerSize?: number;
  /** 最小展示时间（ms），防止闪烁 */
  minDuration?: number;
  /** 是否全屏模式 */
  fullscreen?: boolean;
}

/**
 * * @description 指令绑定值类型
 */
export type LoadingBinding = boolean | LoadingOptions;

/**
 * * @description 扩展的 HTML 元素类型
 */
interface ElType extends HTMLElement {
  _loadingOverlay?: HTMLElement;
  _loadingOptions?: LoadingOptions;
  _loadingShowTime?: number;
  _loadingHideTimer?: number;
  _originalPosition?: string;
}

/**
 * * @description 解析指令参数
 * ? @param value - 指令绑定值
 * ! @return 标准化配置
 */
function parseOptions(value: LoadingBinding | undefined): LoadingOptions {
  if (value === undefined || value === null) return { value: false };
  if (typeof value === "boolean") return { value };
  return { ...value };
}

/**
 * * @description 创建 Spinner SVG 元素
 * ? @param color - spinner 颜色
 * ? @param size - spinner 大小（px）
 * ! @return SVG HTML 字符串
 */
function createSpinnerSvg(color: string, size: number): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" style="animation:v-loading-rotate 0.8s linear infinite">
    <circle cx="22" cy="22" r="18" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-dasharray="90,150" stroke-dashoffset="0" style="animation:v-loading-dash 1.5s ease-in-out infinite"/>
  </svg>`;
}

/**
 * * @description 注入全局动画样式（仅执行一次）
 * ! @return void
 */
let styleInjected = false;
function injectStyles(): void {
  if (styleInjected) return;
  styleInjected = true;

  const style = document.createElement("style");
  style.textContent = `
    @keyframes v-loading-rotate { 100% { transform: rotate(360deg); } }
    @keyframes v-loading-dash {
      0% { stroke-dasharray: 1,200; stroke-dashoffset: 0; }
      50% { stroke-dasharray: 90,150; stroke-dashoffset: -40px; }
      100% { stroke-dasharray: 90,150; stroke-dashoffset: -120px; }
    }
    .v-loading-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      z-index: 2000;
      transition: opacity 0.3s;
    }
    .v-loading-overlay.is-fullscreen {
      position: fixed;
      z-index: 9999;
    }
    .v-loading-text {
      font-size: 14px;
      color: inherit;
    }
  `;
  document.head.appendChild(style);
}

/**
 * * @description 创建 loading 遮罩层 DOM
 * ? @param options - loading 配置
 * ! @return 遮罩层 DOM 元素
 */
function createOverlay(options: LoadingOptions): HTMLElement {
  const overlay = document.createElement("div");
  overlay.className = `v-loading-overlay${options.fullscreen ? " is-fullscreen" : ""}`;

  const bg = options.background ?? "rgba(255, 255, 255, 0.7)";
  const spinnerColor = options.spinnerColor ?? "#409eff";
  const spinnerSize = options.spinnerSize ?? 32;

  overlay.style.background = bg;
  overlay.style.color = spinnerColor;
  overlay.style.opacity = "0";

  let html = createSpinnerSvg(spinnerColor, spinnerSize);
  if (options.text) {
    html += `<span class="v-loading-text">${options.text}</span>`;
  }
  overlay.innerHTML = html;

  return overlay;
}

/**
 * * @description 显示 loading
 * ? @param el - 目标元素
 * ? @param options - loading 配置
 * ! @return void
 */
function showLoading(el: ElType, options: LoadingOptions): void {
  if (el._loadingOverlay) return;

  injectStyles();

  // 确保容器有定位上下文
  const position = getComputedStyle(el).position;
  if (!position || position === "static") {
    el._originalPosition = position;
    el.style.position = "relative";
  }

  const overlay = createOverlay(options);

  if (options.fullscreen) {
    document.body.appendChild(overlay);
  } else {
    el.appendChild(overlay);
  }

  el._loadingOverlay = overlay;
  el._loadingShowTime = Date.now();

  // requestAnimationFrame 触发过渡动画
  requestAnimationFrame(() => {
    overlay.style.opacity = "1";
  });
}

/**
 * * @description 隐藏 loading
 * ? @param el - 目标元素
 * ? @param minDuration - 最小展示时间
 * ! @return void
 */
function hideLoading(el: ElType, minDuration = 0): void {
  if (!el._loadingOverlay) return;

  // 清除之前的隐藏定时器
  if (el._loadingHideTimer) {
    clearTimeout(el._loadingHideTimer);
    el._loadingHideTimer = undefined;
  }

  const elapsed = Date.now() - (el._loadingShowTime ?? 0);
  const remaining = Math.max(0, minDuration - elapsed);

  const doHide = () => {
    const overlay = el._loadingOverlay;
    if (!overlay) return;

    overlay.style.opacity = "0";

    // 等过渡动画结束后移除 DOM
    const onEnd = () => {
      overlay.removeEventListener("transitionend", onEnd);
      overlay.remove();
    };
    overlay.addEventListener("transitionend", onEnd);

    // 兜底：300ms 后强制移除
    setTimeout(() => overlay.remove(), 350);

    el._loadingOverlay = undefined;
    el._loadingShowTime = undefined;
    el._loadingHideTimer = undefined;

    // 恢复定位
    if (el._originalPosition !== undefined) {
      el.style.position = el._originalPosition || "";
      el._originalPosition = undefined;
    }
  };

  if (remaining > 0) {
    el._loadingHideTimer = setTimeout(doHide, remaining) as unknown as number;
  } else {
    doHide();
  }
}

/**
 * * @description 根据参数切换 loading 状态
 * ? @param el - 目标元素
 * ? @param options - loading 配置
 * ! @return void
 */
function toggleLoading(el: ElType, options: LoadingOptions): void {
  el._loadingOptions = options;
  if (options.value) {
    showLoading(el, options);
  } else {
    hideLoading(el, options.minDuration);
  }
}

/**
 * * @description Vue 局部 Loading 指令
 * * @description Element Plus 风格的局部加载遮罩，支持自定义文本和全屏模式
 *
 * @example
 * ```vue
 * <!-- 基础用法 -->
 * <div v-loading="isLoading">内容</div>
 *
 * <!-- 带文本 -->
 * <div v-loading="{ value: loading, text: '加载中...' }">内容</div>
 *
 * <!-- 全屏 -->
 * <div v-loading="{ value: loading, fullscreen: true }">内容</div>
 * ```
 */
const loadingDirective: Directive<HTMLElement, LoadingBinding | undefined> = {
  /**
   * * @description 指令挂载时根据初始值设置状态
   * ? @param el - 绑定指令的 DOM 元素
   * ? @param binding - 指令绑定对象
   * ! @return void
   */
  mounted(el: ElType, binding) {
    toggleLoading(el, parseOptions(binding.value));
  },

  /**
   * * @description 指令更新时切换状态
   * ? @param el - 绑定指令的 DOM 元素
   * ? @param binding - 指令绑定对象
   * ! @return void
   */
  updated(el: ElType, binding) {
    const options = parseOptions(binding.value);
    const prevValue = el._loadingOptions?.value ?? false;
    if (options.value !== prevValue) {
      toggleLoading(el, options);
    }
  },

  /**
   * * @description 指令卸载时清理
   * ? @param el - 绑定指令的 DOM 元素
   * ! @return void
   */
  unmounted(el: ElType) {
    if (el._loadingHideTimer) {
      clearTimeout(el._loadingHideTimer);
    }
    el._loadingOverlay?.remove();
    el._loadingOverlay = undefined;
  },
};

export default loadingDirective;

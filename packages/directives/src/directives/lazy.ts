/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-24
 * @Description: 图片懒加载指令
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import type { Directive } from "vue";

/**
 * * @description 懒加载指令配置选项接口
 */
export interface LazyOptions {
  /** 图片源地址 */
  src: string;
  /** 加载中占位图 */
  loading?: string;
  /** 加载失败兜底图 */
  error?: string;
  /** 预加载偏移量（提前多少像素开始加载） */
  rootMargin?: string;
  /** 可见面积阈值 0-1 */
  threshold?: number;
}

/**
 * * @description 指令绑定值类型
 */
export type LazyBinding = string | LazyOptions;

/**
 * * @description 扩展的 HTML 元素类型
 */
interface ElType extends HTMLElement {
  _lazyObserver?: IntersectionObserver;
  _lazySrc?: string;
  _lazyLoading?: string;
  _lazyError?: string;
  _lazyMode?: "img" | "background";
}

/** 默认 1px 透明占位图 */
const PLACEHOLDER =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';

/**
 * * @description 解析指令参数
 * ? @param value - 指令绑定值
 * ! @return 标准化配置
 */
function parseOptions(value: LazyBinding | undefined): Required<LazyOptions> {
  const defaults: Required<LazyOptions> = {
    src: "",
    loading: PLACEHOLDER,
    error: PLACEHOLDER,
    rootMargin: "200px 0px",
    threshold: 0,
  };

  if (!value) return defaults;
  if (typeof value === "string") return { ...defaults, src: value };
  return { ...defaults, ...value };
}

/**
 * * @description 设置元素的图片源
 * ? @param el - 目标元素
 * ? @param src - 图片地址
 * ! @return void
 */
function setSource(el: ElType, src: string): void {
  if (el._lazyMode === "background") {
    el.style.backgroundImage = `url(${src})`;
  } else {
    (el as HTMLImageElement).src = src;
  }
}

/**
 * * @description 加载图片并应用到元素
 * ? @param el - 目标元素
 * ! @return void
 */
function loadImage(el: ElType): void {
  const src = el._lazySrc;
  if (!src) return;

  const img = new Image();

  img.onload = () => {
    setSource(el, src);
    el.classList.remove("v-lazy-loading");
    el.classList.add("v-lazy-loaded");
  };

  img.onerror = () => {
    if (el._lazyError) setSource(el, el._lazyError);
    el.classList.remove("v-lazy-loading");
    el.classList.add("v-lazy-error");
  };

  img.src = src;
}

/**
 * * @description 创建 IntersectionObserver 监听元素可见性
 * ? @param el - 目标元素
 * ? @param options - 懒加载配置
 * ! @return void
 */
function observe(el: ElType, options: Required<LazyOptions>): void {
  // 清理旧的 observer
  el._lazyObserver?.disconnect();

  el._lazySrc = options.src;
  el._lazyLoading = options.loading;
  el._lazyError = options.error;

  // 设置占位图
  setSource(el, options.loading);
  el.classList.add("v-lazy-loading");

  el._lazyObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          loadImage(el);
          el._lazyObserver?.disconnect();
          el._lazyObserver = undefined;
          break;
        }
      }
    },
    {
      rootMargin: options.rootMargin,
      threshold: options.threshold,
    },
  );

  el._lazyObserver.observe(el);
}

/**
 * * @description Vue 图片懒加载指令
 * * @description 基于 IntersectionObserver，元素进入可视区域时加载图片
 *
 * @example
 * ```vue
 * <!-- 基础用法 -->
 * <img v-lazy="imageUrl" />
 *
 * <!-- 背景图 -->
 * <div v-lazy:background="bannerUrl" />
 *
 * <!-- 完整配置 -->
 * <img v-lazy="{ src: url, loading: placeholder, error: fallback }" />
 * ```
 */
const lazyDirective: Directive<HTMLElement, LazyBinding | undefined> = {
  /**
   * * @description 指令挂载时初始化观察器
   * ? @param el - 绑定指令的 DOM 元素
   * ? @param binding - 指令绑定对象
   * ! @return void
   */
  mounted(el: ElType, binding) {
    el._lazyMode = binding.arg === "background" ? "background" : "img";
    const options = parseOptions(binding.value);
    observe(el, options);
  },

  /**
   * * @description 指令更新时重新观察
   * ? @param el - 绑定指令的 DOM 元素
   * ? @param binding - 指令绑定对象
   * ! @return void
   */
  updated(el: ElType, binding) {
    const options = parseOptions(binding.value);
    // 仅在 src 变化时重新观察
    if (options.src !== el._lazySrc) {
      el.classList.remove("v-lazy-loaded", "v-lazy-error");
      observe(el, options);
    }
  },

  /**
   * * @description 指令卸载时清理观察器
   * ? @param el - 绑定指令的 DOM 元素
   * ! @return void
   */
  unmounted(el: ElType) {
    el._lazyObserver?.disconnect();
    el._lazyObserver = undefined;
  },
};

export default lazyDirective;

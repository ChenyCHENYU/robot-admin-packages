/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-07 10:00:00
 * @LastEditors: ChenYu ycyplus@gmail.com
 * @LastEditTime: 2026-02-07 10:00:00
 * @FilePath: \robot-admin-request-core\src\axios\types\index.ts
 * @Description: Axios 插件 - 增强类型定义
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import type { AxiosRequestConfig } from "axios";

/**
 * 请求去重配置
 */
export interface DedupeConfig {
  /** 是否启用去重（默认 true） */
  enabled?: boolean;
  /** 自定义请求 key 生成函数 */
  keyGenerator?: (config: AxiosRequestConfig) => string;
}

/**
 * 请求缓存配置
 */
export interface CacheConfig {
  /** 是否启用缓存（默认 false，只对 GET 请求有效） */
  enabled?: boolean;
  /** 缓存时间（毫秒，默认 5 分钟） */
  ttl?: number;
  /** 是否强制刷新缓存 */
  forceUpdate?: boolean;
}

/**
 * 请求重试配置
 */
export interface RetryConfig {
  /** 是否启用重试（默认 false） */
  enabled?: boolean;
  /** 重试次数（默认 3） */
  count?: number;
  /** 重试延迟（毫秒，默认 1000） */
  delay?: number;
  /** 是否使用指数退避（默认 true） */
  exponentialBackoff?: boolean;
  /** 是否启用随机抖动（默认 true），避免重试风暴 */
  jitter?: boolean;
  /** 可重试的 HTTP 状态码 */
  retryableStatusCodes?: number[];
  /** 允许重试的 HTTP 方法（默认仅幂等方法，避免对非幂等 POST/PUT/DELETE 重复执行副作用） */
  retryableMethods?: string[];
}

/**
 * 路由取消配置
 */
export interface CancelConfig {
  /** 是否启用路由切换时自动取消（默认 true） */
  enabled?: boolean;
  /** 白名单：不需要取消的请求 URL 模式 */
  whitelist?: RegExp[];
}

/**
 * 扩展的 Axios 请求配置
 */
export interface EnhancedAxiosRequestConfig extends AxiosRequestConfig {
  /** 请求去重配置 */
  dedupe?: boolean | DedupeConfig;
  /** 请求缓存配置 */
  cache?: boolean | CacheConfig;
  /** 请求重试配置 */
  retry?: boolean | RetryConfig;
  /** 路由取消配置 */
  cancel?: boolean | CancelConfig;
  /** 内部标记：当前重试次数 */
  __retryCount?: number;
  /** 内部标记：取消请求 ID */
  __cancelId?: string;
  /** 内部标记：去重请求键 */
  __requestKey?: string;
  /** 内部标记：是否来自缓存 */
  __fromCache?: boolean;
  /** 内部标记：共享的 AbortController（dedupe 与 cancel 复用，避免 signal 互相覆盖） */
  __abortController?: EnhancedAbortController;
  /** 内部标记：调用方原始 AbortSignal，用于在最终响应阶段恢复配置 */
  __externalSignal?: AxiosRequestConfig["signal"];
  /** 内部标记：移除外部 AbortSignal 桥接监听器 */
  __abortCleanup?: () => void;
  /** 内部标记：是否被 cancel 插件管理（保留兼容） */
  __managedByCancel?: boolean;
  /** 内部标记：是否正在处理 401 错误 */
  __handling401?: boolean;
}

/**
 * 缓存项
 */
export interface CacheItem<T = any> {
  /** 缓存数据 */
  data: T;
  /** 过期时间戳 */
  expireAt: number;
}

/**
 * 请求 key 生成器参数
 */
export interface RequestKeyParams {
  method?: string;
  url?: string;
  params?: any;
  data?: any;
}

/**
 * 扩展的 AbortController 接口
 */
export interface EnhancedAbortController extends AbortController {
  /** 请求开始时间 */
  _startTime?: number;
}

/**
 * 缓存响应数据接口
 */
export interface CachedResponseData {
  data: any;
  status: number;
  statusText: string;
  headers: Record<string, any>;
}

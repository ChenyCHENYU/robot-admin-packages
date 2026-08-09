/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-07 10:00:00
 * @LastEditors: ChenYu ycyplus@gmail.com
 * @LastEditTime: 2026-02-07 10:00:00
 * @FilePath: \robot-admin-request-core\src\axios\plugins\dedupe.ts
 * @Description: 请求去重插件（AbortController）
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import type {
  EnhancedAxiosRequestConfig,
  DedupeConfig,
  EnhancedAbortController,
} from "../types";
import { ensureSharedAbortController } from "../utils/abort";
import { generateRequestKey, normalizeConfig } from "../utils/helpers";

/**
 * 默认去重配置
 * - enabled: 是否启用去重，默认开启
 * - keyGenerator: 请求键生成器，默认使用 generateRequestKey
 */
const DEFAULT_DEDUPE_CONFIG: Required<DedupeConfig> = {
  enabled: true,
  keyGenerator: generateRequestKey,
};

/**
 * 正在进行的请求 Map
 * key: 请求唯一标识符（基于 URL、参数、方法等生成）
 * value: 增强的 AbortController（包含创建时间）
 *
 * 去重原理：
 * - 相同的请求（相同 key）只能有一个在进行
 * - 新请求会取消旧请求，确保只有一个活跃请求
 * - 避免重复请求造成的资源浪费
 */
const pendingRequests = new Map<string, EnhancedAbortController>();
const CLEANUP_INTERVAL = 30000;
const REQUEST_TIMEOUT = 5 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

/**
 * 清理超时的请求
 *
 * 功能：
 * 1. 清理超过 5 分钟的请求
 * 2. 防止长时间挂起的请求占用内存
 * 3. 自动取消超时请求释放资源
 *
 * 清理策略：
 * - 每 30 秒执行一次清理
 * - 基于请求创建时间判断超时
 * - 安全地取消和清理请求
 */
function cleanupExpiredRequests(): void {
  const now = Date.now();
  Array.from(pendingRequests.entries()).forEach(([key, controller]) => {
    const startTime = controller._startTime || now;
    if (now - startTime > REQUEST_TIMEOUT) {
      try {
        controller.abort();
      } catch (error) {
        console.warn("Abort error:", error);
      }
      pendingRequests.delete(key);
    }
  });

  stopCleanupTimerIfIdle();
}

function startCleanupTimer(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(cleanupExpiredRequests, CLEANUP_INTERVAL);
  (cleanupTimer as any).unref?.();
}

function stopCleanupTimerIfIdle(): void {
  if (pendingRequests.size === 0 && cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

function removePendingRequest(config: EnhancedAxiosRequestConfig): void {
  const requestKey = config.__requestKey;
  const controller = config.__abortController;
  if (
    requestKey &&
    controller &&
    pendingRequests.get(requestKey) === controller
  ) {
    pendingRequests.delete(requestKey);
  }
  stopCleanupTimerIfIdle();
}

/**
 * 请求拦截器：处理请求去重
 *
 * @param config 请求配置
 * @returns 增强的请求配置
 *
 * 去重逻辑：
 * 1. 检查去重配置是否启用
 * 2. 跳过缓存响应（不需要去重）
 * 3. 生成请求唯一标识符
 * 4. 检查是否有相同请求正在进行
 * 5. 如果有，取消旧请求并创建新请求
 * 6. 如果已有 signal（来自 cancel 插件），不重复创建
 *
 * 与 cancel 插件的协作：
 * - cancel 插件负责路由切换时的批量取消
 * - dedupe 插件负责相同请求的去重
 * - 两者可以同时工作，互不冲突
 */
function onRequest(
  config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig {
  const enhancedConfig = config as EnhancedAxiosRequestConfig;
  const dedupeConfig = normalizeConfig(
    enhancedConfig.dedupe,
    DEFAULT_DEDUPE_CONFIG,
  );

  if (!dedupeConfig.enabled) {
    return config;
  }

  // ✅ 如果来自缓存，不创建 AbortController
  // 缓存响应不需要网络请求，因此不需要去重机制
  if ((config as any).__fromCache) {
    return config;
  }

  const keyGenerator =
    dedupeConfig.keyGenerator || DEFAULT_DEDUPE_CONFIG.keyGenerator;
  const requestKey = keyGenerator(config);

  // 如果有相同的请求正在进行，取消旧的
  const existing = pendingRequests.get(requestKey);
  if (existing) {
    try {
      existing.abort();
    } catch (error) {
      console.warn("Abort existing request error:", error);
    }
    pendingRequests.delete(requestKey);
  }

  const controller = ensureSharedAbortController(enhancedConfig);
  if (!controller) return config;

  enhancedConfig.__requestKey = requestKey;
  pendingRequests.set(requestKey, controller);
  startCleanupTimer();

  return config;
}

/**
 * 响应拦截器：清理已完成的请求
 *
 * @param response 响应对象
 * @returns 原始响应
 *
 * 清理机制：
 * - 请求成功完成后，从 Map 中移除对应的控制器
 * - 释放内存，避免无效的取消操作
 * - 确保后续相同请求可以正常发起
 */
function onResponse(response: any): any {
  const config = response.config as EnhancedAxiosRequestConfig;
  removePendingRequest(config);

  return response;
}

/**
 * 响应错误处理：清理失败的请求
 *
 * @param error 错误对象
 * @returns rejected Promise
 *
 * 清理机制：
 * - 请求失败时，同样需要清理控制器
 * - 确保无论成功还是失败都正确清理资源
 * - 避免失败的请求影响后续相同请求的去重
 */
function onResponseError(error: any): Promise<never> {
  const config = error.config as EnhancedAxiosRequestConfig;

  if (config) {
    removePendingRequest(config);
  }

  return Promise.reject(error);
}

/**
 * 设置请求去重插件
 *
 * @param instance Axios 实例
 *
 * 注册拦截器：
 * - 请求拦截器：处理去重逻辑
 * - 响应拦截器：清理完成的请求
 * - 响应错误拦截器：清理失败的请求
 */
export function setupDedupePlugin(instance: AxiosInstance): void {
  instance.interceptors.request.use(onRequest);
  instance.interceptors.response.use(onResponse, onResponseError);
}

/**
 * 取消所有待处理的请求
 *
 * 使用场景：
 * - 用户登出时清理所有请求
 * - 网络异常时重置请求状态
 * - 调试和测试场景
 *
 * 安全机制：
 * - 捕获每个取消操作的异常
 * - 确保一个请求的失败不影响其他请求的取消
 * - 完全清理 Map 中的所有引用
 */
export function cancelAllPendingRequests(): void {
  pendingRequests.forEach((controller) => {
    try {
      controller.abort();
    } catch (error) {
      console.warn("Error aborting pending request:", error);
    }
  });
  pendingRequests.clear();
  stopCleanupTimerIfIdle();
}

/**
 * 获取待处理请求数量
 *
 * @returns 当前待处理的请求数量
 *
 * 监控用途：
 * - 性能监控和分析
 * - 调试请求状态
 * - 检测潜在的请求泄漏
 * - 评估去重效果
 */
export function getPendingRequestCount(): number {
  return pendingRequests.size;
}

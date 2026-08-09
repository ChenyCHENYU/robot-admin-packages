/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-08-09
 * @FilePath: \robot-admin-request-core\src\axios\utils\abort.ts
 * @Description: Axios 插件共享取消上下文管理
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import type { EnhancedAbortController, EnhancedAxiosRequestConfig } from "../types";

/**
 * 创建或复用请求级共享 AbortController。
 *
 * 调用方 signal 不直接作为 Axios 最终 signal 使用，而是单向桥接到共享
 * controller。这样调用方取消、重复请求取消和路由批量取消都会落到同一信号，
 * 同时避免 dedupe/cancel 插件互相覆盖 config.signal。
 */
export function ensureSharedAbortController(
  config: EnhancedAxiosRequestConfig,
): EnhancedAbortController | null {
  if (typeof AbortController === "undefined") return null;

  const existing = config.__abortController;
  if (existing) {
    existing._startTime ??= Date.now();
    config.signal = existing.signal;
    return existing;
  }

  const externalSignal = config.signal;
  const controller = new AbortController() as EnhancedAbortController;
  controller._startTime = Date.now();

  if (externalSignal && externalSignal !== controller.signal) {
    config.__externalSignal = externalSignal;

    const forwardAbort = () => {
      if (!controller.signal.aborted) {
        controller.abort((externalSignal as AbortSignal).reason);
      }
    };

    if (externalSignal.aborted) {
      forwardAbort();
    } else {
      externalSignal.addEventListener?.("abort", forwardAbort, { once: true });
      config.__abortCleanup = () => {
        externalSignal.removeEventListener?.("abort", forwardAbort);
      };
    }
  }

  config.__abortController = controller;
  config.signal = controller.signal;
  return controller;
}

/**
 * 清理请求级取消桥接，并恢复调用方原始 signal。
 *
 * 必须在内置 retry 插件之后执行，确保自动重试期间桥接持续有效；恢复后的
 * config 也可被 Robot_Admin 等消费方在 401 业务拦截器中安全地再次发送。
 */
export function cleanupAbortContext(
  config: EnhancedAxiosRequestConfig | undefined,
): void {
  if (!config) return;

  config.__abortCleanup?.();

  if (config.__externalSignal) {
    config.signal = config.__externalSignal;
  } else if (config.signal === config.__abortController?.signal) {
    delete config.signal;
  }

  delete config.__abortCleanup;
  delete config.__externalSignal;
  delete config.__abortController;
}

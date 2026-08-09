/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-07 10:00:00
 * @LastEditors: ChenYu ycyplus@gmail.com
 * @LastEditTime: 2026-02-07 10:00:00
 * @FilePath: \robot-admin-request-core\src\axios\plugins\index.ts
 * @Description: axios 插件体系
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import type { AxiosInstance } from "axios";
import { setupRequestPlugin } from "./request";
import { setupDedupePlugin } from "./dedupe";
import { setupCachePlugin } from "./cache";
import { setupRetryPlugin } from "./retry";
import { setupResponsePlugin } from "./response";
import { setupCancelPlugin } from "./cancel";

/**
 * 设置所有插件
 *
 * 拦截器执行规则（axios）：
 * - 请求拦截器按注册的【逆序】执行（LIFO）
 * - 响应拦截器按注册【顺序】执行（FIFO）
 *
 * 注册顺序：request -> cache -> cancel -> dedupe -> retry -> response
 *
 * 关键说明：
 * - dedupe 与 cancel 通过共享的 `config.__abortController` 复用同一个
 *   AbortController，避免各自创建导致 signal 互相覆盖、取消失效。
 * - cache 在请求拦截器中若命中缓存，以 rejected Promise 携带 `__fromCache`
 *   短路，并在自身响应错误拦截器中 resolve，避免发出真实网络请求。
 */
export function setupPlugins(instance: AxiosInstance): void {
  // 1. 请求通用处理（token、headers）
  setupRequestPlugin(instance);

  // 2. 请求缓存（GET 请求缓存）
  setupCachePlugin(instance);

  // 3. 路由取消
  setupCancelPlugin(instance);

  // 4. 请求去重（与 cancel 共享 AbortController）
  setupDedupePlugin(instance);

  // 5. 请求重试（网络错误自动重试）
  setupRetryPlugin(instance);

  // 6. 响应统一处理（业务错误、401 处理）
  setupResponsePlugin(instance);
}

// 导出所有插件的工具函数
export {
  waitForReLogin,
  resolveReLogin,
  rejectReLogin,
  getReLoginPromise,
} from "./request";
export { cancelAllPendingRequests, getPendingRequestCount } from "./dedupe";
export {
  clearAllCache,
  clearCache,
  cleanupExpiredCache,
  getCacheSize,
} from "./cache";
export { cancelAllRequests, getCancelableRequestCount } from "./cancel";

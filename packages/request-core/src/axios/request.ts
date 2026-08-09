/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-07 10:00:00
 * @LastEditors: ChenYu ycyplus@gmail.com
 * @LastEditTime: 2026-02-07 10:00:00
 * @FilePath: \robot-admin-request-core\src\axios\request.ts
 * @Description: axios 二次封装 + 插件体系
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import { setupPlugins, resolveReLogin, rejectReLogin } from "./plugins";
export {
  setGlobalAxiosInstance,
  getGlobalAxiosInstance,
  getData,
  postData,
  putData,
  deleteData,
} from "./service";
export { default } from "./service";

/**
 * 创建 axios 实例
 * @param config axios 配置
 */
export function createAxiosInstance(
  config: AxiosRequestConfig = {},
): AxiosInstance {
  const instance = axios.create({
    timeout: 5000,
    headers: {
      "Content-Type": "application/json",
    },
    ...config,
  });

  /**
   * 挂载所有插件
   * 优化后的插件顺序：request -> cache -> cancel -> dedupe -> retry -> response
   *
   * 顺序说明：
   * - cache 在最前：确保缓存检查优先级最高
   * - cancel 在 dedupe 之前：确保 cancel 的 signal 不被覆盖
   * - dedupe 在 cancel 之后：复用 cancel 的 signal（如果存在）
   */
  setupPlugins(instance);

  return instance;
}

// ================= 导出插件工具函数 =================
export {
  waitForReLogin,
  getReLoginPromise,
  cancelAllPendingRequests,
  getPendingRequestCount,
  clearAllCache,
  clearCache,
  cleanupExpiredCache,
  getCacheSize,
  cancelAllRequests,
  getCancelableRequestCount,
} from "./plugins";

// ================= 重新登录回调 =================

/**
 * 重新登录成功后的回调
 * 调用此函数会 resolve 所有等待中的请求
 */
export const onReLoginSuccess = () => {
  resolveReLogin();
};

/**
 * 重新登录取消后的回调
 * 调用此函数会 reject 所有等待中的请求
 */
export const onReLoginCancel = () => {
  rejectReLogin(new Error("重新登录已取消"));
};

// ================= 使用示例 =================

// 1. 简单 GET 请求
// getData('/users')

// 2. 带参数的 GET 请求（推荐方式 - axios 会自动处理参数）
// getData('/users', { params: { page: 1, pageSize: 10 } })

// 3. 带请求头的 GET 请求
// getData('/users', {
//   params: { page: 1 },
//   headers: { 'X-Custom-Header': 'value' }
// })

// 4. POST 请求
// postData('/users', { name: '张三' })

// 5. POST 请求带额外配置
// postData('/users', { name: '张三' }, {
//   headers: { 'X-Custom-Header': 'value' }
// })

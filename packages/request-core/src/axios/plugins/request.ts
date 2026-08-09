/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-07 10:00:00
 * @LastEditors: ChenYu ycyplus@gmail.com
 * @LastEditTime: 2026-02-07 10:00:00
 * @FilePath: \robot-admin-request-core\src\axios\plugins\request.ts
 * @Description: 请求侧通用逻辑插件（预留 reLogin 管理）
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import type { AxiosInstance } from "axios";

/**
 * 处理 token 过期的共享 Promise
 */
let reLoginPromise: Promise<void> | null = null;
let reLoginResolve: (() => void) | null = null;
let reLoginReject: ((reason?: unknown) => void) | null = null;

/**
 * 创建重新登录 Promise
 */
export function waitForReLogin(): Promise<void> {
  if (!reLoginPromise) {
    reLoginPromise = new Promise<void>((resolve, reject) => {
      reLoginResolve = resolve;
      reLoginReject = reject;
    }).finally(() => {
      reLoginPromise = null;
      reLoginResolve = null;
      reLoginReject = null;
    });
  }
  return reLoginPromise;
}

/**
 * 获取重新登录 Promise
 */
export function getReLoginPromise(): Promise<void> | null {
  return reLoginPromise;
}

/**
 * 重新登录成功
 */
export function resolveReLogin(): void {
  if (reLoginResolve) {
    reLoginResolve();
  }
}

/**
 * 重新登录失败或取消
 */
export function rejectReLogin(reason?: unknown): void {
  if (reLoginReject) {
    reLoginReject(reason);
  }
}

/**
 * 设置请求插件（预留，具体逻辑由用户通过 interceptors 配置）
 */
export function setupRequestPlugin(instance: AxiosInstance): void {
  // 不做任何处理，由用户通过 createRequestCore 的 interceptors 配置
  // 例如：token 注入、请求头设置等
}

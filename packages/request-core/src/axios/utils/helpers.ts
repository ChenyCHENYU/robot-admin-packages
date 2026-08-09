/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-07 10:00:00
 * @LastEditors: ChenYu ycyplus@gmail.com
 * @LastEditTime: 2026-02-07 10:00:00
 * @FilePath: \robot-admin-request-core\src\axios\utils\helpers.ts
 * @Description: axios 插件 - 工具函数
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import type { AxiosRequestConfig, GenericAbortSignal } from "axios";
import type { CacheItem } from "../types";

/**
 * 对象键排序后序列化（确保相同对象生成相同的 key）
 * 增强版：处理数组排序和循环引用
 */
const binaryObjectIds = new WeakMap<object, number>();
let nextBinaryObjectId = 0;

function getBinaryObjectId(value: object): number {
  let id = binaryObjectIds.get(value);
  if (id === undefined) {
    id = ++nextBinaryObjectId;
    binaryObjectIds.set(value, id);
  }
  return id;
}

function sortedStringify(obj: any, seen = new WeakSet<object>()): string {
  if (obj === null || obj === undefined) {
    return "";
  }

  if (typeof obj === "bigint") return `bigint:${obj.toString()}`;
  if (typeof obj !== "object") {
    return `${typeof obj}:${String(obj)}`;
  }

  // 处理循环引用 - 抛出错误而不是静默处理
  if (seen.has(obj)) {
    throw new Error("检测到循环引用，无法生成稳定的缓存键");
  }
  seen.add(obj);

  try {
    if (Array.isArray(obj)) {
      return `[${obj.map((item) => sortedStringify(item, seen)).join(",")}]`;
    }

    if (obj instanceof Date) return `date:${obj.toISOString()}`;

    if (typeof URLSearchParams !== "undefined" && obj instanceof URLSearchParams) {
      return `url-search:${JSON.stringify(Array.from(obj.entries()).sort())}`;
    }

    if (typeof FormData !== "undefined" && obj instanceof FormData) {
      const entries = Array.from(obj.entries()).map(([key, value]) => [
        key,
        typeof value === "string"
          ? `string:${value}`
          : `binary:${getBinaryObjectId(value)}:${value.name}:${value.size}:${value.type}`,
      ]);
      return `form-data:${JSON.stringify(entries)}`;
    }

    if (
      (typeof Blob !== "undefined" && obj instanceof Blob) ||
      obj instanceof ArrayBuffer ||
      ArrayBuffer.isView(obj)
    ) {
      return `binary:${getBinaryObjectId(obj)}`;
    }

    const source =
      typeof obj.toJSON === "function" && obj.constructor?.name === "AxiosHeaders"
        ? obj.toJSON()
        : obj;
    const sortedKeys = Object.keys(source).sort();
    return `{${sortedKeys
      .map((key) => `${JSON.stringify(key)}:${sortedStringify(source[key], seen)}`)
      .join(",")}}`;
  } finally {
    seen.delete(obj);
  }
}

/**
 * 生成请求唯一标识 key
 *
 * 注意：默认会纳入鉴权相关请求头（Authorization / X-Tenant-Id），
 * 避免多租户/多用户场景下不同身份命中同一缓存或被去重合并造成数据串台。
 */
export function generateRequestKey(config: AxiosRequestConfig): string {
  const { method = "get", url = "", params, data, headers } = config;

  const parts: string[] = [method.toUpperCase(), url];

  // 添加 params（GET 请求参数）- 使用排序后的序列化
  if (params != null) {
    parts.push(sortedStringify(params));
  }

  // 添加 data（POST 请求体）- 使用排序后的序列化
  if (data != null) {
    parts.push(sortedStringify(data));
  }

  // 纳入鉴权/租户上下文相关头，防止跨用户缓存命中与去重合并
  if (headers) {
    const authHeaders: Record<string, string> = {};
    const authKeys = ["authorization", "x-tenant-id", "x-user-id"];
    const lowerHeaders: Record<string, any> = {};
    const headerSource =
      typeof (headers as any).toJSON === "function"
        ? (headers as any).toJSON()
        : headers;
    for (const [k, v] of Object.entries(headerSource)) {
      lowerHeaders[String(k).toLowerCase()] = v;
    }
    for (const key of authKeys) {
      if (lowerHeaders[key] != null) {
        authHeaders[key] = String(lowerHeaders[key]);
      }
    }
    if (Object.keys(authHeaders).length > 0) {
      parts.push(sortedStringify(authHeaders));
    }
  }

  return parts.join("|");
}

/**
 * 内存缓存管理器（增强版：支持大小限制和 LRU）
 */
export class MemoryCache {
  private cache = new Map<string, CacheItem>();
  private maxSize = 1000; // 最大缓存数量
  private accessOrder = new Set<string>(); // 记录访问顺序

  /**
   * 获取缓存
   */
  get<T = any>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) return null;

    // 检查是否过期
    if (Date.now() > item.expireAt) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return null;
    }

    // 更新访问顺序（LRU）
    this.accessOrder.delete(key);
    this.accessOrder.add(key);

    return item.data as T;
  }

  /**
   * 设置缓存
   */
  set<T = any>(key: string, data: T, ttl: number): void {
    if (!Number.isFinite(ttl) || ttl < 0) {
      throw new RangeError("缓存 TTL 必须是大于或等于 0 的有限数值");
    }

    if (this.maxSize === 0) return;

    // 如果超过最大大小，清理最旧的缓存
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    const expireAt = Date.now() + ttl;

    this.cache.set(key, {
      data,
      expireAt,
    });

    // 更新访问顺序
    this.accessOrder.delete(key);
    this.accessOrder.add(key);
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    this.accessOrder.delete(key);
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    for (const [key, item] of entries) {
      if (now > item.expireAt) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
      }
    }
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 设置最大缓存大小
   */
  setMaxSize(size: number): void {
    if (!Number.isInteger(size) || size < 0) {
      throw new RangeError("缓存最大容量必须是大于或等于 0 的整数");
    }

    this.maxSize = size;

    // 如果当前缓存超过新的大小限制，清理最旧的
    while (this.cache.size > this.maxSize) {
      this.evictOldest();
    }
  }

  /**
   * 清理最旧的缓存（LRU）
   */
  private evictOldest(): void {
    const oldestKey = this.accessOrder.values().next().value;
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
    }
  }
}

/**
 * 全局缓存实例
 */
export const globalCache = new MemoryCache();

/**
 * 延迟函数
 */
export function delay(ms: number, signal?: GenericAbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(createAbortError((signal as AbortSignal).reason));
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener?.("abort", onAbort);
      resolve();
    }, Math.max(0, Number.isFinite(ms) ? ms : 0));

    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener?.("abort", onAbort);
      reject(createAbortError((signal as AbortSignal | undefined)?.reason));
    };

    signal?.addEventListener?.("abort", onAbort, { once: true });
  });
}

function createAbortError(reason?: unknown): Error {
  if (reason instanceof Error) return reason;
  return Object.assign(new Error("canceled"), {
    name: "AbortError",
    code: "ERR_CANCELED",
    reason,
  });
}

/**
 * 判断是否为网络错误
 */
export function isNetworkError(error: any): boolean {
  return (
    !error.response &&
    Boolean(error.code) &&
    error.code !== "ECONNABORTED" &&
    error.code !== "ERR_CANCELED" &&
    error.message !== "canceled" &&
    error.message !== "Request aborted" &&
    error.message !== "Request cancelled"
  );
}

/**
 * 判断是否为超时错误（基于 axios 的 error.code，避免依赖易变的消息字符串）
 */
export function isTimeoutError(error: any): boolean {
  return error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT";
}

/**
 * 判断是否为可重试的状态码
 */
export function isRetryableStatus(
  status: number,
  retryableStatusCodes: number[],
): boolean {
  return retryableStatusCodes.includes(status);
}

/**
 * 规范化配置（将 boolean 转换为对象）
 */
export function normalizeConfig<T extends Record<string, any>>(
  config: boolean | T | undefined,
  defaults: T,
): T {
  if (config === true) {
    return { ...defaults, enabled: true };
  }

  if (config === false) {
    return { ...defaults, enabled: false };
  }

  if (config && typeof config === "object") {
    const definedEntries = Object.entries(config).filter(
      ([, value]) => value !== undefined,
    );
    return { ...defaults, ...Object.fromEntries(definedEntries) };
  }

  return defaults;
}

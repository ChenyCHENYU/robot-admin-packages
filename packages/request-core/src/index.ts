/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-07 10:00:00
 * @LastEditors: ChenYu ycyplus@gmail.com
 * @LastEditTime: 2026-02-07 10:00:00
 * @FilePath: \robot-admin-request-core\src\index.ts
 * @Description: @robot-admin/request-core - 统一请求核心库主入口
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

/**
 * @packageDocumentation
 * @robot-admin/request-core
 *
 * @description
 * 统一请求核心库，整合 axios 封装（6 个插件）+ useTableCrud composable
 *
 * ## 核心功能
 *
 * ### 1. Axios 封装（6 个内置插件）
 * - **cache**: 请求缓存（内存缓存，支持 TTL）
 * - **retry**: 请求重试（指数退避）
 * - **dedupe**: 请求去重（AbortController）
 * - **cancel**: 自动取消（路由切换）
 * - **request**: 通用请求逻辑（reLogin 管理）
 * - **response**: 通用响应逻辑（预留）
 * - **reLogin**: 重新登录管理（Promise 队列）
 *
 * ### 2. useTableCrud Composable
 * - 配置驱动的表格 CRUD 解决方案
 * - 支持分页、搜索、排序、自定义操作
 * - 内置详情查看、编辑、删除等功能
 *
 * ## 安装
 *
 * ```bash
 * npm install @robot-admin/request-core
 * # or
 * bun add @robot-admin/request-core
 * ```
 *
 * ## 使用示例
 *
 * ### 初始化 Request Core
 *
 * ```ts
 * // main.ts
 * import { createApp } from 'vue'
 * import { createRequestCore } from '@robot-admin/request-core'
 *
 * const app = createApp(App)
 *
 * const requestCore = createRequestCore({
 *   request: {
 *     baseURL: import.meta.env.VITE_API_BASE,
 *     timeout: 10000,
 *   },
 *   interceptors: {
 *     request: (config) => {
 *       // 注入 token
 *       const token = localStorage.getItem('token')
 *       if (token) config.headers.Authorization = `Bearer ${token}`
 *       return config
 *     },
 *     response: (response) => {
 *       // 处理业务码
 *       const { code, message } = response.data
 *       if (code !== 200) return Promise.reject(new Error(message))
 *       return response
 *     }
 *   }
 * })
 *
 * app.use(requestCore)
 * ```
 *
 * ### 使用 useTableCrud
 *
 * ```ts
 * // pages/employee/index.vue
 * import { useTableCrud } from '@robot-admin/request-core'
 *
 * const table = useTableCrud({
 *   api: {
 *     list: '/employees/list',
 *     get: '/employees/:id',
 *     update: '/employees/:id',
 *     remove: '/employees/:id',
 *   },
 *   columns: [
 *     { key: 'name', title: '姓名' },
 *     { key: 'age', title: '年龄' },
 *   ]
 * })
 * ```
 *
 * ### 使用插件配置
 *
 * ```ts
 * import { getData } from '@robot-admin/request-core'
 *
 * // 开启缓存（5 分钟）
 * const data = await getData('/api/users', {
 *   cache: { enabled: true, ttl: 300000 }
 * })
 *
 * // 开启重试（3 次）
 * const data = await getData('/api/users', {
 *   retry: { enabled: true, count: 3 }
 * })
 * ```
 *
 * @author ChenYu <ycyplus@gmail.com>
 * @since 0.1.0
 */

// ==================== 核心 API ====================
export { createRequestCore, getGlobalConfig } from "./core";
export type {
  RequestCoreConfig,
  InterceptorConfig,
  FieldAliases,
} from "./core";

// Axios 相关
export {
  createAxiosInstance,
  getData,
  postData,
  putData,
  deleteData,
  waitForReLogin,
  getReLoginPromise,
  onReLoginSuccess,
  onReLoginCancel,
  // 插件工具函数
  cancelAllPendingRequests,
  getPendingRequestCount,
  clearAllCache,
  clearCache,
  cleanupExpiredCache,
  getCacheSize,
  cancelAllRequests,
  getCancelableRequestCount,
} from "./axios/request";

// Axios 类型
export type {
  EnhancedAxiosRequestConfig,
  DedupeConfig,
  CacheConfig,
  RetryConfig,
  CancelConfig,
  CacheItem,
  RequestKeyParams,
} from "./axios/types";

// CRUD Composables
export { useTableCrud } from "./composables/useTableCrud";
export type {
  DataRecord,
  UseTableCrudConfig,
  UseTableCrudReturn,
  ApiEndpoints,
  TableColumn,
  ActionContext,
  CustomAction,
  DetailModal,
  DetailItem,
  DetailSection,
  DetailConfig,
} from "./composables/useTableCrud/types";

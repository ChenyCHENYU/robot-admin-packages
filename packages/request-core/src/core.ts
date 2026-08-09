/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-07 10:00:00
 * @LastEditors: ChenYu ycyplus@gmail.com
 * @LastEditTime: 2026-02-07 10:00:00
 * @FilePath: \robot-admin-request-core\src\core.ts
 * @Description: Request Core - 核心配置和初始化 API
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import type { App } from "vue";
import type {
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { createAxiosInstance } from "./axios/request";
import { setGlobalAxiosInstance } from "./axios/service";

/**
 * 全局配置存储
 */
let globalConfig: Required<
  Pick<RequestCoreConfig, "successCodes" | "fieldAliases">
> = {
  successCodes: [200, 0, "200", "0"],
  fieldAliases: {
    data: ["data", "list", "items", "records"],
    list: ["list", "items", "records", "rows", "data"],
    total: ["total", "totalCount", "count", "totalElements"],
  },
};

/**
 * 获取全局配置
 */
export function getGlobalConfig() {
  return globalConfig;
}

/**
 * 拦截器配置
 *
 * @description
 * 用于配置 axios 请求和响应拦截器，处理 token 注入、业务码判断等业务逻辑
 */
export interface InterceptorConfig {
  /**
   * 请求拦截器
   * @description 在请求发送前执行，常用于注入 token、修改请求头等
   */
  request?: (
    config: InternalAxiosRequestConfig,
  ) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;

  /**
   * 请求错误拦截器
   * @description 请求配置阶段发生错误时执行
   */
  requestError?: (error: any) => any;

  /**
   * 响应拦截器
   * @description 响应到达后执行，常用于统一处理业务码、数据格式等
   */
  response?: (
    response: AxiosResponse,
  ) => AxiosResponse | Promise<AxiosResponse>;

  /**
   * 响应错误拦截器
   * @description 响应阶段发生错误时执行，常用于处理 401、403、500 等错误
   */
  responseError?: (error: any) => any;
}

/**
 * 字段别名配置
 *
 * @description
 * 用于自定义 API 响应的字段映射，适配不同的后端响应格式
 */
export interface FieldAliases {
  /**
   * 数据层字段别名（用于提取响应中的 data 层）
   * @default ['data', 'list', 'items', 'records']
   * @example ['result', 'payload']
   */
  data?: string[];

  /**
   * 列表字段别名（用于提取数据层中的列表数组）
   * @default ['list', 'items', 'records', 'rows', 'data']
   * @example ['employees', 'users', 'products']
   */
  list?: string[];

  /**
   * 总数字段别名（用于提取数据总数）
   * @default ['total', 'totalCount', 'count', 'totalElements']
   * @example ['totalRecords', 'totalItems']
   */
  total?: string[];
}

/**
 * Request Core 配置
 *
 * @description
 * 用于初始化 Request Core 实例，配置 axios 和拦截器
 */
export interface RequestCoreConfig {
  /**
   * Axios 基础配置
   * @description 包括 baseURL、timeout、headers 等，参考 axios 官方文档
   */
  request?: AxiosRequestConfig;

  /**
   * 拦截器配置
   * @description 用于处理 token 注入、业务码判断、错误提示等业务逻辑
   */
  interceptors?: InterceptorConfig;

  /**
   * 成功状态码配置
   * @description 用于判断 API 响应的业务状态码是否成功
   * @default [200, 0, '200', '0']
   * @example [1, '1', 'success']
   */
  successCodes?: Array<number | string>;

  /**
   * 字段别名配置
   * @description 用于自定义 API 响应的字段映射，适配不同的后端响应格式
   */
  fieldAliases?: FieldAliases;
}

/**
 * 创建 Request Core 实例
 *
 * @description
 * 初始化 axios 实例并注册 6 个内置插件；reLogin 通过显式共享 Promise 协调
 * 返回 Vue 插件对象和 axios 实例
 *
 * @param config Request Core 配置
 * @returns Vue 插件对象（包含 install 方法）和 axios 实例
 *
 * @example
 * ```ts
 * // main.ts
 * import {
 *   createRequestCore,
 *   getReLoginPromise,
 *   waitForReLogin,
 *   onReLoginSuccess,
 *   onReLoginCancel,
 * } from '@robot-admin/request-core'
 * import { useUserStore } from '@/stores/user'
 *
 * const requestCore = createRequestCore({
 *   request: {
 *     baseURL: import.meta.env.VITE_API_BASE,
 *     timeout: 10000,
 *   },
 *   interceptors: {
 *     // 请求拦截：注入 token
 *     request: (config) => {
 *       const token = localStorage.getItem('token')
 *       if (token) {
 *         config.headers.Authorization = `Bearer ${token}`
 *       }
 *       return config
 *     },
 *     // 响应拦截：处理业务码
 *     response: (response) => {
 *       const { code, message } = response.data
 *       if (code !== 200) {
 *         window.$message?.error(message || '请求失败')
 *         return Promise.reject(new Error(message))
 *       }
 *       return response
 *     },
 *     // 响应错误拦截：处理 401
 *     responseError: async (error) => {
 *       if (error.response?.status === 401) {
 *         const shouldStartLogin = !getReLoginPromise()
 *         const waiting = waitForReLogin()
 *         const userStore = useUserStore()
 *         if (shouldStartLogin) {
 *           userStore.reLogin().then(onReLoginSuccess, onReLoginCancel)
 *         }
 *         await waiting
 *         return requestCore.axiosInstance.request(error.config)
 *       }
 *       return Promise.reject(error)
 *     }
 *   }
 * })
 *
 * app.use(requestCore)
 * ```
 */
export function createRequestCore(config: RequestCoreConfig = {}) {
  const {
    request = {},
    interceptors = {},
    successCodes,
    fieldAliases,
  } = config;

  // 合并全局配置
  if (successCodes) {
    globalConfig.successCodes = successCodes;
  }
  if (fieldAliases) {
    globalConfig.fieldAliases = {
      data: fieldAliases.data || globalConfig.fieldAliases.data,
      list: fieldAliases.list || globalConfig.fieldAliases.list,
      total: fieldAliases.total || globalConfig.fieldAliases.total,
    };
  }

  // 创建 axios 实例
  const axiosInstance = createAxiosInstance(request);

  // 设置为全局实例
  setGlobalAxiosInstance(axiosInstance);

  // 注册拦截器
  if (interceptors.request) {
    axiosInstance.interceptors.request.use(
      interceptors.request,
      interceptors.requestError,
    );
  }

  if (interceptors.response) {
    axiosInstance.interceptors.response.use(
      interceptors.response,
      interceptors.responseError,
    );
  }

  return {
    install(app: App) {
      // 可以挂载到 app.config.globalProperties
      app.config.globalProperties.$axios = axiosInstance;
    },
    axiosInstance,
  };
}

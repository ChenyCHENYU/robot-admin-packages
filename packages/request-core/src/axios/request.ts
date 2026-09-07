import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import { rejectReLogin, resolveReLogin, setupPlugins } from "./plugins";
import {
  attachRequestRuntime,
  createRequestRuntime,
  type CreateRequestRuntimeOptions,
} from "./runtime";
import type { EnhancedAxiosInstance } from "./types";

export {
  setGlobalAxiosInstance,
  getGlobalAxiosInstance,
  getData,
  postData,
  putData,
  patchData,
  deleteData,
} from "./service";
export { default } from "./service";

/** Creates an isolated Axios instance with request-core lifecycle policies. */
export function createAxiosInstance(
  config: AxiosRequestConfig = {},
  runtimeOptions: CreateRequestRuntimeOptions = {},
): EnhancedAxiosInstance {
  const instance = axios.create({
    timeout: 5000,
    headers: { "Content-Type": "application/json" },
    ...config,
  });
  const runtime = createRequestRuntime(runtimeOptions);
  attachRequestRuntime(instance, runtime);
  setupPlugins(instance, runtime);
  return instance as EnhancedAxiosInstance;
}

export {
  waitForReLogin,
  getReLoginPromise,
  cancelAllPendingRequests,
  getPendingRequestCount,
  clearAllCache,
  clearCache,
  clearCacheByPrefix,
  clearCacheByTag,
  cleanupExpiredCache,
  getCacheSize,
  cancelAllRequests,
  cancelRequestScope,
  getCancelableRequestCount,
} from "./plugins";

export const onReLoginSuccess = (instance?: AxiosInstance): void => {
  resolveReLogin(instance);
};

export const onReLoginCancel = (instance?: AxiosInstance): void => {
  rejectReLogin(new Error("重新登录已取消"), instance);
};

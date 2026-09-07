/**
 * Axios-only entry point. It deliberately excludes useTableCrud so consumers
 * that only need request orchestration do not load Vue/Naive UI code.
 */
export {
  createAxiosInstance,
  setGlobalAxiosInstance,
  getGlobalAxiosInstance,
  getData,
  postData,
  putData,
  patchData,
  deleteData,
  waitForReLogin,
  getReLoginPromise,
  onReLoginSuccess,
  onReLoginCancel,
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
} from "../axios/request";

export { createRequestCore, getGlobalConfig } from "../core";
export type {
  RequestCoreConfig,
  InterceptorConfig,
  FieldAliases,
} from "../core";

export { createRequestClient, setDefaultRequestClient } from "../client/client";
export {
  RequestError,
  isRequestError,
  isCanceledError,
  normalizeRequestError,
} from "../client/errors";
export type {
  RequestClient,
  RequestClientConfig,
  RequestConfig,
  RequestAuthConfig,
  RequestHooks,
  RequestInterceptors,
  ResponseAdapter,
  BusinessErrorDescriptor,
} from "../client/types";

export type {
  EnhancedAxiosRequestConfig,
  EnhancedAxiosInstance,
  DedupeConfig,
  CacheConfig,
  RetryConfig,
  CancelConfig,
  CacheItem,
  RequestKeyParams,
  RequestKeyOptions,
  RequestScope,
  ConcurrencyPolicy,
  RequestPolicyDefaults,
  CacheStore,
  MemoryCacheOptions,
  RetryContext,
} from "../axios/types";

export { MemoryCache, generateRequestKey } from "../axios/utils/helpers";

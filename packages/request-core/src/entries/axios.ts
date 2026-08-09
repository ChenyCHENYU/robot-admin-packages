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
  deleteData,
  waitForReLogin,
  getReLoginPromise,
  onReLoginSuccess,
  onReLoginCancel,
  cancelAllPendingRequests,
  getPendingRequestCount,
  clearAllCache,
  clearCache,
  cleanupExpiredCache,
  getCacheSize,
  cancelAllRequests,
  getCancelableRequestCount,
} from "../axios/request";

export type {
  EnhancedAxiosRequestConfig,
  DedupeConfig,
  CacheConfig,
  RetryConfig,
  CancelConfig,
  CacheItem,
  RequestKeyParams,
} from "../axios/types";

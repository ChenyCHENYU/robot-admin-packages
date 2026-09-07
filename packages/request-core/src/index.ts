/**
 * @packageDocumentation
 * Compatibility entry for @robot-admin/request-core.
 *
 * New request-only code should use `/axios`, headless Vue code should use
 * `/vue`, and Naive UI integration should use `/naive`.
 */

export { createRequestCore, getGlobalConfig } from "./core";
export type {
  RequestCoreConfig,
  InterceptorConfig,
  FieldAliases,
} from "./core";

export {
  createAxiosInstance,
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
} from "./axios/request";

export { createRequestClient, setDefaultRequestClient } from "./client/client";
export {
  RequestError,
  isRequestError,
  isCanceledError,
  normalizeRequestError,
} from "./client/errors";
export type {
  RequestClient,
  RequestClientConfig,
  RequestConfig,
  RequestAuthConfig,
  RequestHooks,
  RequestInterceptors,
  ResponseAdapter,
  BusinessErrorDescriptor,
} from "./client/types";

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
} from "./axios/types";
export { MemoryCache, generateRequestKey } from "./axios/utils/helpers";

/** @deprecated Prefer useTableCrud from /vue or useNaiveTableCrud from /naive. */
export { useTableCrud } from "./entries/crud";
export { useNaiveTableCrud } from "./naive/useNaiveTableCrud";
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

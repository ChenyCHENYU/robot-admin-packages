import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";

export type RequestScope = string | symbol;
export type ConcurrencyPolicy = "allow" | "join" | "takeLatest" | "takeFirst";

export interface DedupeConfig {
  /** @default true for GET/HEAD/OPTIONS, false for mutation methods */
  enabled?: boolean;
  keyGenerator?: (config: AxiosRequestConfig) => string;
}

export interface CacheConfig {
  /** @default false */
  enabled?: boolean;
  /** Cache lifetime in milliseconds. @default 300000 */
  ttl?: number;
  /** Skip reads while still replacing the stored value. */
  forceUpdate?: boolean;
  /** Optional invalidation tags associated with this entry. */
  tags?: readonly string[];
  /** Additional response-varying request headers included in the cache key. */
  varyHeaders?: readonly string[];
  /** Override the generated cache key for this request. */
  key?: string;
}

export interface RetryContext {
  attempt: number;
  delay: number;
  elapsed: number;
  error: AxiosError;
  config: EnhancedAxiosRequestConfig;
}

export interface RetryConfig {
  /** @default false */
  enabled?: boolean;
  /** Number of retry attempts after the initial request. @default 3 */
  count?: number;
  /** Base retry delay in milliseconds. @default 1000 */
  delay?: number;
  /** @default true */
  exponentialBackoff?: boolean;
  /** @default true */
  jitter?: boolean;
  retryableStatusCodes?: number[];
  /** @default GET, HEAD, OPTIONS, PUT and DELETE */
  retryableMethods?: string[];
  /** Maximum delay for one retry. @default 30000 */
  maxDelay?: number;
  /** Maximum elapsed retry time. Zero disables the limit. @default 0 */
  maxElapsedMs?: number;
  /** Honor Retry-After for 429/503 responses. @default true */
  respectRetryAfter?: boolean;
  /** Allow replaying stream-like request bodies. @default false */
  retryUnsafeBody?: boolean;
  shouldRetry?: (error: AxiosError, attempt: number) => boolean | Promise<boolean>;
  onRetry?: (context: RetryContext) => void | Promise<void>;
}

export interface CancelConfig {
  /** Track the request so it can be canceled by scope or as a group. @default true */
  enabled?: boolean;
  whitelist?: RegExp[];
  scope?: RequestScope;
}

export interface RequestPolicyDefaults {
  cache?: boolean | CacheConfig;
  retry?: boolean | RetryConfig;
  dedupe?: boolean | DedupeConfig;
  cancel?: boolean | CancelConfig;
  concurrency?: ConcurrencyPolicy;
}

export interface EnhancedAxiosRequestConfig<D = unknown>
  extends AxiosRequestConfig<D> {
  dedupe?: boolean | DedupeConfig;
  cache?: boolean | CacheConfig;
  retry?: boolean | RetryConfig;
  cancel?: boolean | CancelConfig;
  concurrency?: ConcurrencyPolicy;
  scope?: RequestScope;
  /** Skip token injection and unauthorized recovery for this request. */
  skipAuth?: boolean;
  /** Skip the client-level error callback for this request. */
  silent?: boolean;

  /** @internal */
  __retryCount?: number;
  /** @internal */
  __retryStartedAt?: number;
  /** @internal */
  __cancelId?: string;
  /** @internal */
  __requestKey?: string;
  /** @internal */
  __fromCache?: boolean;
  /** @internal */
  __cachedResponse?: AxiosResponse;
  /** @internal */
  __abortController?: EnhancedAbortController;
  /** @internal */
  __externalSignal?: AxiosRequestConfig["signal"];
  /** @internal */
  __abortCleanup?: () => void;
  /** @internal */
  __managedByCancel?: boolean;
  /** @internal */
  __handling401?: boolean;
  /** @internal */
  __authRetryCount?: number;
}

export type EnhancedAxiosInstance = AxiosInstance & {
  request<T = unknown, R = AxiosResponse<T>, D = unknown>(
    config: EnhancedAxiosRequestConfig<D>,
  ): Promise<R>;
  get<T = unknown, R = AxiosResponse<T>, D = unknown>(
    url: string,
    config?: EnhancedAxiosRequestConfig<D>,
  ): Promise<R>;
  delete<T = unknown, R = AxiosResponse<T>, D = unknown>(
    url: string,
    config?: EnhancedAxiosRequestConfig<D>,
  ): Promise<R>;
  head<T = unknown, R = AxiosResponse<T>, D = unknown>(
    url: string,
    config?: EnhancedAxiosRequestConfig<D>,
  ): Promise<R>;
  options<T = unknown, R = AxiosResponse<T>, D = unknown>(
    url: string,
    config?: EnhancedAxiosRequestConfig<D>,
  ): Promise<R>;
  post<T = unknown, R = AxiosResponse<T>, D = unknown>(
    url: string,
    data?: D,
    config?: EnhancedAxiosRequestConfig<D>,
  ): Promise<R>;
  put<T = unknown, R = AxiosResponse<T>, D = unknown>(
    url: string,
    data?: D,
    config?: EnhancedAxiosRequestConfig<D>,
  ): Promise<R>;
  patch<T = unknown, R = AxiosResponse<T>, D = unknown>(
    url: string,
    data?: D,
    config?: EnhancedAxiosRequestConfig<D>,
  ): Promise<R>;
};

export interface CacheItem<T = unknown> {
  data: T;
  expireAt: number;
  tags?: readonly string[];
}

export interface CacheStore {
  get<T = unknown>(key: string): T | null;
  set<T = unknown>(
    key: string,
    data: T,
    ttl: number,
    options?: { tags?: readonly string[] },
  ): void;
  delete(key: string): boolean;
  clear(): void;
  cleanup?(): void;
  deleteByPrefix?(prefix: string): number;
  deleteByTag?(tag: string): number;
  readonly size: number;
}

export interface MemoryCacheOptions {
  maxSize?: number;
  clone?: boolean | (<T>(value: T) => T);
}

export interface RequestKeyParams {
  method?: string;
  url?: string;
  baseURL?: string;
  params?: unknown;
  data?: unknown;
}

export interface RequestKeyOptions {
  varyHeaders?: readonly string[];
}

export interface EnhancedAbortController extends AbortController {
  _startTime?: number;
}

export interface CachedResponseData {
  data: unknown;
  status: number;
  statusText: string;
  headers: Record<string, unknown>;
}

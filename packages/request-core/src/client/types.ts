import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import type {
  CacheStore,
  EnhancedAxiosRequestConfig,
  MemoryCacheOptions,
  RequestPolicyDefaults,
  RequestScope,
} from "../axios/types";
import type { FieldAliases } from "../core";
import type { RequestError } from "./errors";

export type MaybePromise<T> = T | Promise<T>;
export type AuthTokenResult = string | { token: string } | null | undefined | void;

export interface RawRequest {
  <T = unknown, D = unknown>(
    config: EnhancedAxiosRequestConfig<D>,
  ): Promise<AxiosResponse<T, D>>;
}

export interface AuthContext {
  raw: RawRequest;
  signal?: AbortSignal;
}

export interface RequestAuthConfig {
  getToken: () => MaybePromise<string | null | undefined>;
  applyToken?: (
    config: InternalAxiosRequestConfig,
    token: string,
  ) => MaybePromise<void>;
  shouldRefresh?: () => MaybePromise<boolean>;
  refresh?: (context: AuthContext) => Promise<AuthTokenResult>;
  reauthenticate?: (context: AuthContext) => Promise<AuthTokenResult>;
  isAuthRequest?: (config: AxiosRequestConfig) => boolean;
  isUnauthorized?: (error: AxiosError) => boolean;
  /** Continue with the existing token if proactive refresh fails. @default true */
  continueOnProactiveRefreshError?: boolean;
}

export interface BusinessErrorDescriptor<T = unknown> {
  message: string;
  code?: string | number;
  data?: T;
}

export interface ResponseAdapter {
  isSuccess?: (
    data: unknown,
    response: AxiosResponse,
  ) => MaybePromise<boolean>;
  getData?: (data: unknown, response: AxiosResponse) => MaybePromise<unknown>;
  getError?: (
    data: unknown,
    response: AxiosResponse,
  ) => MaybePromise<BusinessErrorDescriptor | string>;
}

export interface RequestInterceptors {
  request?: (
    config: InternalAxiosRequestConfig,
  ) => MaybePromise<InternalAxiosRequestConfig>;
  requestError?: (error: AxiosError) => unknown;
  response?: (response: AxiosResponse) => MaybePromise<AxiosResponse>;
  responseError?: (error: AxiosError) => unknown;
}

export interface RequestHooks {
  onRequestStart?: (config: EnhancedAxiosRequestConfig) => MaybePromise<void>;
  onRequestEnd?: (context: {
    config: EnhancedAxiosRequestConfig;
    response: AxiosResponse;
    duration: number;
    fromCache: boolean;
  }) => MaybePromise<void>;
  onError?: (error: RequestError) => MaybePromise<void>;
}

export interface RequestClientConfig {
  request?: AxiosRequestConfig;
  defaults?: RequestPolicyDefaults;
  cache?: CacheStore | MemoryCacheOptions;
  auth?: RequestAuthConfig;
  response?: ResponseAdapter;
  interceptors?: RequestInterceptors;
  hooks?: RequestHooks;
  /** Make legacy getData/postData helpers point at this client. @default false */
  setAsDefault?: boolean;
  successCodes?: Array<number | string>;
  fieldAliases?: FieldAliases;
}

export interface RequestConfig<D = unknown>
  extends EnhancedAxiosRequestConfig<D> {}

export interface RequestCacheController {
  clear(): void;
  delete(config: AxiosRequestConfig): boolean;
  invalidatePrefix(prefix: string): number;
  invalidateTag(tag: string): number;
  cleanup(): void;
  readonly size: number;
}

export interface RequestLifecycleController {
  cancelAll(): void;
  cancelScope(scope: RequestScope): number;
  readonly pending: number;
}

export interface RequestClient {
  readonly axios: AxiosInstance;
  request<T = unknown, D = unknown>(config: RequestConfig<D>): Promise<T>;
  raw<T = unknown, D = unknown>(
    config: RequestConfig<D>,
  ): Promise<AxiosResponse<T, D>>;
  get<T = unknown>(url: string, config?: RequestConfig): Promise<T>;
  delete<T = unknown>(url: string, config?: RequestConfig): Promise<T>;
  head<T = unknown>(url: string, config?: RequestConfig): Promise<T>;
  options<T = unknown>(url: string, config?: RequestConfig): Promise<T>;
  post<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: RequestConfig<D>,
  ): Promise<T>;
  put<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: RequestConfig<D>,
  ): Promise<T>;
  patch<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: RequestConfig<D>,
  ): Promise<T>;
  readonly cache: RequestCacheController;
  readonly requests: RequestLifecycleController;
  dispose(): void;
}

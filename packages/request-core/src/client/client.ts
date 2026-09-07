import type {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { createAxiosInstance } from "../axios/request";
import { setGlobalAxiosInstance } from "../axios/service";
import {
  getRequestRuntime,
  setGlobalRuntimeConfig,
  type RequestRuntime,
} from "../axios/runtime";
import {
  cancelAllRequests,
  cancelRequestScope,
  getCancelableRequestCount,
} from "../axios/plugins/cancel";
import {
  clearAllCache,
  clearCache,
  clearCacheByPrefix,
  clearCacheByTag,
  cleanupExpiredCache,
  getCacheSize,
} from "../axios/plugins/cache";
import { cancelAllPendingRequests } from "../axios/plugins/dedupe";
import type {
  CacheStore,
  EnhancedAxiosRequestConfig,
  RequestScope,
} from "../axios/types";
import { generateRequestKey, MemoryCache } from "../axios/utils/helpers";
import {
  normalizeRequestError,
  RequestError,
} from "./errors";
import type {
  AuthContext,
  AuthTokenResult,
  RequestAuthConfig,
  RequestClient,
  RequestClientConfig,
  RequestConfig,
} from "./types";

function isCacheStore(
  value: RequestClientConfig["cache"],
): value is CacheStore {
  const candidate = value as Partial<CacheStore> | undefined;
  return Boolean(
    candidate &&
      typeof candidate.get === "function" &&
      typeof candidate.set === "function" &&
      typeof candidate.delete === "function" &&
      typeof candidate.size === "number" &&
      typeof candidate.clear === "function",
  );
}

function tokenFromResult(result: AuthTokenResult): string | null {
  if (typeof result === "string") return result;
  if (result && typeof result === "object") return result.token;
  return null;
}

async function currentToken(auth: RequestAuthConfig): Promise<string | null> {
  return (await auth.getToken()) ?? null;
}

async function applyToken(
  auth: RequestAuthConfig,
  config: InternalAxiosRequestConfig,
  token: string,
): Promise<void> {
  if (auth.applyToken) {
    await auth.applyToken(config, token);
    return;
  }
  config.headers.set("Authorization", `Bearer ${token}`);
}

function createAuthContext(
  instance: AxiosInstance,
  signal?: AbortSignal,
): AuthContext {
  return {
    signal,
    raw: async <T = unknown, D = unknown>(request: EnhancedAxiosRequestConfig<D>) => {
      const rawRequest: EnhancedAxiosRequestConfig<D> = {
        ...request,
        skipAuth: true,
        dedupe: false,
        cache: false,
        cancel: false,
        retry: false,
        concurrency: "allow",
      };
      return instance.request<T, AxiosResponse<T, D>, D>(rawRequest);
    },
  };
}

async function refreshOnce(
  instance: AxiosInstance,
  runtime: RequestRuntime,
  auth: RequestAuthConfig,
  signal?: AbortSignal,
): Promise<string | null> {
  if (!auth.refresh) return null;
  if (!runtime.authRefreshPromise) {
    runtime.authRefreshPromise = (async () => {
      const result = await auth.refresh?.(createAuthContext(instance, signal));
      return tokenFromResult(result) ?? currentToken(auth);
    })().finally(() => {
      runtime.authRefreshPromise = null;
    });
  }
  return runtime.authRefreshPromise;
}

async function reauthenticateOnce(
  instance: AxiosInstance,
  runtime: RequestRuntime,
  auth: RequestAuthConfig,
  signal?: AbortSignal,
): Promise<string | null> {
  if (!auth.reauthenticate) return null;
  if (!runtime.reauthenticatePromise) {
    runtime.reauthenticatePromise = (async () => {
      const result = await auth.reauthenticate?.(createAuthContext(instance, signal));
      return tokenFromResult(result) ?? currentToken(auth);
    })().finally(() => {
      runtime.reauthenticatePromise = null;
    });
  }
  return runtime.reauthenticatePromise;
}

function installAuthResponseInterceptor(
  instance: AxiosInstance,
  runtime: RequestRuntime,
  auth: RequestAuthConfig | undefined,
): void {
  if (!auth) return;
  instance.interceptors.response.use(undefined, async (error: AxiosError) => {
    const request = error.config as EnhancedAxiosRequestConfig | undefined;
    const unauthorized = auth.isUnauthorized
      ? auth.isUnauthorized(error)
      : error.response?.status === 401;
    if (
      !unauthorized ||
      !request ||
      request.skipAuth ||
      auth.isAuthRequest?.(request) ||
      (request.__authRetryCount ?? 0) >= 1
    ) {
      return Promise.reject(error);
    }

    request.__authRetryCount = 1;
    let token: string | null = null;
    try {
      token = await refreshOnce(
        instance,
        runtime,
        auth,
        request.signal as AbortSignal | undefined,
      );
    } catch {
      token = null;
    }
    if (!token) {
      token = await reauthenticateOnce(
        instance,
        runtime,
        auth,
        request.signal as AbortSignal | undefined,
      );
    }
    if (!token) return Promise.reject(error);

    await applyToken(auth, request as InternalAxiosRequestConfig, token);
    delete request.__cancelId;
    delete request.__requestKey;
    return instance.request(request);
  });
}

function installUserInterceptors(
  instance: AxiosInstance,
  config: RequestClientConfig,
): void {
  const interceptors = config.interceptors;
  if (!interceptors) return;
  if (interceptors.response || interceptors.responseError) {
    instance.interceptors.response.use(
      interceptors.response ?? ((response) => response),
      interceptors.responseError,
    );
  }
  if (interceptors.request || interceptors.requestError) {
    instance.interceptors.request.use(
      interceptors.request ?? ((request) => request),
      interceptors.requestError,
    );
  }
}

function installAuthRequestInterceptor(
  instance: AxiosInstance,
  runtime: RequestRuntime,
  auth: RequestAuthConfig | undefined,
): void {
  if (!auth) return;
  instance.interceptors.request.use(async (request) => {
    const enhanced = request as EnhancedAxiosRequestConfig;
    if (enhanced.skipAuth || auth.isAuthRequest?.(enhanced)) return request;

    let token = await currentToken(auth);
    if (auth.shouldRefresh && auth.refresh && (await auth.shouldRefresh())) {
      try {
        const refreshedToken = await refreshOnce(
          instance,
          runtime,
          auth,
          request.signal as AbortSignal | undefined,
        );
        if (refreshedToken) token = refreshedToken;
      } catch (error) {
        if (auth.continueOnProactiveRefreshError === false) throw error;
      }
    }
    if (token) await applyToken(auth, request, token);
    return request;
  });
}

async function joinedKey(
  instance: AxiosInstance,
  config: RequestConfig,
  auth?: RequestAuthConfig,
): Promise<string> {
  const method = (config.method ?? "get").toLowerCase();
  const identity = auth ? await currentToken(auth) : null;
  const defaultHeaders = instance.defaults.headers as unknown as Record<
    string,
    object | undefined
  >;
  return generateRequestKey({
    ...config,
    baseURL: config.baseURL ?? instance.defaults.baseURL,
    headers: {
      ...instance.defaults.headers.common,
      ...defaultHeaders[method],
      ...config.headers,
      ...(identity ? { authorization: `identity:${identity}` } : {}),
    },
  });
}

export function createRequestClient(
  config: RequestClientConfig = {},
): RequestClient {
  const cache = isCacheStore(config.cache)
    ? config.cache
    : new MemoryCache(config.cache);
  const instance = createAxiosInstance(config.request, {
    cache,
    defaults: { concurrency: "join", ...config.defaults },
  });
  const runtime = getRequestRuntime(instance);

  installAuthResponseInterceptor(instance, runtime, config.auth);
  installUserInterceptors(instance, config);
  installAuthRequestInterceptor(instance, runtime, config.auth);

  if (config.setAsDefault) {
    setGlobalAxiosInstance(instance);
    setGlobalRuntimeConfig({
      successCodes: config.successCodes,
      fieldAliases: config.fieldAliases,
    });
  }

  async function notifyError(error: unknown, request: RequestConfig): Promise<RequestError> {
    const normalized = normalizeRequestError(error);
    if (!request.silent && config.hooks?.onError) {
      try {
        await config.hooks.onError(normalized);
      } catch {
        // Diagnostic hooks must never replace the original request failure.
      }
    }
    return normalized;
  }

  async function executeRaw<T = unknown, D = unknown>(
    request: RequestConfig<D>,
  ): Promise<AxiosResponse<T, D>> {
    if (runtime.disposed) {
      throw new RequestError({
        kind: "configuration",
        message: "Request client has been disposed.",
      });
    }

    let policy =
      request.concurrency ?? runtime.defaults.concurrency ?? undefined;
    const method = (request.method ?? "get").toUpperCase();
    if (
      request.concurrency === undefined &&
      !["GET", "HEAD", "OPTIONS"].includes(method) &&
      policy === "join"
    ) {
      policy = "allow";
    }
    const executable: RequestConfig<D> = { ...request };
    if (policy === "allow") executable.dedupe = false;
    if (policy === "takeLatest") executable.dedupe = true;
    if (policy === "join" || policy === "takeFirst") executable.dedupe = false;

    const key =
      policy === "join" || policy === "takeFirst"
        ? await joinedKey(instance, executable, config.auth)
        : null;
    if (key) {
      const active = runtime.joinedRequests.get(key);
      if (active) {
        if (policy === "takeFirst") {
          throw new RequestError({
            kind: "concurrency",
            message: "An equivalent request is already running.",
            code: "REQUEST_ALREADY_RUNNING",
            config: executable,
          });
        }
        return active as Promise<AxiosResponse<T, D>>;
      }
    }

    const startedAt = Date.now();
    const pending = (async (): Promise<AxiosResponse<T, D>> => {
      try {
        await config.hooks?.onRequestStart?.(executable);
      } catch {
        // Hooks are observational and must not block a request.
      }
      const response = await instance.request<T, AxiosResponse<T, D>, D>(
        executable,
      );
      try {
        await config.hooks?.onRequestEnd?.({
          config: executable,
          response,
          duration: Date.now() - startedAt,
          fromCache: response.statusText.endsWith("(from cache)"),
        });
      } catch {
        // Hooks are observational and must not alter a successful response.
      }
      return response;
    })();
    if (key) {
      runtime.joinedRequests.set(key, pending);
      pending.then(
        () => runtime.joinedRequests.delete(key),
        () => runtime.joinedRequests.delete(key),
      );
    }
    return pending;
  }

  async function raw<T = unknown, D = unknown>(
    request: RequestConfig<D>,
  ): Promise<AxiosResponse<T, D>> {
    try {
      return await executeRaw<T, D>(request);
    } catch (error) {
      throw await notifyError(error, request);
    }
  }

  async function request<T = unknown, D = unknown>(
    requestConfig: RequestConfig<D>,
  ): Promise<T> {
    try {
      const response = await executeRaw<T, D>(requestConfig);
      if (
        config.response?.isSuccess &&
        !(await config.response.isSuccess(response.data, response))
      ) {
        const descriptor = await config.response.getError?.(
          response.data,
          response,
        );
        const details =
          typeof descriptor === "string"
            ? { message: descriptor }
            : descriptor ?? { message: "Business request failed." };
        throw new RequestError({
          kind: "business",
          message: details.message,
          code: details.code,
          data: details.data,
          status: response.status,
          config: requestConfig,
        });
      }
      if (config.response?.getData) {
        return (await config.response.getData(response.data, response)) as T;
      }
      return response.data;
    } catch (error) {
      throw await notifyError(error, requestConfig);
    }
  }

  const client: RequestClient = {
    axios: instance,
    request,
    raw,
    get: (url, requestConfig = {}) => request({ ...requestConfig, method: "GET", url }),
    delete: (url, requestConfig = {}) =>
      request({ ...requestConfig, method: "DELETE", url }),
    head: (url, requestConfig = {}) => request({ ...requestConfig, method: "HEAD", url }),
    options: (url, requestConfig = {}) =>
      request({ ...requestConfig, method: "OPTIONS", url }),
    post: (url, data, requestConfig = {}) =>
      request({ ...requestConfig, method: "POST", url, data }),
    put: (url, data, requestConfig = {}) =>
      request({ ...requestConfig, method: "PUT", url, data }),
    patch: (url, data, requestConfig = {}) =>
      request({ ...requestConfig, method: "PATCH", url, data }),
    cache: {
      clear: () => clearAllCache(instance),
      delete: (requestConfig) => clearCache(requestConfig, instance),
      invalidatePrefix: (prefix) => clearCacheByPrefix(prefix, instance),
      invalidateTag: (tag) => clearCacheByTag(tag, instance),
      cleanup: () => cleanupExpiredCache(instance),
      get size() {
        return getCacheSize(instance);
      },
    },
    requests: {
      cancelAll: () => cancelAllRequests(instance),
      cancelScope: (scope: RequestScope) => cancelRequestScope(scope, instance),
      get pending() {
        return getCancelableRequestCount(instance);
      },
    },
    dispose: () => {
      if (runtime.disposed) return;
      cancelAllRequests(instance);
      cancelAllPendingRequests(instance);
      runtime.joinedRequests.clear();
      runtime.cache.clear();
      runtime.disposed = true;
    },
  };

  return client;
}

export function setDefaultRequestClient(client: RequestClient): void {
  setGlobalAxiosInstance(client.axios);
}

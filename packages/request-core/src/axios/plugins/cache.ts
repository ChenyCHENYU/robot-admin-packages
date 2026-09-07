import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import type {
  CacheConfig,
  CachedResponseData,
  EnhancedAxiosRequestConfig,
} from "../types";
import type { RequestRuntime } from "../runtime";
import { getActiveRequestRuntime } from "../runtime";
import { generateRequestKey, normalizeConfig } from "../utils/helpers";

interface ResolvedCacheConfig extends CacheConfig {
  enabled: boolean;
  ttl: number;
  forceUpdate: boolean;
  tags: readonly string[];
  varyHeaders: readonly string[];
}

interface CacheHit {
  __fromCache: true;
  __cachedResponse: AxiosResponse;
  config: InternalAxiosRequestConfig;
}

const DEFAULT_CACHE_CONFIG: ResolvedCacheConfig = {
  enabled: false,
  ttl: 5 * 60 * 1000,
  forceUpdate: false,
  tags: [],
  varyHeaders: [],
};

function resolveCacheConfig(
  config: EnhancedAxiosRequestConfig,
  runtime: RequestRuntime,
): ResolvedCacheConfig {
  const inherited = normalizeConfig(
    runtime.defaults.cache,
    DEFAULT_CACHE_CONFIG,
  ) as ResolvedCacheConfig;
  const resolved = normalizeConfig(config.cache, inherited) as ResolvedCacheConfig;
  if (!Number.isFinite(resolved.ttl) || resolved.ttl < 0) {
    throw new RangeError("Cache TTL must be a finite number greater than or equal to 0.");
  }
  return resolved;
}

function cacheKey(
  config: AxiosRequestConfig,
  cacheConfig: ResolvedCacheConfig,
): string {
  return (
    cacheConfig.key ??
    generateRequestKey(config, { varyHeaders: cacheConfig.varyHeaders })
  );
}

function createCacheResponse(
  cached: CachedResponseData,
  config: InternalAxiosRequestConfig,
): AxiosResponse {
  return {
    data: cached.data,
    status: cached.status,
    statusText: `${cached.statusText} (from cache)`,
    headers: cached.headers as AxiosResponse["headers"],
    config,
  };
}

export function setupCachePlugin(
  instance: AxiosInstance,
  runtime: RequestRuntime,
): void {
  instance.interceptors.request.use((config) => {
    const enhanced = config as EnhancedAxiosRequestConfig;
    const cacheConfig = resolveCacheConfig(enhanced, runtime);
    if (
      config.method?.toUpperCase() !== "GET" ||
      !cacheConfig.enabled ||
      cacheConfig.forceUpdate
    ) {
      return config;
    }

    const cached = runtime.cache.get<CachedResponseData>(
      cacheKey(config, cacheConfig),
    );
    if (!cached) return config;

    enhanced.__fromCache = true;
    const hit: CacheHit = {
      __fromCache: true,
      __cachedResponse: createCacheResponse(cached, config),
      config,
    };
    return Promise.reject(hit);
  });

  instance.interceptors.response.use(
    (response) => {
      const config = response.config as EnhancedAxiosRequestConfig;
      if (config.__fromCache && config.__cachedResponse) {
        return config.__cachedResponse;
      }
      const cacheConfig = resolveCacheConfig(config, runtime);
      if (
        config.method?.toUpperCase() === "GET" &&
        cacheConfig.enabled &&
        response.status >= 200 &&
        response.status < 300
      ) {
        const cached: CachedResponseData = {
          data: response.data,
          status: response.status,
          statusText: response.statusText,
          headers: { ...response.headers },
        };
        runtime.cache.set(cacheKey(config, cacheConfig), cached, cacheConfig.ttl, {
          tags: cacheConfig.tags,
        });
      }
      return response;
    },
    (error: unknown) => {
      const hit = error as Partial<CacheHit>;
      if (hit.__fromCache && hit.__cachedResponse) {
        return Promise.resolve(hit.__cachedResponse);
      }
      return Promise.reject(error);
    },
  );
}

export function clearAllCache(instance?: AxiosInstance): void {
  getActiveRequestRuntime(instance).cache.clear();
}

export function clearCache(
  config: AxiosRequestConfig,
  instance?: AxiosInstance,
): boolean {
  const runtime = getActiveRequestRuntime(instance);
  const cacheConfig = resolveCacheConfig(config as EnhancedAxiosRequestConfig, runtime);
  return runtime.cache.delete(cacheKey(config, cacheConfig));
}

export function clearCacheByPrefix(
  prefix: string,
  instance?: AxiosInstance,
): number {
  return getActiveRequestRuntime(instance).cache.deleteByPrefix?.(prefix) ?? 0;
}

export function clearCacheByTag(tag: string, instance?: AxiosInstance): number {
  return getActiveRequestRuntime(instance).cache.deleteByTag?.(tag) ?? 0;
}

export function cleanupExpiredCache(instance?: AxiosInstance): void {
  getActiveRequestRuntime(instance).cache.cleanup?.();
}

export function getCacheSize(instance?: AxiosInstance): number {
  return getActiveRequestRuntime(instance).cache.size;
}

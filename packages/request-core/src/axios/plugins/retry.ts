import type { AxiosError, AxiosInstance } from "axios";
import type { EnhancedAxiosRequestConfig, RetryConfig } from "../types";
import type { RequestRuntime } from "../runtime";
import {
  delay,
  isNetworkError,
  isRetryableStatus,
  isTimeoutError,
  normalizeConfig,
} from "../utils/helpers";

interface ResolvedRetryConfig extends RetryConfig {
  enabled: boolean;
  count: number;
  delay: number;
  exponentialBackoff: boolean;
  jitter: boolean;
  retryableStatusCodes: number[];
  retryableMethods: string[];
  maxDelay: number;
  maxElapsedMs: number;
  respectRetryAfter: boolean;
  retryUnsafeBody: boolean;
}

const DEFAULT_RETRY_CONFIG: ResolvedRetryConfig = {
  enabled: false,
  count: 3,
  delay: 1000,
  exponentialBackoff: true,
  jitter: true,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableMethods: ["GET", "HEAD", "OPTIONS", "PUT", "DELETE"],
  maxDelay: 30_000,
  maxElapsedMs: 0,
  respectRetryAfter: true,
  retryUnsafeBody: false,
};

function resolveRetryConfig(
  config: EnhancedAxiosRequestConfig,
  runtime: RequestRuntime,
): ResolvedRetryConfig {
  const inherited = normalizeConfig(
    runtime.defaults.retry,
    DEFAULT_RETRY_CONFIG,
  ) as ResolvedRetryConfig;
  const resolved = normalizeConfig(config.retry, inherited) as ResolvedRetryConfig;
  for (const [name, value] of [
    ["count", resolved.count],
    ["delay", resolved.delay],
    ["maxDelay", resolved.maxDelay],
    ["maxElapsedMs", resolved.maxElapsedMs],
  ] as const) {
    if (!Number.isFinite(value) || value < 0 || (name === "count" && !Number.isInteger(value))) {
      throw new RangeError(`Retry ${name} has an invalid value.`);
    }
  }
  return resolved;
}

function isCanceled(error: unknown): boolean {
  const candidate = error as { name?: string; code?: string };
  return (
    candidate?.name === "CanceledError" ||
    candidate?.name === "AbortError" ||
    candidate?.code === "ERR_CANCELED"
  );
}

function hasUnsafeBody(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const candidate = data as { pipe?: unknown; getReader?: unknown; locked?: unknown };
  return (
    typeof candidate.pipe === "function" ||
    typeof candidate.getReader === "function" ||
    candidate.locked === true
  );
}

async function shouldRetry(
  error: AxiosError,
  retry: ResolvedRetryConfig,
): Promise<boolean> {
  const config = error.config as EnhancedAxiosRequestConfig | undefined;
  if (!retry.enabled || !config || isCanceled(error)) return false;
  const attempt = config.__retryCount ?? 0;
  if (attempt >= retry.count) return false;
  if (hasUnsafeBody(config.data) && !retry.retryUnsafeBody) return false;
  const method = (config.method ?? "get").toUpperCase();
  if (!retry.retryableMethods.some((item) => item.toUpperCase() === method)) return false;
  if (retry.shouldRetry) return retry.shouldRetry(error, attempt + 1);
  if (isNetworkError(error) || isTimeoutError(error)) return true;
  return error.response?.status
    ? isRetryableStatus(error.response.status, retry.retryableStatusCodes)
    : false;
}

function retryAfterDelay(error: AxiosError): number | null {
  const raw = error.response?.headers?.["retry-after"];
  if (raw == null) return null;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const timestamp = Date.parse(String(raw));
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - Date.now()) : null;
}

function calculateDelay(
  error: AxiosError,
  attempt: number,
  retry: ResolvedRetryConfig,
): number {
  let calculated = retry.exponentialBackoff
    ? retry.delay * 2 ** (attempt - 1)
    : retry.delay;
  if (retry.jitter) calculated = Math.round(calculated * (0.75 + Math.random() * 0.5));
  if (retry.respectRetryAfter && [429, 503].includes(error.response?.status ?? 0)) {
    calculated = Math.max(calculated, retryAfterDelay(error) ?? 0);
  }
  return Math.min(Math.max(0, calculated), retry.maxDelay);
}

export function setupRetryPlugin(
  instance: AxiosInstance,
  runtime: RequestRuntime,
): void {
  instance.interceptors.response.use(undefined, async (error: AxiosError) => {
    const config = error.config as EnhancedAxiosRequestConfig | undefined;
    if (!config) return Promise.reject(error);

    const retry = resolveRetryConfig(config, runtime);
    if (!(await shouldRetry(error, retry))) return Promise.reject(error);

    const startedAt = config.__retryStartedAt ?? Date.now();
    config.__retryStartedAt = startedAt;
    const attempt = (config.__retryCount ?? 0) + 1;
    const wait = calculateDelay(error, attempt, retry);
    const elapsed = Date.now() - startedAt;
    if (retry.maxElapsedMs > 0 && elapsed + wait > retry.maxElapsedMs) {
      return Promise.reject(error);
    }

    config.__retryCount = attempt;
    await retry.onRetry?.({ attempt, delay: wait, elapsed, error, config });
    try {
      await delay(wait, config.signal);
    } catch (cause) {
      return Promise.reject(
        Object.assign(new Error("canceled"), {
          name: "CanceledError",
          code: "ERR_CANCELED",
          config,
          cause,
        }),
      );
    }

    const next: EnhancedAxiosRequestConfig = { ...config };
    delete next.__cancelId;
    delete next.__requestKey;
    return instance.request(next);
  });
}

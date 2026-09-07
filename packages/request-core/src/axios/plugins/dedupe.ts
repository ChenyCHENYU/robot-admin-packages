import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import type {
  DedupeConfig,
  EnhancedAbortController,
  EnhancedAxiosRequestConfig,
} from "../types";
import type { RequestRuntime } from "../runtime";
import { getActiveRequestRuntime } from "../runtime";
import { ensureSharedAbortController } from "../utils/abort";
import { generateRequestKey, normalizeConfig } from "../utils/helpers";

const DEFAULT_DEDUPE_CONFIG: Required<DedupeConfig> = {
  enabled: true,
  keyGenerator: generateRequestKey,
};
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CLEANUP_INTERVAL = 30_000;
const REQUEST_TIMEOUT = 5 * 60_000;

function stopTimerIfIdle(runtime: RequestRuntime): void {
  if (runtime.pendingRequests.size === 0 && runtime.dedupeCleanupTimer) {
    clearInterval(runtime.dedupeCleanupTimer);
    runtime.dedupeCleanupTimer = null;
  }
}

function startTimer(runtime: RequestRuntime): void {
  if (runtime.dedupeCleanupTimer) return;
  runtime.dedupeCleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, controller] of runtime.pendingRequests) {
      if (now - (controller._startTime ?? now) > REQUEST_TIMEOUT) {
        controller.abort();
        runtime.pendingRequests.delete(key);
      }
    }
    stopTimerIfIdle(runtime);
  }, CLEANUP_INTERVAL);
  runtime.dedupeCleanupTimer.unref?.();
}

function removePending(
  config: EnhancedAxiosRequestConfig,
  runtime: RequestRuntime,
): void {
  const key = config.__requestKey;
  const controller = config.__abortController;
  if (key && controller && runtime.pendingRequests.get(key) === controller) {
    runtime.pendingRequests.delete(key);
  }
  stopTimerIfIdle(runtime);
}

export function setupDedupePlugin(
  instance: AxiosInstance,
  runtime: RequestRuntime,
): void {
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const enhanced = config as EnhancedAxiosRequestConfig;
    const method = (config.method ?? "get").toUpperCase();
    const requestSetting = enhanced.dedupe ?? runtime.defaults.dedupe;
    const isImplicitDefault = requestSetting === undefined;
    if (isImplicitDefault && !SAFE_METHODS.has(method)) return config;

    const dedupe = normalizeConfig(
      requestSetting,
      DEFAULT_DEDUPE_CONFIG,
    ) as Required<DedupeConfig>;
    if (!dedupe.enabled || enhanced.__fromCache) return config;

    const key = dedupe.keyGenerator(config);
    const existing = runtime.pendingRequests.get(key);
    if (existing) {
      existing.abort(new Error("Superseded by a newer request."));
      runtime.pendingRequests.delete(key);
    }

    const controller = ensureSharedAbortController(enhanced);
    if (!controller) return config;
    enhanced.__requestKey = key;
    runtime.pendingRequests.set(key, controller as EnhancedAbortController);
    startTimer(runtime);
    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      removePending(response.config as EnhancedAxiosRequestConfig, runtime);
      return response;
    },
    (error: unknown) => {
      const config = (error as { config?: EnhancedAxiosRequestConfig })?.config;
      if (config) removePending(config, runtime);
      return Promise.reject(error);
    },
  );
}

export function cancelAllPendingRequests(instance?: AxiosInstance): void {
  const runtime = getActiveRequestRuntime(instance);
  for (const controller of runtime.pendingRequests.values()) controller.abort();
  runtime.pendingRequests.clear();
  stopTimerIfIdle(runtime);
}

export function getPendingRequestCount(instance?: AxiosInstance): number {
  return getActiveRequestRuntime(instance).pendingRequests.size;
}

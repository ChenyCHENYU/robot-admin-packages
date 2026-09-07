import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import type { CancelConfig, EnhancedAxiosRequestConfig, RequestScope } from "../types";
import type { RequestRuntime } from "../runtime";
import { getActiveRequestRuntime } from "../runtime";
import { ensureSharedAbortController } from "../utils/abort";
import { normalizeConfig } from "../utils/helpers";

interface ResolvedCancelConfig extends CancelConfig {
  enabled: boolean;
  whitelist: RegExp[];
}

const DEFAULT_CANCEL_CONFIG: ResolvedCancelConfig = {
  enabled: true,
  whitelist: [],
};
const CLEANUP_INTERVAL = 30_000;
const REQUEST_TIMEOUT = 5 * 60_000;

function stopTimerIfIdle(runtime: RequestRuntime): void {
  if (runtime.cancelableRequests.size === 0 && runtime.cancelCleanupTimer) {
    clearInterval(runtime.cancelCleanupTimer);
    runtime.cancelCleanupTimer = null;
  }
}

function startTimer(runtime: RequestRuntime): void {
  if (runtime.cancelCleanupTimer) return;
  runtime.cancelCleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [id, entry] of runtime.cancelableRequests) {
      if (now - (entry.controller._startTime ?? now) > REQUEST_TIMEOUT) {
        entry.controller.abort(new Error("Request lifecycle expired."));
        runtime.cancelableRequests.delete(id);
      }
    }
    stopTimerIfIdle(runtime);
  }, CLEANUP_INTERVAL);
  runtime.cancelCleanupTimer.unref?.();
}

function isWhitelisted(url: string, whitelist: RegExp[]): boolean {
  return whitelist.some((pattern) => new RegExp(pattern.source, pattern.flags).test(url));
}

function removeCancelable(
  config: EnhancedAxiosRequestConfig | undefined,
  runtime: RequestRuntime,
): void {
  if (config?.__cancelId) runtime.cancelableRequests.delete(config.__cancelId);
  stopTimerIfIdle(runtime);
}

export function setupCancelPlugin(
  instance: AxiosInstance,
  runtime: RequestRuntime,
): void {
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const enhanced = config as EnhancedAxiosRequestConfig;
    const inherited = normalizeConfig(
      runtime.defaults.cancel,
      DEFAULT_CANCEL_CONFIG,
    ) as ResolvedCancelConfig;
    const cancel = normalizeConfig(enhanced.cancel, inherited) as ResolvedCancelConfig;
    if (
      !cancel.enabled ||
      enhanced.__fromCache ||
      isWhitelisted(config.url ?? "", cancel.whitelist)
    ) {
      return config;
    }

    const controller = ensureSharedAbortController(enhanced);
    if (!controller) return config;
    const id = `request_${++runtime.requestId}`;
    enhanced.__cancelId = id;
    runtime.cancelableRequests.set(id, {
      controller,
      scope: cancel.scope ?? enhanced.scope,
    });
    startTimer(runtime);
    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      removeCancelable(response.config as EnhancedAxiosRequestConfig, runtime);
      return response;
    },
    (error: unknown) => {
      removeCancelable(
        (error as { config?: EnhancedAxiosRequestConfig })?.config,
        runtime,
      );
      return Promise.reject(error);
    },
  );
}

export function cancelAllRequests(instance?: AxiosInstance): void {
  const runtime = getActiveRequestRuntime(instance);
  for (const entry of runtime.cancelableRequests.values()) entry.controller.abort();
  runtime.cancelableRequests.clear();
  stopTimerIfIdle(runtime);
}

export function cancelRequestScope(
  scope: RequestScope,
  instance?: AxiosInstance,
): number {
  const runtime = getActiveRequestRuntime(instance);
  let canceled = 0;
  for (const [id, entry] of [...runtime.cancelableRequests.entries()]) {
    if (entry.scope === scope) {
      entry.controller.abort(new Error(`Request scope canceled: ${String(scope)}`));
      runtime.cancelableRequests.delete(id);
      canceled += 1;
    }
  }
  stopTimerIfIdle(runtime);
  return canceled;
}

export function getCancelableRequestCount(instance?: AxiosInstance): number {
  return getActiveRequestRuntime(instance).cancelableRequests.size;
}

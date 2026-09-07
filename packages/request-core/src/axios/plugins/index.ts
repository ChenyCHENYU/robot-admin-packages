import type { AxiosInstance } from "axios";
import type { RequestRuntime } from "../runtime";
import { setupCachePlugin } from "./cache";
import { setupCancelPlugin } from "./cancel";
import { setupDedupePlugin } from "./dedupe";
import { setupRequestPlugin } from "./request";
import { setupResponsePlugin } from "./response";
import { setupRetryPlugin } from "./retry";

/**
 * Axios request interceptors execute in reverse registration order and
 * response interceptors execute in registration order. Cache hits therefore
 * still pass through cancel/dedupe cleanup before reaching consumers.
 */
export function setupPlugins(
  instance: AxiosInstance,
  runtime: RequestRuntime,
): void {
  setupRequestPlugin(instance);
  setupCachePlugin(instance, runtime);
  setupCancelPlugin(instance, runtime);
  setupDedupePlugin(instance, runtime);
  setupRetryPlugin(instance, runtime);
  setupResponsePlugin(instance);
}

export {
  waitForReLogin,
  resolveReLogin,
  rejectReLogin,
  getReLoginPromise,
} from "./request";
export { cancelAllPendingRequests, getPendingRequestCount } from "./dedupe";
export {
  clearAllCache,
  clearCache,
  clearCacheByPrefix,
  clearCacheByTag,
  cleanupExpiredCache,
  getCacheSize,
} from "./cache";
export {
  cancelAllRequests,
  cancelRequestScope,
  getCancelableRequestCount,
} from "./cancel";

import type { AxiosInstance } from "axios";
import { getActiveRequestRuntime } from "../runtime";

export function waitForReLogin(instance?: AxiosInstance): Promise<void> {
  const state = getActiveRequestRuntime(instance).reLogin;
  if (!state.promise) {
    state.promise = new Promise<void>((resolve, reject) => {
      state.resolve = resolve;
      state.reject = reject;
    }).finally(() => {
      state.promise = null;
      state.resolve = null;
      state.reject = null;
    });
  }
  return state.promise;
}

export function getReLoginPromise(instance?: AxiosInstance): Promise<void> | null {
  return getActiveRequestRuntime(instance).reLogin.promise;
}

export function resolveReLogin(instance?: AxiosInstance): void {
  getActiveRequestRuntime(instance).reLogin.resolve?.();
}

export function rejectReLogin(reason?: unknown, instance?: AxiosInstance): void {
  getActiveRequestRuntime(instance).reLogin.reject?.(reason);
}

export function setupRequestPlugin(_instance: AxiosInstance): void {
  // Authentication is opt-in and installed by createRequestClient().
}

import {
  computed,
  getCurrentScope,
  onScopeDispose,
  shallowRef,
  type ComputedRef,
  type ShallowRef,
} from "vue";
import type { ConcurrencyPolicy } from "../axios/types";
import {
  isCanceledError,
  normalizeRequestError,
  type RequestError,
} from "../client/errors";

export interface UseRequestContext {
  signal: AbortSignal;
}

export interface UseRequestOptions<T, Args extends unknown[]> {
  initialData?: T;
  immediate?: boolean;
  immediateArgs?: Args;
  concurrency?: Extract<ConcurrencyPolicy, "allow" | "takeLatest" | "takeFirst">;
  keepPreviousData?: boolean;
  onSuccess?: (data: T) => void | Promise<void>;
  onError?: (error: RequestError) => void | Promise<void>;
}

export interface UseRequestReturn<T, Args extends unknown[]> {
  data: ShallowRef<T | undefined>;
  error: ShallowRef<RequestError | null>;
  loading: ComputedRef<boolean>;
  run: (...args: Args) => Promise<T>;
  cancel: (reason?: unknown) => void;
  reset: () => void;
}

export function useRequest<T, Args extends unknown[] = []>(
  executor: (context: UseRequestContext, ...args: Args) => Promise<T>,
  options: UseRequestOptions<T, Args> = {},
): UseRequestReturn<T, Args> {
  const data = shallowRef<T | undefined>(options.initialData);
  const error = shallowRef<RequestError | null>(null);
  const pending = shallowRef(0);
  const loading = computed(() => pending.value > 0);
  let active: { controller: AbortController; promise: Promise<T>; id: number } | null =
    null;
  const controllers = new Set<AbortController>();
  let sequence = 0;

  const cancel = (reason?: unknown): void => {
    sequence += 1;
    for (const controller of controllers) controller.abort(reason);
    controllers.clear();
    active = null;
  };

  const run = async (...args: Args): Promise<T> => {
    const concurrency = options.concurrency ?? "takeLatest";
    if (active && concurrency === "takeFirst") return active.promise;
    if (active && concurrency === "takeLatest") active.controller.abort();

    const id = ++sequence;
    const controller = new AbortController();
    controllers.add(controller);
    if (!options.keepPreviousData) data.value = undefined;
    error.value = null;
    pending.value += 1;

    const promise = executor({ signal: controller.signal }, ...args);
    active = { controller, promise, id };
    try {
      const result = await promise;
      if (id === sequence || concurrency === "takeFirst") {
        data.value = result;
        try {
          await options.onSuccess?.(result);
        } catch {
          // Lifecycle callbacks must not turn a successful request into a failure.
        }
      }
      return result;
    } catch (cause) {
      const normalized = normalizeRequestError(cause);
      if (!isCanceledError(normalized) && id === sequence) {
        error.value = normalized;
        try {
          await options.onError?.(normalized);
        } catch {
          // Preserve the original request error if an observer fails.
        }
      }
      throw normalized;
    } finally {
      pending.value = Math.max(0, pending.value - 1);
      controllers.delete(controller);
      if (active?.id === id) active = null;
    }
  };

  const reset = (): void => {
    cancel();
    data.value = options.initialData;
    error.value = null;
  };

  if (getCurrentScope()) onScopeDispose(() => cancel());
  if (options.immediate) {
    void run(...(options.immediateArgs ?? ([] as unknown as Args))).catch(() => undefined);
  }

  return { data, error, loading, run, cancel, reset };
}

/**
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-11-01
 * @Description: 实例隔离的命名字典，统一请求所有权、状态、快照与作用域生命周期。
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { defineEnum, EMPTY_OPTIONS, formatLabels } from "./values";
import type {
  DictionaryDefinition,
  DictionaryLoader,
  DictionaryLoadOptions,
  DictionaryOption,
  DictionaryRemoteDefinition,
  DictionarySource,
  DictionaryState,
  DictionaryStore,
  DictionaryStoreOptions,
  DictionaryValue,
} from "./types";

interface Flight {
  controller: AbortController;
  promise: Promise<readonly DictionaryOption[]>;
  resolve(value: readonly DictionaryOption[]): void;
  reject(error: unknown): void;
  timer?: ReturnType<typeof setTimeout>;
}

interface ManagedSource {
  source: DictionarySource;
  reset(scope: string): () => void;
  invalidate(): () => void;
  destroy(): void;
}

function duration(
  value: number | undefined,
  fallback: number,
  positive = false,
): number {
  const result = value ?? fallback;
  if (!Number.isFinite(result) || (positive ? result <= 0 : result < 0)) {
    throw new RangeError(
      "[dictionary] 时间配置必须是有效的非负数，timeoutMs 必须大于零。",
    );
  }
  return result;
}

function abortError(reason?: unknown): Error {
  if (reason instanceof Error) return reason;
  const error = new Error("[dictionary] 字典等待已取消。");
  error.name = "AbortError";
  return error;
}

/** 外部取消只结束当前等待，不把任一页面的信号交给共享请求。 */
function waitFor(
  promise: Flight["promise"],
  signal?: AbortSignal,
): Flight["promise"] {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortError(signal.reason));
  return new Promise((resolve, reject) => {
    const cancel = () => reject(abortError(signal.reason));
    signal.addEventListener("abort", cancel, { once: true });
    void promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", cancel));
  });
}

function createSource(
  name: string,
  definition: DictionaryDefinition,
  options: Required<
    Pick<
      DictionaryStoreOptions,
      "scope" | "ttlMs" | "retryDelayMs" | "timeoutMs"
    >
  > &
    DictionaryStoreOptions,
): ManagedSource {
  const remote = Array.isArray(definition)
    ? undefined
    : (definition as DictionaryRemoteDefinition);
  if (remote && typeof remote.load !== "function")
    throw new TypeError(`[dictionary] ${name} 缺少 load。`);
  const ttlMs = duration(remote?.ttlMs, options.ttlMs);
  const listeners = new Set<() => void>();
  let disposed = false;
  let generation = 0;
  let flight: Flight | undefined;
  let retryAt = 0;
  let labels = new Map<DictionaryValue, string>();
  const initial = remote
    ? EMPTY_OPTIONS
    : defineEnum(definition as readonly DictionaryOption[]);
  let state: DictionaryState = Object.freeze({
    status: remote ? "idle" : initial.length ? "ready" : "empty",
    options: initial,
    error: null,
    updatedAt: remote ? null : Date.now(),
    scope: options.scope,
  });
  for (const entry of initial) labels.set(entry.value, entry.label);

  const notify = (): void => {
    // 使用快照允许订阅者在回调中退订；一个订阅者异常不能阻断其余消费者。
    for (const listener of [...listeners]) {
      if (!listeners.has(listener)) continue;
      try {
        // () => void 也允许 async 回调，必须同时接管其异步拒绝。
        void Promise.resolve(listener()).catch(() => undefined);
      } catch {
        /* 观察者不拥有请求或状态。 */
      }
    }
  };
  const publish = (next: DictionaryState): void => {
    state = Object.freeze(next);
    notify();
  };
  const retire = (reason: Error): void => {
    const current = flight;
    if (!current) return;
    flight = undefined;
    clearTimeout(current.timer);
    current.controller.abort(reason);
    current.reject(reason);
  };
  const owns = (current: Flight): boolean => !disposed && flight === current;
  const fail = (current: Flight, error: unknown): void => {
    if (!owns(current)) return;
    flight = undefined;
    clearTimeout(current.timer);
    retryAt = Date.now() + options.retryDelayMs;
    const scope = state.scope;
    publish({ ...state, status: "error", error });
    current.reject(error);
    try {
      void Promise.resolve(options.onError?.(error, { name, scope })).catch(
        () => undefined,
      );
    } catch {
      /* 错误观察者不能替换原始加载失败。 */
    }
  };
  const succeed = (
    current: Flight,
    result: readonly DictionaryOption[],
  ): void => {
    if (!owns(current)) return;
    let snapshot: readonly DictionaryOption[];
    try {
      snapshot = defineEnum(result);
    } catch (error) {
      fail(current, error);
      return;
    }
    flight = undefined;
    clearTimeout(current.timer);
    retryAt = 0;
    const settledGeneration = generation;
    labels = new Map(snapshot.map((entry) => [entry.value, entry.label]));
    publish({
      ...state,
      options: snapshot,
      status: snapshot.length ? "ready" : "empty",
      error: null,
      updatedAt: Date.now(),
    });
    if (generation !== settledGeneration || disposed)
      current.reject(abortError());
    else current.resolve(snapshot);
  };
  const start = (): Flight["promise"] => {
    let resolve!: Flight["resolve"];
    let reject!: Flight["reject"];
    const promise = new Promise<readonly DictionaryOption[]>((done, fail) => {
      resolve = done;
      reject = fail;
    });
    // 后台重载或全部使用方取消后，缓存仍可能完成；内部拒绝始终有人接管。
    void promise.catch(() => undefined);
    const current: Flight = {
      controller: new AbortController(),
      promise,
      resolve,
      reject,
    };
    flight = current;
    const scope = state.scope;
    current.timer = setTimeout(() => {
      if (!owns(current)) return;
      const error = new Error(`[dictionary] ${name} 加载超时。`);
      error.name = "TimeoutError";
      current.controller.abort(error);
      fail(current, error);
    }, options.timeoutMs);
    publish({ ...state, status: "loading", error: null });
    void Promise.resolve()
      .then(() => {
        if (!owns(current)) return EMPTY_OPTIONS;
        return remote!.load({ signal: current.controller.signal, scope });
      })
      .then(
        (result) => succeed(current, result),
        (error) => fail(current, error),
      );
    return promise;
  };
  const load = (config: DictionaryLoadOptions = {}): Flight["promise"] => {
    if (disposed) return Promise.reject(new Error("[dictionary] 字典已销毁。"));
    if (config.signal?.aborted)
      return Promise.reject(abortError(config.signal.reason));
    if (!remote) return waitFor(Promise.resolve(state.options), config.signal);
    if (flight) return waitFor(flight.promise, config.signal);
    if (!config.force) {
      const fresh =
        state.updatedAt !== null &&
        (ttlMs === 0 || Date.now() - state.updatedAt < ttlMs);
      if (state.status !== "error" && fresh)
        return waitFor(Promise.resolve(state.options), config.signal);
      if (state.status === "error" && Date.now() < retryAt)
        return Promise.reject(state.error);
    }
    return waitFor(start(), config.signal);
  };
  const reset = (scope: string): (() => void) => {
    if (disposed) return () => undefined;
    const nextGeneration = ++generation;
    if (!remote) {
      state = Object.freeze({ ...state, scope });
      return notify;
    }
    const previous = flight;
    flight = undefined;
    const reason = abortError();
    if (previous) {
      clearTimeout(previous.timer);
      previous.reject(reason);
    }
    retryAt = 0;
    labels.clear();
    state = Object.freeze({
      status: "idle",
      options: EMPTY_OPTIONS,
      error: null,
      updatedAt: null,
      scope,
    });
    return () => {
      // 全部源清空后才触发同步 abort 事件；回调重入时旧通知不得覆盖新作用域。
      previous?.controller.abort(reason);
      if (generation !== nextGeneration || disposed) return;
      notify();
      if (generation === nextGeneration && listeners.size)
        void load().catch(() => undefined);
    };
  };
  return {
    source: Object.freeze({
      getOptions: () => state.options,
      get: (key: DictionaryValue) => labels.get(key),
      label: (value: unknown, config = {}) =>
        formatLabels(value, (key) => labels.get(key), config),
      load,
      getState: () => state,
      subscribe(listener: () => void) {
        if (disposed) return () => undefined;
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    }),
    reset,
    invalidate: () => (remote ? reset(state.scope) : () => undefined),
    destroy() {
      if (disposed) return;
      disposed = true;
      retire(abortError());
      labels.clear();
      listeners.clear();
      state = Object.freeze({
        status: "idle",
        options: EMPTY_OPTIONS,
        error: null,
        updatedAt: null,
        scope: state.scope,
      });
    },
  };
}

/** 每个应用或 SSR 请求创建自己的 Store；不建立模块级缓存或隐式请求。 */
export function createDictionaryStore(
  load: DictionaryLoader,
  config?: DictionaryStoreOptions,
): DictionaryStore;
export function createDictionaryStore<
  T extends Record<string, DictionaryDefinition>,
>(
  definitions: T,
  config: DictionaryStoreOptions & { load: DictionaryLoader },
): DictionaryStore<Extract<keyof T, string>> & DictionaryStore;
export function createDictionaryStore<
  T extends Record<string, DictionaryDefinition>,
>(
  definitions: T,
  config?: DictionaryStoreOptions,
): DictionaryStore<Extract<keyof T, string>>;
export function createDictionaryStore(
  input: Record<string, DictionaryDefinition> | DictionaryLoader,
  config: DictionaryStoreOptions = {},
): DictionaryStore {
  const definitions = typeof input === "function" ? {} : input;
  const load = typeof input === "function" ? input : config.load;
  if (load !== undefined && typeof load !== "function")
    throw new TypeError("[dictionary] 统一 load 必须是函数。");
  let scope = config.scope ?? "default";
  if (typeof scope !== "string")
    throw new TypeError("[dictionary] scope 必须是字符串。");
  const options = {
    ...config,
    scope,
    ttlMs: duration(config.ttlMs, 5 * 60_000),
    retryDelayMs: duration(config.retryDelayMs, 5_000),
    timeoutMs: duration(config.timeoutMs, 15_000, true),
  };
  const entries = new Map(
    Object.entries(definitions).map(([name, definition]) => [
      name,
      createSource(name, definition, options),
    ]),
  );
  let disposed = false;
  const getDictionary = (name: string): DictionarySource | undefined => {
    const existing = entries.get(name);
    if (existing) return existing.source;
    if (disposed || !load || typeof name !== "string" || !name.trim())
      return undefined;
    // 名称即后端编码，复用相同源；创建不发请求，晚创建的源使用当前作用域。
    const entry = createSource(
      name,
      { load: (context) => load(name, context) },
      { ...options, scope },
    );
    entries.set(name, entry);
    return entry.source;
  };
  return {
    getDictionary: getDictionary as DictionaryStore["getDictionary"],
    setScope(next) {
      if (typeof next !== "string")
        throw new TypeError("[dictionary] scope 必须是字符串。");
      if (disposed || scope === next) return;
      scope = next;
      // 所有源先换作用域，再通知观察者，避免同步回调读取到新旧租户混合状态。
      const notify = [...entries.values()].map((entry) => entry.reset(next));
      for (const publish of notify) publish();
    },
    invalidate(name) {
      if (disposed) return;
      const selected =
        name !== undefined ? [entries.get(name)] : [...entries.values()];
      const notify = selected.flatMap((entry) =>
        entry ? [entry.invalidate()] : [],
      );
      for (const publish of notify) publish();
    },
    preload(names) {
      const keys = names ? [...new Set(names)] : [...entries.keys()];
      return Promise.allSettled(
        keys.map((name) => {
          const source = getDictionary(name);
          return source
            ? source.load()
            : Promise.reject(new Error(`[dictionary] 未注册字典: ${name}`));
        }),
      );
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      for (const entry of entries.values()) entry.destroy();
    },
  };
}

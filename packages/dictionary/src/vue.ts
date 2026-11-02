/**
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-11-01
 * @Description: 可选 Vue 生命周期适配，不耦合具体表格、UI 或请求客户端。
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import {
  computed,
  getCurrentScope,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from "vue";
import type {
  DictionaryLabelOptions,
  DictionarySource,
  DictionaryState,
  DictionaryStore,
  DictionaryOptionsSource,
  DictionaryProvider,
  DictionaryOption,
} from "./types";
import { EMPTY_OPTIONS, defineEnum, formatLabels } from "./values";
import {
  missingDictionaryProvider,
  readDictionaryProvider,
} from "./vue-context";

export interface DictionaryUseOptions {
  immediate?: boolean;
  enabled?: MaybeRefOrGetter<boolean>;
}

/** 记录字段到字典名称/数据源的映射，与任何组件字段结构无关。 */
export type DictionaryLabelFields<
  TModel extends object,
  TName extends string = string,
> = Readonly<
  Partial<
    Record<Extract<keyof TModel, string>, TName | DictionaryOptionsSource>
  >
>;
export type DictionaryLabels<TFields> = Readonly<
  Record<Extract<keyof TFields, string>, string>
>;
export type DictionaryFieldInput<TModel, TFields> = TFields &
  Record<Exclude<keyof TFields, keyof TModel>, never> & {
    /** 映射不是序列；可选标记保留普通 interface 的结构兼容性。 */
    readonly [Symbol.iterator]?: never;
  };
type ProviderNames<T> = T extends DictionaryStore<infer TName> ? TName : string;

function readState(
  source: DictionaryOptionsSource,
  loaded?: readonly DictionaryOption[],
): DictionaryState {
  const shared = source.getState?.();
  const options = loaded ?? source.getOptions();
  return {
    status:
      shared?.status ??
      (options.length ? "ready" : loaded || !source.load ? "empty" : "idle"),
    // 共享源的不可变快照直接复用，旧源在事件边界复制，兼容原地修改。
    options: shared?.options === options ? options : defineEnum(options),
    error: shared?.error ?? null,
    scope: shared?.scope ?? "",
    updatedAt: shared?.updatedAt ?? null,
  };
}

/** 同一源的多个组件共享加载；卸载只取消当前消费者等待和订阅。 */
export function useDictionary(
  source: MaybeRefOrGetter<DictionaryOptionsSource | string | undefined>,
  options: DictionaryUseOptions = {},
) {
  const state = shallowRef<DictionaryState>();
  const provider = readDictionaryProvider();
  // SSR 的 computed 可以不缓存；解析直接由下面的单个 watch 跟踪，
  // 每次输入变化只取得一个快照，回调再次读取不会因临时对象重入或重复解析 Provider。
  const resolveSource = () => {
    if (!toValue(options.enabled ?? true))
      return { source: undefined, error: null };
    try {
      const value = toValue(source);
      if (typeof value !== "string") return { source: value, error: null };
      const resolved = (provider ?? missingDictionaryProvider).getDictionary(
        value,
      );
      return {
        source: resolved,
        error: resolved ? null : new Error(`[dictionary] 未注册字典：${value}`),
      };
    } catch (error) {
      return { source: undefined, error };
    }
  };
  const resolution = shallowRef<ReturnType<typeof resolveSource>>({
    source: undefined,
    error: null,
  });
  let latestResolution: ReturnType<typeof resolveSource>;
  let owner:
    | {
        source: DictionaryOptionsSource | undefined;
        controller: AbortController;
        active: boolean;
        revision: number;
        flight?: Promise<readonly DictionaryOption[]>;
      }
    | undefined;
  const currentSource = () => resolution.value.source;
  const load = (force: boolean): Promise<readonly DictionaryOption[]> => {
    if (resolution.value.error) return Promise.reject(resolution.value.error);
    const own = owner;
    if (!own?.active) {
      const error = new Error("[dictionary] 字典消费者已停止。");
      error.name = "AbortError";
      return Promise.reject(error);
    }
    if (!own.source?.load) {
      try {
        if (force && own.source)
          state.value = readState(own.source, own.source.getOptions());
        return Promise.resolve(state.value?.options ?? EMPTY_OPTIONS);
      } catch (error) {
        if (state.value)
          state.value = { ...state.value, status: "error", error };
        return Promise.reject(error);
      }
    }
    if (own.flight) return own.flight;
    let resolve!: (value: readonly DictionaryOption[]) => void;
    let reject!: (error: unknown) => void;
    const flight = new Promise<readonly DictionaryOption[]>((done, fail) => {
      resolve = done;
      reject = fail;
    });
    own.flight = flight;
    const revision = own.revision;
    const abort = () => {
      const error = new Error("[dictionary] 字典消费者已停止。");
      error.name = "AbortError";
      reject(error);
    };
    own.controller.signal.addEventListener("abort", abort, { once: true });
    // 先占有请求，再调用源：同步状态通知中的重试也共享本次等待。
    void (async () => {
      try {
        const request = own.source?.load?.({
          signal: own.controller.signal,
          force,
        });
        if (own.active && own.source && !own.source.getState)
          state.value = {
            ...(state.value ?? readState(own.source)),
            status: "loading",
            error: null,
          };
        const values = await (request ??
          own.source?.getOptions() ??
          EMPTY_OPTIONS);
        if (own.active && own.revision === revision && own.source)
          state.value = readState(own.source, values);
        resolve(values);
      } catch (error) {
        if (own.active && own.revision === revision && state.value)
          state.value = { ...state.value, status: "error", error };
        reject(error);
      } finally {
        own.controller.signal.removeEventListener("abort", abort);
        if (own.flight === flight) own.flight = undefined;
      }
    })();
    return flight;
  };
  const stop = watch(
    () => {
      latestResolution = resolveSource();
      return latestResolution;
    },
    (nextResolution, _previous, cleanup) => {
      // 上一源的取消事件可能同步切到第三个源，旧 watch 回调不能重新夺取所有权。
      if (nextResolution !== latestResolution) return;
      const current = nextResolution.source;
      const own: NonNullable<typeof owner> = {
        source: current,
        controller: new AbortController(),
        active: true,
        revision: 0,
      };
      owner = own;
      let unsubscribe: (() => void) | undefined;
      cleanup(() => {
        own.active = false;
        if (owner === own) owner = undefined;
        try {
          unsubscribe?.();
        } catch {
          /* 退订失败仍须撤销本消费者的等待。 */
        }
        own.controller.abort();
      });
      resolution.value = nextResolution;
      if (!own.active) return;
      // cleanup 必须先注册；同步状态观察者可以在任意发布点卸载整个作用域。
      let initial: DictionaryState | undefined;
      try {
        // 禁用只暂停消费，保留已显示快照，避免弹窗离场时文字闪回原码。
        initial = current
          ? readState(current)
          : !toValue(options.enabled ?? true) && state.value
            ? { ...state.value, status: "idle", error: null }
            : undefined;
      } catch (error) {
        initial = {
          status: "error",
          error,
          options: EMPTY_OPTIONS,
          scope: "",
          updatedAt: null,
        };
      }
      if (!own.active) return;
      state.value = initial;
      if (!own.active) return;
      try {
        unsubscribe = current?.subscribe?.(() => {
          if (!own.active) return;
          try {
            const snapshot = readState(current);
            if (own.active) {
              if (
                current.getState &&
                (snapshot.scope !== state.value?.scope ||
                  (snapshot.status === "idle" && own.flight))
              ) {
                // 同一源暂停/换身份会取消旧 Promise；立即归还旧等待，旧拒绝不能覆盖新状态。
                own.revision++;
                own.flight = undefined;
              }
              state.value = snapshot;
            }
          } catch (error) {
            if (own.active && state.value)
              state.value = { ...state.value, status: "error", error };
          }
        });
      } catch (error) {
        if (own.active && state.value)
          state.value = { ...state.value, status: "error", error };
        return;
      }
      if (!own.active) {
        // subscribe 可同步通知并触发卸载，归还刚刚返回的迟到退订函数。
        try {
          unsubscribe?.();
        } catch {
          /* 宿主已卸载，不再把退订异常送回已销毁视图。 */
        }
        return;
      }
      if (current && options.immediate !== false)
        void load(false).catch(() => undefined);
    },
    { immediate: true, flush: "sync" },
  );
  onScopeDispose(stop);
  const resolvedState = computed<DictionaryState | undefined>(() => {
    return resolution.value.error
      ? {
          status: "error",
          options: EMPTY_OPTIONS,
          error: resolution.value.error,
          scope: "",
          updatedAt: null,
        }
      : state.value;
  });
  const values = computed(() => resolvedState.value?.options ?? EMPTY_OPTIONS);
  const labels = computed(
    () => new Map(values.value.map((option) => [option.value, option.label])),
  );
  return {
    state: resolvedState,
    status: computed(() => resolvedState.value?.status ?? "idle"),
    options: values,
    loading: computed(() => resolvedState.value?.status === "loading"),
    error: computed(() => resolvedState.value?.error ?? null),
    reload: () => load(true),
    label: (value: unknown, config?: DictionaryLabelOptions) => {
      // 标签只依赖选项快照；状态变化不重算文字，标准源继续使用自身 O(1) 索引。
      void values.value;
      return (
        currentSource()?.label?.(value, config) ??
        formatLabels(value, (key) => labels.value.get(key), config)
      );
    },
  };
}

/** 插件接入后的详情简写；默认读取本插件实例，可显式指定局部数据来源。 */
export function useDictLabels<
  TModel extends object,
  const TFields extends DictionaryLabelFields<NoInfer<TModel>>,
>(
  model: MaybeRefOrGetter<TModel | null | undefined>,
  fields: DictionaryFieldInput<TModel, TFields>,
  options: DictionaryUseOptions & { provider?: DictionaryProvider } = {},
) {
  const provider =
    options.provider ?? readDictionaryProvider() ?? missingDictionaryProvider;
  return useDictionaryLabels<TModel, DictionaryProvider, TFields>(
    provider,
    model,
    fields,
    options,
  );
}

export { useDictionaries } from "./vue-context";
export {
  createDictionaryPlugin,
  type DictionaryPluginConfig,
  type DictionaryPlugin,
} from "./vue-plugin";

type LabelBinding = string | DictionaryOptionsSource;

/** 映射只解析一次；无效源保留局部错误，不触发该字段的加载。 */
function labelEntries(fields: object) {
  const entries = new Map<string, LabelBinding>();
  let error: unknown = null;
  if (!fields || typeof fields !== "object" || Array.isArray(fields))
    return {
      entries: [] as [string, LabelBinding][],
      error: new TypeError("[dictionary] fields 必须是字段到字典的映射对象。"),
    };
  const add = (field: string, binding: unknown) => {
    if (binding === undefined) return;
    if (
      typeof binding !== "string" &&
      (!binding || typeof binding !== "object" || !("getOptions" in binding))
    ) {
      error ??= new TypeError(`[dictionary] 字段 ${field} 缺少有效字典源`);
      return;
    }
    entries.set(field, binding as LabelBinding);
  };
  for (const [field, binding] of Object.entries(fields)) add(field, binding);
  return { entries: [...entries], error };
}

/** 绑定记录与字段映射；未取得记录或被禁用时不解析、订阅、加载远程源。 */
export function useDictionaryLabels<
  TModel extends object,
  TProvider extends DictionaryProvider,
  const TFields extends DictionaryLabelFields<
    NoInfer<TModel>,
    ProviderNames<NoInfer<TProvider>>
  >,
>(
  provider: TProvider,
  model: MaybeRefOrGetter<TModel | null | undefined>,
  fields: DictionaryFieldInput<TModel, TFields>,
  options: DictionaryUseOptions = {},
) {
  const owner = getCurrentScope();
  const enabled = computed(
    () => toValue(options.enabled ?? true) && toValue(model) != null,
  );
  const normalized = labelEntries(fields);
  const bindings = new Map<
    LabelBinding,
    ReturnType<typeof useDictionary> | undefined
  >();
  for (const [, key] of normalized.entries) {
    if (bindings.has(key)) continue;
    const source = () => {
      const resolved =
        typeof key === "string" ? provider.getDictionary(key) : key;
      if (!resolved) throw new Error(`[dictionary] 未注册字典：${String(key)}`);
      return resolved;
    };
    // 同步订阅可能卸载宿主，后续源不再创建消费者。
    bindings.set(
      key,
      owner?.active === false
        ? undefined
        : useDictionary(source, {
            immediate: options.immediate,
            enabled,
          }),
    );
  }
  // 字段路径预编译，读取只遍历自身属性，不访问原型链或修改记录。
  const entries = normalized.entries.map(([field, key]) => ({
    field,
    key,
    path: field.replace(/\[(\d+)\]/g, ".$1").split("."),
  }));
  const read = (row: unknown, field: string, path: string[]) => {
    if (
      row != null &&
      typeof row === "object" &&
      Object.prototype.hasOwnProperty.call(row, field)
    )
      return (row as Record<string, unknown>)[field];
    for (const part of path) {
      if (
        row == null ||
        typeof row !== "object" ||
        !Object.prototype.hasOwnProperty.call(row, part)
      )
        return undefined;
      row = (row as Record<string, unknown>)[part];
    }
    return row;
  };
  return {
    labels: computed(() => {
      const row = toValue(model);
      return Object.freeze(
        Object.fromEntries(
          entries.map(({ field, key, path }) => {
            const value = read(row, field, path);
            return [
              field,
              bindings.get(key)?.label(value) ??
                formatLabels(value, () => undefined),
            ];
          }),
        ),
      ) as DictionaryLabels<TFields>;
    }),
    loading: computed(() =>
      [...bindings.values()].some((view) => view?.loading.value),
    ),
    error: computed(() => {
      if (normalized.error) return normalized.error;
      for (const view of bindings.values()) {
        const error = view?.error.value;
        if (error != null) return error;
      }
      return null;
    }),
    reload: () =>
      Promise.allSettled(
        [...bindings.values()].map(
          (view) => view?.reload() ?? Promise.resolve(EMPTY_OPTIONS),
        ),
      ),
  };
}

/** 只对数据快照变动合并刷新；加载／错误状态本身不引发表格重绘。 */
export function useDictionaryRefresh(
  sources: MaybeRefOrGetter<readonly DictionarySource[]>,
  refresh: () => void,
): () => void {
  const revision = shallowRef(0);
  const stopRefresh = watch(revision, () => refresh(), { flush: "post" });
  let initialized = false;
  const stopSources = watch(
    () => toValue(sources),
    (current, _previous, cleanup) => {
      let active = true;
      const unsubscribers: Array<() => void> = [];
      cleanup(() => {
        active = false;
        for (const unsubscribe of unsubscribers) unsubscribe();
      });
      for (const source of new Set(current)) {
        if (!active) break;
        let snapshot = source.getOptions();
        if (!active) break;
        const unsubscribe = source.subscribe(() => {
          if (!active) return;
          const next = source.getOptions();
          if (next === snapshot) return;
          snapshot = next;
          revision.value++;
        });
        if (!active) {
          unsubscribe();
          break;
        }
        unsubscribers.push(unsubscribe);
      }
      if (!active) return;
      if (initialized) revision.value++;
      initialized = true;
    },
    { immediate: true },
  );
  const stop = () => {
    stopSources();
    stopRefresh();
  };
  onScopeDispose(stop);
  return stop;
}

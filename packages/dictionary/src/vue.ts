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
  type ComputedRef,
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

export interface DictionaryUseOptions {
  immediate?: boolean;
  enabled?: MaybeRefOrGetter<boolean>;
}

/** 接受现有表单/搜索 prop、表格 key/field，不引入任何 UI 类型。 */
export interface DictionaryLabelField {
  readonly prop?: string;
  readonly key?: string;
  readonly field?: string;
  readonly dictionary?: string | DictionaryOptionsSource;
}
export type DictionaryLabelFields<
  TModel extends object,
  TName extends string = string,
> =
  | Readonly<
      Partial<
        Record<Extract<keyof TModel, string>, TName | DictionaryOptionsSource>
      >
    >
  | readonly DictionaryLabelField[];
type FieldKey<T> = T extends { prop: infer P extends string }
  ? P
  : T extends { key: infer P extends string }
    ? P
    : T extends { field: infer P extends string }
      ? P
      : never;
type RequiredLabels<T> = T extends {
  dictionary: string | DictionaryOptionsSource;
}
  ? FieldKey<T>
  : never;
type PossibleLabels<T> = T extends unknown
  ? "dictionary" extends keyof T
    ? FieldKey<T>
    : never
  : never;
export type DictionaryLabels<TFields> =
  TFields extends readonly DictionaryLabelField[]
    ? Readonly<
        Record<RequiredLabels<TFields[number]>, string> &
          Partial<Record<PossibleLabels<TFields[number]>, string>>
      >
    : Readonly<Record<Extract<keyof TFields, string>, string>>;
export type DictionaryFieldInput<TModel, TFields> =
  TFields extends readonly DictionaryLabelField[]
    ? TFields
    : TFields & Record<Exclude<keyof TFields, keyof TModel>, never>;
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
  source: MaybeRefOrGetter<DictionaryOptionsSource | undefined>,
  options: DictionaryUseOptions = {},
) {
  const state = shallowRef<DictionaryState>();
  let owner:
    | {
        source: DictionaryOptionsSource | undefined;
        controller: AbortController;
        active: boolean;
        flight?: Promise<readonly DictionaryOption[]>;
      }
    | undefined;
  const currentSource = () =>
    toValue(options.enabled ?? true) ? toValue(source) : undefined;
  const load = (force: boolean): Promise<readonly DictionaryOption[]> => {
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
        if (own.active && own.source)
          state.value = readState(own.source, values);
        resolve(values);
      } catch (error) {
        if (own.active && state.value)
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
    currentSource,
    (current, _previous, cleanup) => {
      // 上一源的取消事件可能同步切到第三个源，旧 watch 回调不能重新夺取所有权。
      if (current !== currentSource()) return;
      const own: NonNullable<typeof owner> = {
        source: current,
        controller: new AbortController(),
        active: true,
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
            if (own.active) state.value = snapshot;
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
  const values = computed(() => state.value?.options ?? EMPTY_OPTIONS);
  const labels = computed(
    () => new Map(values.value.map((option) => [option.value, option.label])),
  );
  return {
    state: computed(() => state.value),
    status: computed(() => state.value?.status ?? "idle"),
    options: values,
    loading: computed(() => state.value?.status === "loading"),
    error: computed(() => state.value?.error ?? null),
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

type LabelBinding = string | DictionaryOptionsSource;

/** 配置只解析一次；冲突不猜测优先级，保留错误并隔离有问题的字段。 */
function labelEntries(fields: object | readonly DictionaryLabelField[]) {
  const entries = new Map<string, LabelBinding>();
  const conflicts = new Set<string>();
  let error: unknown = null;
  const add = (field: string, binding: unknown) => {
    if (binding === undefined || conflicts.has(field)) return;
    if (
      typeof binding !== "string" &&
      (!binding || typeof binding !== "object" || !("getOptions" in binding))
    ) {
      error ??= new TypeError(`[dictionary] 字段 ${field} 缺少有效字典源`);
      return;
    }
    if (entries.has(field) && entries.get(field) !== binding) {
      error ??= new Error(`[dictionary] 字段 ${field} 存在冲突的字典配置`);
      conflicts.add(field);
      entries.delete(field);
      return;
    }
    entries.set(field, binding as LabelBinding);
  };
  if (Array.isArray(fields)) {
    for (const item of fields) {
      if (item.dictionary === undefined) continue;
      const keys = [
        ...new Set(
          [item.prop, item.key, item.field].filter(
            (key): key is string => typeof key === "string",
          ),
        ),
      ];
      if (keys.length !== 1 || !keys[0]) {
        error ??= new Error(
          "[dictionary] 字典字段必须有唯一的 prop、key 或 field",
        );
        continue;
      }
      add(keys[0], item.dictionary);
    }
  } else {
    for (const [field, binding] of Object.entries(fields)) add(field, binding);
  }
  return { entries: [...entries], error };
}

/** 绑定记录与字段配置；未取得记录或被禁用时不解析、订阅、加载远程源。 */
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
    {
      resolution: ComputedRef<{
        source: DictionaryOptionsSource | undefined;
        error: unknown;
      }>;
      view: ReturnType<typeof useDictionary> | undefined;
    }
  >();
  for (const [, key] of normalized.entries) {
    if (bindings.has(key)) continue;
    const resolution = computed(() => {
      if (!enabled.value) return { source: undefined, error: null };
      try {
        const source =
          typeof key === "string" ? provider.getDictionary(key) : key;
        return {
          source,
          error: source
            ? null
            : new Error(`[dictionary] 未注册字典：${String(key)}`),
        };
      } catch (error) {
        return { source: undefined, error };
      }
    });
    bindings.set(key, {
      resolution,
      // 同步订阅可能卸载宿主，后续源不再创建消费者。
      view:
        owner?.active === false
          ? undefined
          : useDictionary(() => resolution.value.source, {
              immediate: options.immediate,
              enabled,
            }),
    });
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
              bindings.get(key)?.view?.label(value) ??
                formatLabels(value, () => undefined),
            ];
          }),
        ),
      ) as DictionaryLabels<TFields>;
    }),
    loading: computed(() =>
      [...bindings.values()].some(({ view }) => view?.loading.value),
    ),
    error: computed(() => {
      if (normalized.error) return normalized.error;
      for (const { view, resolution } of bindings.values()) {
        const error = resolution.value.error ?? view?.error.value;
        if (error != null) return error;
      }
      return null;
    }),
    reload: () =>
      Promise.allSettled(
        [...bindings.values()].map(({ view, resolution }) => {
          if (resolution.value.error)
            return Promise.reject(resolution.value.error);
          return view?.reload() ?? Promise.resolve(EMPTY_OPTIONS);
        }),
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

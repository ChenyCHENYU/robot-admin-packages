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
} from "./types";
import { EMPTY_OPTIONS, formatLabels } from "./values";

/** 同一源的多个组件共享加载；卸载只取消当前消费者等待和订阅。 */
export function useDictionary(
  source: MaybeRefOrGetter<DictionarySource | undefined>,
  options: { immediate?: boolean } = {},
) {
  const state = shallowRef<DictionaryState>();
  let owner:
    | {
        source: DictionarySource | undefined;
        controller: AbortController;
        active: boolean;
      }
    | undefined;
  const stop = watch(
    () => toValue(source),
    (current, _previous, cleanup) => {
      // 上一源的取消事件可能同步切到第三个源，旧 watch 回调不能重新夺取所有权。
      if (current !== toValue(source)) return;
      const own = {
        source: current,
        controller: new AbortController(),
        active: true,
      };
      owner = own;
      let unsubscribe: (() => void) | undefined;
      cleanup(() => {
        own.active = false;
        if (owner === own) owner = undefined;
        unsubscribe?.();
        own.controller.abort();
      });
      // cleanup 必须先注册；同步状态观察者可以在任意发布点卸载整个作用域。
      const initial = current?.getState();
      if (!own.active) return;
      state.value = initial;
      if (!own.active) return;
      unsubscribe = current?.subscribe(() => {
        if (!own.active) return;
        const snapshot = current.getState();
        if (own.active) state.value = snapshot;
      });
      if (!own.active) {
        // subscribe 可同步通知并触发卸载，归还刚刚返回的迟到退订函数。
        unsubscribe?.();
        return;
      }
      if (current && options.immediate !== false)
        void current
          .load({ signal: own.controller.signal })
          .catch(() => undefined);
    },
    { immediate: true, flush: "sync" },
  );
  onScopeDispose(stop);
  return {
    state: computed(() => state.value),
    status: computed(() => state.value?.status ?? "idle"),
    options: computed(() => state.value?.options ?? EMPTY_OPTIONS),
    loading: computed(() => state.value?.status === "loading"),
    error: computed(() => state.value?.error ?? null),
    reload: () => {
      if (!owner?.active) {
        const error = new Error("[dictionary] 字典消费者已停止。");
        error.name = "AbortError";
        return Promise.reject(error);
      }
      return (
        owner.source?.load({ force: true, signal: owner.controller.signal }) ??
        Promise.resolve(EMPTY_OPTIONS)
      );
    },
    label: (value: unknown, config?: DictionaryLabelOptions) => {
      // 显式读取快照，使 computed(() => label(code)) 跟随异步数据更新。
      if (!state.value) return formatLabels(value, () => undefined, config);
      return (
        toValue(source)?.label(value, config) ??
        formatLabels(value, () => undefined, config)
      );
    },
  };
}

/** 绑定记录与字段字典，详情直接读取 labels.field；同名源只订阅一次。 */
export function useDictionaryLabels<
  TModel extends object,
  TName extends string,
  TKey extends Extract<keyof TModel, string>,
>(
  store: DictionaryStore<TName>,
  model: MaybeRefOrGetter<TModel | null | undefined>,
  fields: Readonly<Record<TKey, NoInfer<TName>>>,
  options: { immediate?: boolean } = {},
) {
  const owner = getCurrentScope();
  const bindings = new Map<
    string,
    {
      source: DictionarySource | undefined;
      binding: ReturnType<typeof useDictionary> | undefined;
      missing: Error | null;
    }
  >();
  const entries = Object.entries(fields) as [TKey, TName][];
  for (const [, name] of entries) {
    if (bindings.has(name)) continue;
    const source = store.getDictionary(name);
    bindings.set(name, {
      source,
      // 前一个源的同步订阅可能卸载整个作用域，不再创建后续消费者。
      binding:
        owner?.active === false ? undefined : useDictionary(source, options),
      missing: source ? null : new Error(`[dictionary] 未注册字典：${name}`),
    });
  }
  return {
    labels: computed(() => {
      const row = toValue(model);
      return Object.freeze(
        Object.fromEntries(
          entries.map(([field, name]) => {
            const entry = bindings.get(name);
            // 仅选项快照参与标签依赖；loading/error 变化不重算整组文字。
            void entry?.binding?.options.value;
            return [
              field,
              entry?.source?.label(row?.[field]) ??
                formatLabels(row?.[field], () => undefined),
            ];
          }),
        ),
      ) as Readonly<Record<TKey, string>>;
    }),
    loading: computed(() =>
      [...bindings.values()].some(({ binding }) => binding?.loading.value),
    ),
    error: computed(() => {
      for (const { binding, missing } of bindings.values()) {
        const error = missing ?? binding?.error.value;
        if (error != null) return error;
      }
      return null;
    }),
    // 各源独立返回结果，一个失败不阻断其他字段，也不产生未处理拒绝。
    reload: () =>
      Promise.allSettled(
        [...bindings.values()].map(({ binding, missing }) =>
          missing
            ? Promise.reject(missing)
            : (binding?.reload() ?? Promise.resolve(EMPTY_OPTIONS)),
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

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computed,
  effectScope,
  nextTick,
  shallowRef,
  watch,
  type EffectScope,
} from "vue";
import {
  createDictionaryStore,
  type DictionaryOption,
  type DictionarySource,
  type DictionaryStore,
} from "../src";
import { useDictionary, useDictionaryRefresh } from "../src/vue";

const stores: Array<Pick<DictionaryStore, "destroy">> = [];
const scopes: EffectScope[] = [];
function scope() {
  const value = effectScope();
  scopes.push(value);
  return value;
}
function sourceWithLoad(load: () => Promise<readonly DictionaryOption[]>) {
  const store = createDictionaryStore({ state: { load } });
  stores.push(store);
  return store.getDictionary("state");
}
function deferred() {
  let resolve!: (value: readonly DictionaryOption[]) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<readonly DictionaryOption[]>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

afterEach(() => {
  for (const item of scopes.splice(0)) item.stop();
  for (const item of stores.splice(0)) item.destroy();
});

describe("Vue 字典消费", () => {
  it("取消旧消费者时同步切换第三个源，旧 watch 回调不夺回绑定", async () => {
    const request = deferred();
    const first = sourceWithLoad(() => request.promise);
    const second = sourceWithLoad(async () => [{ value: "A", label: "中间" }]);
    const finalStore = createDictionaryStore({
      state: [{ value: "A", label: "最终" }],
    });
    stores.push(finalStore);
    const final = finalStore.getDictionary("state");
    const active = shallowRef<DictionarySource>();
    const intermediateLoad = vi.fn(second.load);
    active.value = {
      ...first,
      load(config) {
        config?.signal?.addEventListener(
          "abort",
          () => {
            active.value = final;
          },
          { once: true },
        );
        return first.load(config);
      },
    };
    const binding = scope().run(() => useDictionary(active))!;
    active.value = { ...second, load: intermediateLoad };
    expect(binding.label("A")).toBe("最终");
    expect(binding.options.value).toBe(final.getOptions());
    expect(intermediateLoad).not.toHaveBeenCalled();
    request.resolve([{ value: "A", label: "迟到" }]);
    await first.load();
    expect(binding.label("A")).toBe("最终");
  });

  it("同轮切换源立即 reload 使用新源自己的 controller", async () => {
    const firstStore = createDictionaryStore({
      state: [{ value: "A", label: "旧" }],
    });
    stores.push(firstStore);
    const request = deferred();
    const next = sourceWithLoad(() => request.promise);
    const active = shallowRef(firstStore.getDictionary("state"));
    const binding = scope().run(() =>
      useDictionary(active, { immediate: false }),
    )!;
    active.value = next;
    const pending = binding.reload();
    await nextTick();
    request.resolve([{ value: "A", label: "新" }]);
    expect(await pending).toEqual([{ value: "A", label: "新" }]);
    expect(binding.label("A")).toBe("新");
  });

  it("同步状态观察者卸载后不再订阅或加载新源", async () => {
    const initial = sourceWithLoad(async () => []);
    const next = sourceWithLoad(async () => [{ value: "A", label: "新" }]);
    let subscriptions = 0;
    const load = vi.fn(next.load);
    const tracked: DictionarySource = {
      ...next,
      load,
      subscribe(listener) {
        subscriptions++;
        const stop = next.subscribe(listener);
        return () => {
          subscriptions--;
          stop();
        };
      },
    };
    const active = shallowRef<DictionarySource>(initial);
    const owner = scope();
    const binding = owner.run(() => {
      const binding = useDictionary(active, { immediate: false });
      watch(binding.state, () => owner.stop(), { flush: "sync" });
      return binding;
    })!;
    active.value = tracked;
    await nextTick();
    expect(owner.active).toBe(false);
    expect(subscriptions).toBe(0);
    expect(load).not.toHaveBeenCalled();
    await expect(binding.reload()).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(load).not.toHaveBeenCalled();
  });

  it("subscribe 同步卸载时归还迟到的 unsubscribe 且不加载", () => {
    const next = sourceWithLoad(async () => []);
    const owner = scope();
    let subscriptions = 0;
    const load = vi.fn(next.load);
    const tracked: DictionarySource = {
      ...next,
      load,
      subscribe(listener) {
        subscriptions++;
        const stop = next.subscribe(listener);
        owner.stop();
        return () => {
          subscriptions--;
          stop();
        };
      },
    };
    owner.run(() => useDictionary(tracked));
    expect(subscriptions).toBe(0);
    expect(load).not.toHaveBeenCalled();
  });

  it("默认加载并将 options、状态与错误映射到只读 refs", async () => {
    const request = deferred();
    const source = sourceWithLoad(() => request.promise);
    const binding = scope().run(() => useDictionary(source))!;
    const translated = computed(() => binding.label(0));
    expect(translated.value).toBe("0");
    expect(binding.loading.value).toBe(true);
    request.resolve([{ value: 0, label: "零" }]);
    await source.load();
    expect(binding.status.value).toBe("ready");
    expect(binding.options.value).toBe(source.getOptions());
    expect(binding.error.value).toBeNull();
    expect(binding.label(0)).toBe("零");
    expect(translated.value).toBe("零");
    expect(binding.label(null)).toBe("—");
  });

  it("手动加载模式不隐式发请求，reload 绕过失败冷却并保留旧值", async () => {
    const error = new Error("offline");
    const load = vi
      .fn<() => Promise<readonly DictionaryOption[]>>()
      .mockResolvedValueOnce([{ value: "A", label: "甲" }])
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce([{ value: "A", label: "乙" }]);
    const source = sourceWithLoad(load);
    const binding = scope().run(() =>
      useDictionary(source, { immediate: false }),
    )!;
    expect(load).not.toHaveBeenCalled();
    expect(binding.status.value).toBe("idle");
    await binding.reload();
    await expect(binding.reload()).rejects.toBe(error);
    expect(binding.options.value).toEqual([{ value: "A", label: "甲" }]);
    expect(binding.error.value).toBe(error);
    await binding.reload();
    expect(binding.label("A")).toBe("乙");
  });

  it("多消费者共享请求，一个 scope 退出不影响另一个", async () => {
    const request = deferred();
    const load = vi.fn(() => request.promise);
    const source = sourceWithLoad(load);
    const firstScope = scope();
    firstScope.run(() => useDictionary(source));
    const other = scope().run(() => useDictionary(source))!;
    await Promise.resolve();
    firstScope.stop();
    request.resolve([{ value: false, label: "否" }]);
    await source.load();
    expect(other.label(false)).toBe("否");
    expect(load).toHaveBeenCalledOnce();
  });

  it("动态源更换后退订旧源，迟到结果不改变新源绑定", async () => {
    const old = deferred();
    const first = sourceWithLoad(() => old.promise);
    const second = sourceWithLoad(async () => [{ value: "A", label: "新" }]);
    const active = shallowRef<DictionarySource | undefined>(first);
    const binding = scope().run(() => useDictionary(() => active.value))!;
    active.value = second;
    await nextTick();
    await second.load();
    old.resolve([{ value: "A", label: "旧" }]);
    await first.load();
    expect(binding.options.value).toBe(second.getOptions());
    expect(binding.label("A")).toBe("新");
    active.value = undefined;
    await nextTick();
    expect(binding.options.value).toEqual([]);
    expect(binding.label([0, false], { separator: "/" })).toBe("0/false");
  });
});

describe("表格快照刷新", () => {
  it("订阅时同步卸载归还当前订阅并跳过其余源", () => {
    const first = sourceWithLoad(async () => []);
    const second = sourceWithLoad(async () => []);
    const owner = scope();
    let subscriptions = 0;
    const secondSubscribe = vi.fn(second.subscribe);
    const tracked: DictionarySource = {
      ...first,
      subscribe(listener) {
        const stop = first.subscribe(listener);
        subscriptions++;
        owner.stop();
        return () => {
          subscriptions--;
          stop();
        };
      },
    };
    owner.run(() =>
      useDictionaryRefresh(
        [tracked, { ...second, subscribe: secondSubscribe }],
        () => undefined,
      ),
    );
    expect(subscriptions).toBe(0);
    expect(secondSubscribe).not.toHaveBeenCalled();
  });

  it("同轮多个字典数据变化只刷新一次，加载与错误状态不刷新", async () => {
    const firstRequest = deferred();
    const secondRequest = deferred();
    const firstLoad = vi.fn(() => firstRequest.promise);
    const first = sourceWithLoad(firstLoad);
    const second = sourceWithLoad(() => secondRequest.promise);
    const refresh = vi.fn();
    scope().run(() => useDictionaryRefresh([first, second, first], refresh));
    const tasks = [first.load(), second.load()];
    await nextTick();
    expect(refresh).not.toHaveBeenCalled();
    firstRequest.resolve([{ value: "A", label: "甲" }]);
    secondRequest.resolve([{ value: "B", label: "乙" }]);
    await Promise.all(tasks);
    await nextTick();
    expect(refresh).toHaveBeenCalledOnce();
    firstLoad.mockRejectedValueOnce(new Error("offline"));
    await expect(first.load({ force: true })).rejects.toThrow("offline");
    await nextTick();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("卸载前排队的刷新被取消且后续快照不会调用回调", async () => {
    const request = deferred();
    const source = sourceWithLoad(() => request.promise);
    const refresh = vi.fn();
    const owner = scope();
    owner.run(() => useDictionaryRefresh([source], refresh));
    source.subscribe(() => {
      if (source.getState().status === "ready") owner.stop();
    });
    const task = source.load();
    request.resolve([{ value: "A", label: "甲" }]);
    await task;
    await nextTick();
    expect(refresh).not.toHaveBeenCalled();
    await source.load({ force: true });
    await nextTick();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("作用域切换清空与重载分别刷新数据，静态源不产生多余刷新", async () => {
    const store = createDictionaryStore({
      fixed: [{ value: 0, label: "零" }],
      remote: { load: async ({ scope }) => [{ value: "A", label: scope }] },
    });
    stores.push(store);
    const remote = store.getDictionary("remote");
    await remote.load();
    const refresh = vi.fn();
    scope().run(() =>
      useDictionaryRefresh([remote, store.getDictionary("fixed")], refresh),
    );
    store.setScope("new");
    await remote.load();
    await nextTick();
    expect(remote.label("A")).toBe("new");
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});

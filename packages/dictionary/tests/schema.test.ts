import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref, shallowRef, type EffectScope } from "vue";
import {
  createDictionaryProvider,
  createDictionaryStore,
  type DictionaryOptionsSource,
  type DictionaryStore,
} from "../src";
import { useDictionaryLabels } from "../src/vue";

const scopes: EffectScope[] = [];
const stores: Array<Pick<DictionaryStore, "destroy">> = [];
function scope() {
  const value = effectScope();
  scopes.push(value);
  return value;
}
afterEach(() => {
  for (const value of scopes.splice(0)) value.stop();
  for (const value of stores.splice(0)) value.destroy();
});

describe("复用字段配置与延迟加载", () => {
  it("无注册表的远程原码供多个字段共用，关闭不请求，异步完成后同步标签", async () => {
    const load = vi.fn(async (name: string) => [{ value: 0, label: name }]);
    const store = createDictionaryStore(load);
    stores.push(store);
    const enabled = ref(false);
    const fields = [
      { prop: "first", dictionary: "backend_code" },
      { field: "second", dictionary: "backend_code" },
    ];
    const details = scope().run(() =>
      useDictionaryLabels(store, { first: 0, second: 0 }, fields, { enabled }),
    )!;
    expect(load).not.toHaveBeenCalled();
    enabled.value = true;
    await store.getDictionary("backend_code")!.load();
    expect(details.labels.value).toEqual({
      first: "backend_code",
      second: "backend_code",
    });
    expect(load).toHaveBeenCalledOnce();
    enabled.value = false;
    store.setScope("next");
    await nextTick();
    expect(load).toHaveBeenCalledOnce();
  });

  it("同步卸载后的迟到退订异常不阻断销毁或启动请求", () => {
    const owner = scope();
    const load = vi.fn(async () => []);
    const source = {
      getOptions: () => [],
      load,
      subscribe: () => {
        owner.stop();
        return () => {
          throw new Error("late unsubscribe");
        };
      },
    };
    expect(() =>
      owner.run(() =>
        useDictionaryLabels(
          { getDictionary: () => source },
          { status: 0 },
          { status: "state" },
        ),
      ),
    ).not.toThrow();
    expect(load).not.toHaveBeenCalled();
  });

  it("组合一次页面与全局来源，缺名称才兜底，加载失败不换源", async () => {
    const failure = new Error("local unavailable");
    const global = createDictionaryStore({
      state: [{ value: 0, label: "全局" }],
      other: [{ value: 0, label: "全局兜底" }],
    });
    const local = createDictionaryStore({
      state: {
        load: async () => {
          throw failure;
        },
      },
    });
    stores.push(global, local);
    const provider = createDictionaryProvider(local, global);
    expect(provider.getDictionary("state")).toBe(local.getDictionary("state"));
    expect(provider.getDictionary("other")).toBe(global.getDictionary("other"));
    expect(provider.getDictionary("missing")).toBeUndefined();
    const details = scope().run(() =>
      useDictionaryLabels(
        provider,
        { status: 0 },
        { status: "state" },
        { immediate: false },
      ),
    )!;
    await details.reload();
    expect(details.error.value).toBe(failure);
    expect(details.labels.value.status).toBe("0");
    expect(createDictionaryProvider().getDictionary("state")).toBeUndefined();
  });

  it("直接复用 prop/key/field，忽略非字典字段，直接源可用且不改配置", async () => {
    const source = { getOptions: () => [{ value: 0, label: "零" }] };
    const getDictionary = vi.fn(() => source);
    const fields = Object.freeze([
      { prop: "status", dictionary: "state", type: "select" },
      { key: "previous", dictionary: "state", title: "历史" },
      { field: "direct", dictionary: source },
      { prop: "plain", type: "input" },
    ] as const);
    const details = scope().run(() =>
      useDictionaryLabels(
        { getDictionary },
        { status: 0, previous: 0, direct: 0, plain: "原文" },
        fields,
      ),
    )!;
    await nextTick();
    expect(details.labels.value).toEqual({
      status: "零",
      previous: "零",
      direct: "零",
    });
    expect(getDictionary).toHaveBeenCalledOnce();
    expect(details.error.value).toBeNull();
    expect(fields[0].dictionary).toBe("state");
  });

  it("空记录与关闭状态均不解析/订阅/加载，打开共享缓存，关闭后不因 scope 变化加载", async () => {
    const load = vi.fn(async () => [{ value: "A", label: "甲" }]);
    const store = createDictionaryStore({ state: { load } });
    stores.push(store);
    const source = store.getDictionary("state");
    const subscribe = vi.fn(source.subscribe);
    const getDictionary = vi.fn(() => ({ ...source, subscribe }));
    const enabled = ref(false);
    const model = ref<{ status: string } | null>(null);
    const details = scope().run(() =>
      useDictionaryLabels(
        { getDictionary },
        model,
        { status: "state" },
        { enabled },
      ),
    )!;
    enabled.value = true;
    await nextTick();
    expect(load).not.toHaveBeenCalled();
    expect(getDictionary).not.toHaveBeenCalled();
    model.value = { status: "A" };
    await source.load();
    expect(details.labels.value.status).toBe("甲");
    enabled.value = false;
    expect(details.labels.value.status).toBe("甲");
    await details.reload();
    store.setScope("另一个公司");
    await nextTick();
    expect(load).toHaveBeenCalledOnce();
    expect(subscribe).toHaveBeenCalledOnce();
    expect(details.loading.value).toBe(false);
    enabled.value = true;
    await source.load();
    expect(load).toHaveBeenCalledTimes(2);
    enabled.value = false;
    enabled.value = true;
    await source.load();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("关闭立即结束忽略取消信号的旧源等待，迟到数据不覆盖新来源", async () => {
    let resolve!: (options: { value: string; label: string }[]) => void;
    const old: DictionaryOptionsSource = {
      getOptions: () => [],
      load: () =>
        new Promise((done) => {
          resolve = done;
        }),
    };
    const next: DictionaryOptionsSource = {
      getOptions: () => [{ value: "A", label: "新来源" }],
    };
    const active = shallowRef(old);
    const enabled = ref(true);
    const details = scope().run(() =>
      useDictionaryLabels(
        { getDictionary: () => active.value },
        { status: "A" },
        { status: "state" },
        { enabled },
      ),
    )!;
    const pending = details.reload();
    enabled.value = false;
    expect((await pending)[0]).toMatchObject({
      status: "rejected",
      reason: { name: "AbortError" },
    });
    active.value = next;
    enabled.value = true;
    expect(details.labels.value.status).toBe("新来源");
    resolve([{ value: "A", label: "迟到旧标签" }]);
    await nextTick();
    expect(details.labels.value.status).toBe("新来源");
  });

  it("旧选项源的原地修改只在通知时建立快照，失败保留旧值并可重试", async () => {
    let options = [{ value: 0, label: "零" }];
    const listeners = new Set<() => void>();
    const failure = new Error("offline");
    const load = vi
      .fn<NonNullable<DictionaryOptionsSource["load"]>>()
      .mockRejectedValueOnce(failure)
      .mockImplementationOnce(
        async () => (options = [{ value: 0, label: "重试恢复" }]),
      );
    const source: DictionaryOptionsSource = {
      getOptions: () => options,
      load,
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };
    const owner = scope();
    const details = owner.run(() =>
      useDictionaryLabels(
        { getDictionary: () => source },
        { status: 0 },
        { status: "state" },
        { immediate: false },
      ),
    )!;
    expect(details.labels.value.status).toBe("零");
    options[0].label = "通知后";
    expect(details.labels.value.status).toBe("零");
    for (const listener of listeners) listener();
    expect(details.labels.value.status).toBe("通知后");
    const snapshot = details.labels.value;
    const pending = details.reload();
    expect(details.labels.value).toBe(snapshot);
    expect((await pending)[0].status).toBe("rejected");
    expect(details.error.value).toBe(failure);
    expect(details.labels.value).toBe(snapshot);
    await details.reload();
    expect(details.error.value).toBeNull();
    expect(details.labels.value.status).toBe("重试恢复");
    owner.stop();
    expect(listeners.size).toBe(0);
  });

  it("配置冲突明确报错且不加载该字段，重复相同配置只解析一次", () => {
    const getDictionary = vi.fn(() => ({ getOptions: () => [] }));
    const details = scope().run(() =>
      useDictionaryLabels({ getDictionary }, { status: 0 }, [
        { prop: "status", dictionary: "one" },
        { key: "status", dictionary: "two" },
      ]),
    )!;
    expect(String(details.error.value)).toContain("冲突");
    expect(getDictionary).not.toHaveBeenCalled();
    const duplicate = scope().run(() =>
      useDictionaryLabels({ getDictionary }, { status: 0 }, [
        { prop: "status", dictionary: "one" },
        { key: "status", dictionary: "one" },
      ]),
    )!;
    expect(duplicate.error.value).toBeNull();
    expect(getDictionary).toHaveBeenCalledOnce();
  });

  it("保留嵌套路径与原样带点字段，不读取原型链", () => {
    const source = { getOptions: () => [{ value: false, label: "否" }] };
    const model = Object.assign(Object.create({ inherited: false }), {
      nested: [{ flag: false }],
      "raw.key": false,
    });
    const details = scope().run(() =>
      useDictionaryLabels({ getDictionary: () => source }, model, [
        { prop: "nested[0].flag", dictionary: "state" },
        { key: "raw.key", dictionary: "state" },
        { field: "inherited", dictionary: "state" },
      ]),
    )!;
    expect(details.labels.value).toEqual({
      "nested[0].flag": "否",
      "raw.key": "否",
      inherited: "—",
    });
  });

  it("来源解析、订阅及数据格式异常保持局部可见，不伪装空字典", () => {
    const denied = new Error("resolver denied");
    const details = scope().run(() =>
      useDictionaryLabels(
        {
          getDictionary: () => {
            throw denied;
          },
        },
        { status: 0 },
        { status: "state" },
      ),
    )!;
    expect(details.error.value).toBe(denied);
    expect(details.labels.value.status).toBe("0");
    const subscribe = new Error("subscribe failed");
    const source = {
      getOptions: () => [],
      subscribe: () => {
        throw subscribe;
      },
    };
    const broken = scope().run(() =>
      useDictionaryLabels(
        { getDictionary: () => source },
        { status: 0 },
        { status: "state" },
      ),
    )!;
    expect(broken.error.value).toBe(subscribe);
  });
});

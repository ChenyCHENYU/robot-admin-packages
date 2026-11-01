import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref, type EffectScope } from "vue";
import {
  createDictionaryStore,
  type DictionaryDefinition,
  type DictionaryStore,
} from "../src";
import { useDictionaryLabels } from "../src/vue";

const scopes: EffectScope[] = [];
const stores: Array<Pick<DictionaryStore, "destroy">> = [];
function scope() {
  const owner = effectScope();
  scopes.push(owner);
  return owner;
}
function store<T extends Record<string, DictionaryDefinition>>(definitions: T) {
  const result = createDictionaryStore(definitions);
  stores.push(result);
  return result;
}
afterEach(() => {
  for (const owner of scopes.splice(0)) owner.stop();
  for (const dictionary of stores.splice(0)) dictionary.destroy();
});

describe("详情字段绑定", () => {
  it("直接读取标签，跟随原码、整条记录和延迟到达的记录，不改写模型", () => {
    const dictionaries = store({
      status: [
        { value: 0, label: "待下达" },
        { value: 1, label: "执行中" },
      ],
    });
    const model = ref<{ status: number; note?: string } | null>(null);
    const { labels } = scope().run(() =>
      useDictionaryLabels(dictionaries, () => model.value, {
        status: "status",
      }),
    )!;
    expect(labels.value.status).toBe("—");
    model.value = { status: 0, note: "原始备注" };
    expect(labels.value.status).toBe("待下达");
    const snapshot = labels.value;
    model.value.note = "非翻译字段变化";
    expect(labels.value).toBe(snapshot);
    model.value.status = 1;
    expect(labels.value.status).toBe("执行中");
    model.value = { status: 99 };
    expect(labels.value.status).toBe("99");
    expect(model.value).toEqual({ status: 99 });
    expect(Object.isFrozen(labels.value)).toBe(true);
  });

  it("相同字典的多个字段共享一次订阅与请求，异步后自动翻译并保留编码类型", async () => {
    let resolve!: (
      value: { value: string | boolean | number; label: string }[],
    ) => void;
    const load = vi.fn(
      () =>
        new Promise<{ value: string | boolean | number; label: string }[]>(
          (done) => {
            resolve = done;
          },
        ),
    );
    const dictionaries = store({ state: { load } });
    const source = dictionaries.getDictionary("state");
    const subscribe = vi.fn(source.subscribe);
    const tracked = {
      ...dictionaries,
      getDictionary: () => ({ ...source, subscribe }),
    };
    const model = ref({ current: "001", previous: false, history: [0, "0"] });
    const { labels } = scope().run(() =>
      useDictionaryLabels(tracked, model, {
        current: "state",
        previous: "state",
        history: "state",
      }),
    )!;
    expect(labels.value).toEqual({
      current: "001",
      previous: "false",
      history: "0、0",
    });
    await Promise.resolve();
    resolve([
      { value: "001", label: "带前导零" },
      { value: false, label: "否" },
      { value: 0, label: "数字零" },
      { value: "0", label: "字符串零" },
    ]);
    await source.load();
    expect(labels.value).toEqual({
      current: "带前导零",
      previous: "否",
      history: "数字零、字符串零",
    });
    expect(subscribe).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledOnce();
    expect(model.value).toEqual({
      current: "001",
      previous: false,
      history: [0, "0"],
    });
  });

  it("失败可见且保留旧标签，重试独立返回结果，状态变化不重算标签", async () => {
    const offline = new Error("offline");
    const load = vi
      .fn<() => Promise<{ value: string; label: string }[]>>()
      .mockResolvedValueOnce([{ value: "A", label: "甲" }])
      .mockRejectedValueOnce(offline)
      .mockResolvedValueOnce([{ value: "A", label: "乙" }]);
    const dictionaries = store({ state: { load }, empty: [] });
    const details = scope().run(() =>
      useDictionaryLabels(
        dictionaries,
        { status: "A", other: null },
        {
          status: "state",
          other: "empty",
        },
        { immediate: false },
      ),
    )!;
    expect(load).not.toHaveBeenCalled();
    await details.reload();
    const snapshot = details.labels.value;
    const retry = details.reload();
    expect(details.loading.value).toBe(true);
    expect(details.labels.value).toBe(snapshot);
    expect((await retry).map((item) => item.status)).toEqual([
      "rejected",
      "fulfilled",
    ]);
    expect(details.error.value).toBe(offline);
    expect(details.loading.value).toBe(false);
    expect(details.labels.value).toBe(snapshot);
    expect(details.labels.value.other).toBe("—");
    await details.reload();
    expect(details.error.value).toBeNull();
    expect(details.labels.value.status).toBe("乙");
  });

  it("缺失字典回显原值并提供可见错误，空绑定不加载或报错", async () => {
    const dictionaries = store({} as Record<string, DictionaryDefinition>);
    const details = scope().run(() =>
      useDictionaryLabels(dictionaries, { status: "A" }, { status: "missing" }),
    )!;
    expect(details.labels.value.status).toBe("A");
    expect(details.error.value).toEqual(
      new Error("[dictionary] 未注册字典：missing"),
    );
    expect((await details.reload())[0].status).toBe("rejected");
    const empty = scope().run(() => useDictionaryLabels(dictionaries, {}, {}))!;
    expect(empty.labels.value).toEqual({});
    expect(empty.error.value).toBeNull();
    expect(empty.loading.value).toBe(false);
    expect(await empty.reload()).toEqual([]);
  });

  it("作用域切换不展示旧租户标签，卸载归还订阅且不会取消其他消费者", async () => {
    const load = vi.fn(async ({ scope }: { scope: string }) => [
      { value: "A", label: scope },
    ]);
    const dictionaries = store({ state: { load } });
    const source = dictionaries.getDictionary("state");
    const owner = scope();
    const details = owner.run(() =>
      useDictionaryLabels(dictionaries, { status: "A" }, { status: "state" }),
    )!;
    await source.load();
    expect(details.labels.value.status).toBe("default");
    dictionaries.setScope("下一工厂");
    expect(details.labels.value.status).toBe("A");
    await source.load();
    expect(details.labels.value.status).toBe("下一工厂");
    owner.stop();
    const result = await details.reload();
    expect(result[0].status).toBe("rejected");
    expect(load).toHaveBeenCalledTimes(2);
    await expect(source.load()).resolves.toEqual([
      { value: "A", label: "下一工厂" },
    ]);
  });

  it("同步订阅导致卸载时不继续创建后续订阅或请求", async () => {
    const dictionaries = store({
      first: { load: async () => [] },
      second: { load: async () => [] },
    });
    const owner = scope();
    const first = dictionaries.getDictionary("first");
    const subscribe = first.subscribe;
    const subscribeFirst = vi.fn<typeof first.subscribe>((listener) => {
      const stop = subscribe(listener);
      owner.stop();
      return stop;
    });
    const second = dictionaries.getDictionary("second");
    const subscribeSecond = vi.fn(second.subscribe);
    const loadSecond = vi.fn(second.load);
    const tracked = {
      ...dictionaries,
      getDictionary: (name: string) =>
        name === "first"
          ? { ...first, subscribe: subscribeFirst }
          : { ...second, subscribe: subscribeSecond, load: loadSecond },
    };
    owner.run(() =>
      useDictionaryLabels(
        tracked,
        { first: 0, second: 0 },
        {
          first: "first",
          second: "second",
        },
      ),
    );
    await nextTick();
    expect(subscribeSecond).not.toHaveBeenCalled();
    expect(loadSecond).not.toHaveBeenCalled();
  });
});

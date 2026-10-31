import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createDictionaryStore,
  defineEnum,
  type DictionaryLoadContext,
  type DictionaryOption,
  type DictionaryStore,
} from "../src";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function controlled() {
  const requests: Array<
    DictionaryLoadContext &
      ReturnType<typeof deferred<readonly DictionaryOption[]>>
  > = [];
  const load = vi.fn((context: DictionaryLoadContext) => {
    const request = { ...context, ...deferred<readonly DictionaryOption[]>() };
    requests.push(request);
    return request.promise;
  });
  return { load, requests };
}

const stores: Array<Pick<DictionaryStore, "destroy">> = [];
function store<T extends Parameters<typeof createDictionaryStore>[0]>(
  definitions: T,
  config: Parameters<typeof createDictionaryStore>[1] = {},
) {
  const result = createDictionaryStore(definitions, config);
  stores.push(result);
  return result;
}
async function tick() {
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => {
  for (const item of stores.splice(0)) item.destroy();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("枚举与同步翻译", () => {
  it("严格保留零、boolean、字符串编码并复制冻结选项", async () => {
    const input = [
      { value: 0, label: "零" },
      { value: false, label: "否" },
      { value: "0", label: "字符零" },
      { value: "false", label: "字符否" },
      { value: "001", label: "前导零", disabled: true, color: "blue" },
    ];
    const enumeration = defineEnum(input);
    expect(enumeration).not.toBe(input);
    expect(Object.isFrozen(enumeration)).toBe(true);
    expect(Object.isFrozen(enumeration[0])).toBe(true);
    input[0]!.label = "修改外部输入";
    const source = store({ flags: enumeration }).getDictionary("flags");
    expect(source.get(0)).toBe("零");
    expect(source.get(false)).toBe("否");
    expect(source.get("0")).toBe("字符零");
    expect(source.get("false")).toBe("字符否");
    expect(source.label("001")).toBe("前导零");
    expect(source.getOptions()[4]).toMatchObject({
      disabled: true,
      color: "blue",
    });
    expect(await source.load()).toBe(source.getOptions());
  });

  it("未知回显、空值可配，多值不隐式拆分或推断编码类型", () => {
    const source = store({
      codes: [
        { value: "A", label: "甲" },
        { value: "B", label: "乙" },
        { value: 1, label: "数字" },
      ],
    }).getDictionary("codes");
    expect(source.label("unknown")).toBe("unknown");
    expect(source.label(null)).toBe("—");
    expect(source.label([], { empty: "无" })).toBe("无");
    expect(source.label(["A", "B", "unknown"], { separator: " / " })).toBe(
      "甲 / 乙 / unknown",
    );
    expect(source.label("A,B")).toBe("A,B");
    expect(source.label(" A,, B ", { split: "," })).toBe("甲、乙");
    expect(source.label("A;B", { split: /;/ })).toBe("甲、乙");
    expect(source.label("1", { split: "," })).toBe("1");
    expect(source.label("X", { unknown: "未维护" })).toBe("未维护");
    expect(
      source.label("X", { unknown: (value) => `历史:${String(value)}` }),
    ).toBe("历史:X");
  });

  it("空标签和显式空字符串编码仍优先于默认占位符", () => {
    const source = store({
      blank: [
        { value: "", label: "空码" },
        { value: "A", label: "" },
      ],
    }).getDictionary("blank");
    expect(source.label("")).toBe("空码");
    expect(source.label("A")).toBe("");
  });

  it.each(
    [
      [{ value: NaN, label: "坏值" }],
      [{ value: Infinity, label: "坏值" }],
      [{ value: "A", label: 1 }],
      [{ value: "A", label: "甲", disabled: "yes" }],
      [
        { value: "A", label: "甲" },
        { value: "A", label: "重复" },
      ],
    ].map((value) => [value]),
  )("拒绝非法或重复选项 %j", (value) => {
    expect(() => defineEnum(value as readonly DictionaryOption[])).toThrow();
  });

  it("拒绝对象枚举键推断、非法定义和时间配置", () => {
    expect(() =>
      defineEnum({ 1: "一" } as unknown as readonly DictionaryOption[]),
    ).toThrow();
    expect(() => store({ broken: {} } as never)).toThrow();
    expect(() => store({}, { ttlMs: NaN })).toThrow();
    expect(() => store({}, { retryDelayMs: -1 })).toThrow();
    expect(() => store({}, { timeoutMs: 0 })).toThrow();
    expect(() =>
      store({ code: { load: async () => [], ttlMs: -1 } }),
    ).toThrow();
  });

  it("同名 handle 稳定，动态未知返回 undefined，实例缓存不共享", async () => {
    const first = store({ state: [{ value: "A", label: "甲" }] });
    const second = store({ state: [{ value: "A", label: "乙" }] });
    expect(first.getDictionary("state")).toBe(first.getDictionary("state"));
    const unknown: string = "missing";
    expect(first.getDictionary(unknown)).toBeUndefined();
    expect(first.getDictionary("state").label("A")).toBe("甲");
    expect(second.getDictionary("state").label("A")).toBe("乙");
    expect(await store({ empty: [] }).getDictionary("empty").load()).toEqual(
      [],
    );
  });
});

describe("共享请求、状态和恢复", () => {
  it("普通与 force 等待共享同一请求，先提交完整状态再通知", async () => {
    const { load, requests } = controlled();
    const source = store({ status: { load } }).getDictionary("status");
    const updates: unknown[] = [];
    source.subscribe(() =>
      updates.push({ state: source.getState(), label: source.get("A") }),
    );
    const first = source.load();
    expect(source.load({ force: true })).toBe(first);
    expect(source.load()).toBe(first);
    await tick();
    expect(load).toHaveBeenCalledOnce();
    expect(source.getState().status).toBe("loading");
    requests[0]!.resolve([{ value: "A", label: "甲" }]);
    const values = await first;
    expect(values).toBe(source.getOptions());
    expect(Object.isFrozen(source.getState())).toBe(true);
    expect(updates).toEqual([
      {
        state: expect.objectContaining({ status: "loading", options: [] }),
        label: undefined,
      },
      {
        state: expect.objectContaining({
          status: "ready",
          options: values,
          error: null,
        }),
        label: "甲",
      },
    ]);
  });

  it("取消一个消费者不影响其他等待者和共享加载", async () => {
    const { load, requests } = controlled();
    const source = store({ state: { load } }).getDictionary("state");
    const controller = new AbortController();
    const first = source.load({ signal: controller.signal });
    const other = source.load();
    await tick();
    const rejected = expect(first).rejects.toMatchObject({
      name: "AbortError",
    });
    controller.abort();
    await rejected;
    expect(requests[0]!.signal.aborted).toBe(false);
    requests[0]!.resolve([{ value: 0, label: "零" }]);
    expect(await other).toEqual([{ value: 0, label: "零" }]);
    expect(load).toHaveBeenCalledOnce();
  });

  it("已取消消费者不会启动加载，成功缓存命中也遵循取消", async () => {
    const load = vi.fn(async () => []);
    const source = store({ state: { load } }).getDictionary("state");
    const controller = new AbortController();
    controller.abort();
    await expect(
      source.load({ signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(load).not.toHaveBeenCalled();
    const staticSource = store({ state: [] }).getDictionary("state");
    await expect(
      staticSource.load({ signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("成功空数组明确 empty 且按 TTL 缓存，过期重新加载", async () => {
    vi.useFakeTimers();
    const load = vi.fn(async () => []);
    const source = store({ state: { load } }, { ttlMs: 100 }).getDictionary(
      "state",
    );
    await source.load();
    expect(source.getState().status).toBe("empty");
    await source.load();
    expect(load).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(100);
    await source.load();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("TTL 0 不过期，定义级 TTL 可覆盖全局设置", async () => {
    vi.useFakeTimers();
    const persistent = vi.fn(async () => [{ value: "A", label: "甲" }]);
    const expiring = vi.fn(async () => []);
    const dictionaries = store(
      {
        stable: { load: persistent, ttlMs: 0 },
        timed: { load: expiring, ttlMs: 1 },
      },
      { ttlMs: 100 },
    );
    await dictionaries.preload();
    vi.advanceTimersByTime(1000);
    await dictionaries.preload();
    expect(persistent).toHaveBeenCalledOnce();
    expect(expiring).toHaveBeenCalledTimes(2);
  });

  it("共享失败仅报告一次，冷却避免刷错，force 与冷却结束后均可重试", async () => {
    vi.useFakeTimers();
    const error = new Error("offline");
    const load = vi
      .fn<() => Promise<readonly DictionaryOption[]>>()
      .mockRejectedValue(error);
    const onError = vi.fn();
    const source = store(
      { state: { load } },
      { retryDelayMs: 100, onError },
    ).getDictionary("state");
    await Promise.allSettled([
      source.load(),
      source.load(),
      source.load({ force: true }),
    ]);
    expect(onError).toHaveBeenCalledOnce();
    expect(source.getState()).toMatchObject({
      status: "error",
      error,
      options: [],
    });
    await expect(source.load()).rejects.toBe(error);
    expect(load).toHaveBeenCalledOnce();
    await expect(source.load({ force: true })).rejects.toBe(error);
    expect(load).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(100);
    load.mockResolvedValue([{ value: "A", label: "恢复" }]);
    await source.load();
    expect(source.getState()).toMatchObject({ status: "ready", error: null });
  });

  it("刷新失败保留同作用域旧快照，成功恢复后替换快照", async () => {
    const error = new Error("offline");
    const load = vi
      .fn<() => Promise<readonly DictionaryOption[]>>()
      .mockResolvedValueOnce([{ value: "A", label: "旧值" }])
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce([{ value: "A", label: "新值" }]);
    const source = store({ state: { load } }).getDictionary("state");
    const snapshot = await source.load();
    const updatedAt = source.getState().updatedAt;
    await expect(source.load({ force: true })).rejects.toBe(error);
    expect(source.getOptions()).toBe(snapshot);
    expect(source.label("A")).toBe("旧值");
    expect(source.getState()).toMatchObject({
      status: "error",
      updatedAt,
      error,
    });
    await source.load({ force: true });
    expect(source.getOptions()).not.toBe(snapshot);
    expect(source.label("A")).toBe("新值");
  });

  it("非法响应作为失败，绝不假装 empty 或污染已有快照", async () => {
    const load = vi
      .fn<() => Promise<readonly DictionaryOption[]>>()
      .mockResolvedValueOnce([{ value: "A", label: "正常" }])
      .mockResolvedValueOnce([
        { value: "A", label: "甲" },
        { value: "A", label: "重复" },
      ]);
    const source = store({ state: { load } }).getDictionary("state");
    await source.load();
    await expect(source.load({ force: true })).rejects.toThrow("重复");
    expect(source.label("A")).toBe("正常");
    expect(source.getState().status).toBe("error");
  });

  it("超时结束永久 loading，撤销网络且忽略迟到结果", async () => {
    vi.useFakeTimers();
    const { load, requests } = controlled();
    const onError = vi.fn();
    const source = store(
      { state: { load } },
      { timeoutMs: 10, onError },
    ).getDictionary("state");
    const first = source.load();
    await tick();
    const rejected = expect(first).rejects.toMatchObject({
      name: "TimeoutError",
    });
    await vi.advanceTimersByTimeAsync(10);
    await rejected;
    expect(requests[0]!.signal.aborted).toBe(true);
    expect(source.getState().status).toBe("error");
    expect(onError).toHaveBeenCalledOnce();
    requests[0]!.resolve([{ value: "A", label: "迟到" }]);
    await tick();
    expect(source.get("A")).toBeUndefined();
  });

  it("preload 聚合结果不因一个失败阻断其他字典", async () => {
    const error = new Error("offline");
    const dictionaries = store({
      normal: { load: async () => [{ value: "A", label: "甲" }] },
      failed: {
        load: async () => {
          throw error;
        },
      },
      static: [{ value: false, label: "否" }],
    });
    const results = await dictionaries.preload();
    expect(results.map((result) => result.status)).toEqual([
      "fulfilled",
      "rejected",
      "fulfilled",
    ]);
    expect(results[1]).toMatchObject({ reason: error });
    expect(dictionaries.getDictionary("normal").label("A")).toBe("甲");
  });
});

describe("作用域、失效与订阅生命周期", () => {
  it("async 订阅者拒绝被接管，静态作用域通知和其他订阅者仍正常", async () => {
    const dictionaries = store({ state: [{ value: 0, label: "零" }] });
    const source = dictionaries.getDictionary("state");
    const observer = vi.fn();
    source.subscribe(async () => {
      throw new Error("async subscriber failure");
    });
    source.subscribe(observer);
    dictionaries.setScope("next");
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(observer).toHaveBeenCalledOnce();
    expect(source.getState().scope).toBe("next");
  });

  it.each(["scope", "invalidate"] as const)(
    "成功通知中同步 %s 时不向原等待者返回过期快照",
    async (action) => {
      const dictionaries = store({
        state: { load: async () => [{ value: "A", label: "旧" }] },
      });
      const source = dictionaries.getDictionary("state");
      const unsubscribe = source.subscribe(() => {
        if (source.getState().status !== "ready") return;
        unsubscribe();
        if (action === "scope") dictionaries.setScope("new");
        else dictionaries.invalidate("state");
      });
      await expect(source.load()).rejects.toMatchObject({ name: "AbortError" });
      expect(source.get("A")).toBeUndefined();
    },
  );

  it("取消事件同步重入 setScope 时所有源保留最后一次作用域", async () => {
    const request = deferred<readonly DictionaryOption[]>();
    const dictionaries = store({
      a: {
        load: ({ signal }) => {
          signal.addEventListener(
            "abort",
            () => dictionaries.setScope("latest"),
            { once: true },
          );
          return request.promise;
        },
      },
      b: { load: async () => [] },
      fixed: [{ value: 0, label: "零" }],
    });
    const a = dictionaries.getDictionary("a");
    const pending = a.load();
    await tick();
    const rejected = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });
    dictionaries.setScope("intermediate");
    await rejected;
    for (const name of ["a", "b", "fixed"] as const) {
      expect(dictionaries.getDictionary(name).getState().scope).toBe("latest");
    }
    request.resolve([{ value: "A", label: "stale" }]);
    await tick();
    expect(a.get("A")).toBeUndefined();
  });

  it("取消旧网络时所有源已经换作用域，重入和退订也不会遗漏旧请求清理", async () => {
    const pending = [
      deferred<readonly DictionaryOption[]>(),
      deferred<readonly DictionaryOption[]>(),
    ];
    const signals: AbortSignal[] = [];
    const observed: string[][] = [];
    const dictionaries = store({
      a: {
        load: ({ signal }) => {
          signals.push(signal);
          signal.addEventListener("abort", () => {
            observed.push([
              dictionaries.getDictionary("a").getState().scope,
              dictionaries.getDictionary("b").getState().scope,
            ]);
            dictionaries.setScope("latest");
          });
          return pending[0]!.promise;
        },
      },
      b: {
        load: ({ signal }) => {
          signals.push(signal);
          return pending[1]!.promise;
        },
      },
    });
    const tasks = [
      dictionaries.getDictionary("a").load(),
      dictionaries.getDictionary("b").load(),
    ];
    await tick();
    dictionaries.setScope("intermediate");
    expect(observed).toEqual([["intermediate", "intermediate"]]);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    expect(
      (await Promise.allSettled(tasks)).every(
        (result) => result.status === "rejected",
      ),
    ).toBe(true);
    expect(dictionaries.getDictionary("a").getState().scope).toBe("latest");
    expect(dictionaries.getDictionary("b").getState().scope).toBe("latest");
  });

  it("作用域切换取消旧请求并阻止反序结果和旧失败回填", async () => {
    const { load, requests } = controlled();
    const onError = vi.fn();
    const dictionaries = store(
      { state: { load } },
      { scope: "tenant-A:zh", onError },
    );
    const source = dictionaries.getDictionary("state");
    const first = source.load();
    await tick();
    const rejected = expect(first).rejects.toMatchObject({
      name: "AbortError",
    });
    dictionaries.setScope("tenant-B:en");
    await rejected;
    expect(requests[0]!.signal.aborted).toBe(true);
    expect(source.getState()).toMatchObject({
      status: "idle",
      options: [],
      scope: "tenant-B:en",
    });
    const second = source.load();
    await tick();
    expect(requests[1]!.scope).toBe("tenant-B:en");
    requests[1]!.resolve([{ value: "A", label: "new" }]);
    await second;
    requests[0]!.reject(new Error("old failure"));
    await tick();
    expect(source.label("A")).toBe("new");
    expect(onError).not.toHaveBeenCalled();
  });

  it("活跃源在作用域切换后重载，静态快照不变，未订阅源保持惰性", async () => {
    const active = vi.fn(async ({ scope }: DictionaryLoadContext) => [
      { value: "A", label: scope },
    ]);
    const lazy = vi.fn(async () => []);
    const dictionaries = store({
      active: { load: active },
      lazy: { load: lazy },
      fixed: [{ value: 0, label: "零" }],
    });
    const source = dictionaries.getDictionary("active");
    source.subscribe(() => undefined);
    const snapshot = dictionaries.getDictionary("fixed").getOptions();
    await source.load();
    dictionaries.setScope("tenant-B");
    await source.load();
    expect(active).toHaveBeenCalledTimes(2);
    expect(source.label("A")).toBe("tenant-B");
    expect(lazy).not.toHaveBeenCalled();
    expect(dictionaries.getDictionary("fixed").getOptions()).toBe(snapshot);
  });

  it("切换前清空所有远程源，订阅回调也读不到其他源的旧租户快照", async () => {
    const dictionaries = store({
      a: { load: async () => [{ value: "A", label: "旧" }] },
      b: { load: async () => [{ value: "A", label: "旧" }] },
    });
    await dictionaries.preload();
    const b = dictionaries.getDictionary("b");
    const observed: unknown[] = [];
    dictionaries
      .getDictionary("a")
      .subscribe(() =>
        observed.push({ scope: b.getState().scope, label: b.get("A") }),
      );
    dictionaries.setScope("new");
    expect(observed).toContainEqual({ scope: "new", label: undefined });
    expect(
      observed.every((value) => (value as { scope: string }).scope === "new"),
    ).toBe(true);
  });

  it("失效结束旧等待，后续新请求不受旧响应影响", async () => {
    const { load, requests } = controlled();
    const dictionaries = store({ state: { load } });
    const source = dictionaries.getDictionary("state");
    const first = source.load();
    await tick();
    const rejected = expect(first).rejects.toMatchObject({
      name: "AbortError",
    });
    dictionaries.invalidate("state");
    await rejected;
    const second = source.load();
    await tick();
    requests[0]!.resolve([{ value: "A", label: "旧" }]);
    requests[1]!.resolve([{ value: "A", label: "新" }]);
    await second;
    expect(source.label("A")).toBe("新");
  });

  it("订阅者与错误观察者异常不会破坏状态或阻断其他订阅者", async () => {
    const error = new Error("offline");
    const onError = vi.fn(async () => {
      throw new Error("observer");
    });
    const source = store(
      {
        state: {
          load: async () => {
            throw error;
          },
        },
      },
      { onError },
    ).getDictionary("state");
    const listener = vi.fn();
    source.subscribe(() => {
      throw new Error("subscriber");
    });
    const unsubscribe = source.subscribe(listener);
    await expect(source.load()).rejects.toBe(error);
    await tick();
    expect(source.getState()).toMatchObject({ status: "error", error });
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    await expect(source.load({ force: true })).rejects.toBe(error);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("错误回调中切换作用域不改写原始错误上下文", async () => {
    const onError = vi.fn();
    const dictionaries = store(
      {
        state: {
          load: async () => {
            throw new Error("offline");
          },
        },
      },
      { scope: "old", onError },
    );
    const source = dictionaries.getDictionary("state");
    const unsubscribe = source.subscribe(() => {
      if (source.getState().status !== "error") return;
      unsubscribe();
      dictionaries.setScope("new");
    });
    await expect(source.load()).rejects.toThrow("offline");
    expect(onError).toHaveBeenCalledWith(expect.any(Error), {
      name: "state",
      scope: "old",
    });
  });

  it("销毁取消等待、清除快照与定时器、拒绝后续加载并忽略迟到返回", async () => {
    vi.useFakeTimers();
    const { load, requests } = controlled();
    const dictionaries = store({ state: { load } });
    const source = dictionaries.getDictionary("state");
    const first = source.load();
    await tick();
    const rejected = expect(first).rejects.toMatchObject({
      name: "AbortError",
    });
    dictionaries.destroy();
    dictionaries.destroy();
    await rejected;
    expect(requests[0]!.signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    requests[0]!.resolve([{ value: "A", label: "迟到" }]);
    await tick();
    expect(source.getOptions()).toEqual([]);
    await expect(source.load()).rejects.toThrow("销毁");
  });
});

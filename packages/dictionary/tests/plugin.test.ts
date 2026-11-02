import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSSRApp,
  effectScope,
  h,
  inject,
  nextTick,
  onServerPrefetch,
  ref,
  type App,
  type EffectScope,
  type Ref,
} from "vue";
import { renderToString } from "vue/server-renderer";
import {
  createDictionaryStore,
  type DictionaryOption,
  type DictionaryStore,
} from "../src";
import {
  createDictionaryPlugin,
  useDictionaries,
  useDictLabels,
  useDictionary,
  type DictionaryPlugin,
} from "../src/vue";
import {
  DICTIONARY_PROVIDER_KEY,
  DICTIONARY_STORE_KEY,
} from "../src/vue-context";

const installations: Array<{ app: App; plugin: DictionaryPlugin }> = [];
const consumers: EffectScope[] = [];
const rawStores: Array<Pick<DictionaryStore, "destroy">> = [];
function install(config: Parameters<typeof createDictionaryPlugin>[0] = {}) {
  const app = createSSRApp({ render: () => h("div") });
  const plugin = createDictionaryPlugin(config);
  app.use(plugin);
  installations.push({ app, plugin });
  return { app, plugin, store: app.runWithContext(useDictionaries) };
}
function consume<T>(app: App, create: () => T): T {
  const owner = effectScope();
  consumers.push(owner);
  return owner.run(() => app.runWithContext(create))!;
}
function pending() {
  let resolve!: (value: readonly DictionaryOption[]) => void;
  const promise = new Promise<readonly DictionaryOption[]>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
afterEach(() => {
  for (const owner of consumers.splice(0)) owner.stop();
  for (const { app, plugin } of installations.splice(0)) plugin.dispose(app);
  for (const store of rawStores.splice(0)) store.destroy();
  vi.restoreAllMocks();
});

describe("独立字典插件", () => {
  it("不读取外部按固定字符串提供的桥接 token，命名消费只读取本插件实例", async () => {
    const app = createSSRApp({ render: () => null });
    const external = { getDictionary: vi.fn(() => undefined) };
    app.provide(Symbol.for("@robot-admin/dictionary/provider/v1"), external);
    const plugin = createDictionaryPlugin({
      dictionaries: { own: [{ value: 0, label: "本插件" }] },
    });
    app.use(plugin);
    installations.push({ app, plugin });
    const state = consume(app, () => useDictionary("own"));
    expect(state.label(0)).toBe("本插件");
    expect(external.getDictionary).not.toHaveBeenCalled();
  });
  it("scope getter 重入安装内层插件时，外层回滚且不覆盖或销毁内层", () => {
    const app = createSSRApp({ render: () => null });
    const inner = createDictionaryPlugin({
      dictionaries: { own: [{ value: 0, label: "内层" }] },
    });
    const input = ref(0);
    const getter = vi.fn(() => {
      void input.value;
      app.use(inner);
      return "outer";
    });
    const outer = createDictionaryPlugin({ scope: getter });
    expect(() => app.use(outer)).toThrow("其他字典提供器");
    installations.push({ app, plugin: inner });
    const store = app.runWithContext(useDictionaries);
    expect(store.getDictionary("own")!.label(0)).toBe("内层");
    input.value++;
    expect(getter).toHaveBeenCalledOnce();
    outer.dispose(app);
    expect(store.getDictionary("own")!.label(0)).toBe("内层");
  });

  it("onUnmount 公共注册过程同步销毁时，不继续提供已经销毁的 Store", () => {
    const app = createSSRApp({ render: () => null });
    vi.spyOn(app, "onUnmount").mockImplementation((callback) => {
      callback();
    });
    const input = ref("甲");
    const getter = vi.fn(() => input.value);
    const plugin = createDictionaryPlugin({ scope: getter });
    expect(() => app.use(plugin)).toThrow("安装中已被销毁");
    input.value = "乙";
    expect(getter).toHaveBeenCalledOnce();
    expect(() => app.runWithContext(useDictionaries)).toThrow(
      "createDictionaryPlugin",
    );
    expect(
      app.runWithContext(() => inject(DICTIONARY_PROVIDER_KEY, undefined)),
    ).toBeUndefined();
  });

  it("provide 同步 dispose 不能宣布安装成功，部分写入只回滚自己的值", async () => {
    const app = createSSRApp({ render: () => null });
    const original = app.provide;
    const input = ref("甲");
    const getter = vi.fn(() => input.value);
    const plugin = createDictionaryPlugin({
      scope: getter,
      dictionaries: { own: [] },
    });
    let captured: DictionaryStore | undefined;
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(app, "provide").mockImplementation(function (
      this: App,
      key,
      value,
    ) {
      original.call(this, key, value);
      if (key === DICTIONARY_PROVIDER_KEY && value) {
        captured = app.runWithContext(useDictionaries);
        plugin.dispose(app);
      }
      return this;
    });
    expect(() => app.use(plugin)).toThrow("安装中已被销毁");
    input.value = "乙";
    expect(getter).toHaveBeenCalledOnce();
    expect(() => app.runWithContext(useDictionaries)).toThrow(
      "createDictionaryPlugin",
    );
    expect(
      app.runWithContext(() => inject(DICTIONARY_PROVIDER_KEY, undefined)),
    ).toBeUndefined();
    await expect(captured!.getDictionary("own")!.load()).rejects.toThrow(
      "销毁",
    );
  });

  it("provide 重入换成另一实例时，失败外层不能擦掉新实例的两个提供值", () => {
    const app = createSSRApp({ render: () => null });
    const original = app.provide;
    const inner = createDictionaryPlugin({
      dictionaries: { own: [{ value: 0, label: "保留内层" }] },
    });
    let replaced = false;
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(app, "provide").mockImplementation(function (
      this: App,
      key,
      value,
    ) {
      original.call(this, key, value);
      if (key === DICTIONARY_PROVIDER_KEY && !replaced) {
        replaced = true;
        const clear = (target: symbol) =>
          original.call(this, target, undefined);
        clear(DICTIONARY_STORE_KEY);
        clear(DICTIONARY_PROVIDER_KEY);
        app.use(inner);
      }
      return this;
    });
    const outer = createDictionaryPlugin();
    expect(() => app.use(outer)).toThrow("其他字典提供器");
    installations.push({ app, plugin: inner });
    const store = app.runWithContext(useDictionaries);
    expect(store.getDictionary("own")!.label(0)).toBe("保留内层");
    expect(app.runWithContext(() => inject(DICTIONARY_PROVIDER_KEY))).toBe(
      store,
    );
    outer.dispose(app);
    expect(store.getDictionary("own")!.label(0)).toBe("保留内层");
  });

  it("默认配置不请求；命名消费缺插件或缺字典为局部错误，直接源仍独立可用", async () => {
    const owner = effectScope();
    consumers.push(owner);
    const missing = owner.run(() => useDictionary("user_status"))!;
    expect(missing.status.value).toBe("error");
    expect(String(missing.error.value)).toContain("createDictionaryPlugin");
    await expect(missing.reload()).rejects.toThrow("createDictionaryPlugin");
    const labels = owner.run(() =>
      useDictLabels({ account: "1" }, { account: "user_status" }),
    )!;
    expect(labels.labels.value.account).toBe("1");
    expect(String(labels.error.value)).toContain("createDictionaryPlugin");
    const direct = owner.run(() =>
      useDictionary({ getOptions: () => [{ value: "1", label: "直接" }] }),
    )!;
    expect(direct.label("1")).toBe("直接");
    expect(direct.error.value).toBeNull();
    expect(() => useDictionaries()).toThrow("createDictionaryPlugin");
    const { app, store } = install();
    expect(await store.preload()).toEqual([]);
    const unknown = consume(app, () => useDictionary("unknown"));
    expect(String(unknown.error.value)).toContain("未注册");
  });

  it("无 UI 包的 SSR 原生 select、详情共用一次加载，原值保留", async () => {
    const load = vi.fn(async (code: string) => [
      { value: "1", label: `${code} 正常` },
    ]);
    const plugin = createDictionaryPlugin({ load });
    let model: { account: string } | undefined;
    const app = createSSRApp({
      setup() {
        model = { account: "1" };
        const state = useDictionary("user_status");
        const detail = useDictLabels(model, { account: "user_status" });
        const dictionaries = useDictionaries();
        onServerPrefetch(() => dictionaries.preload(["user_status"]));
        return () =>
          h("section", [
            h(
              "select",
              state.options.value.map((option) =>
                h("option", { value: option.value }, option.label),
              ),
            ),
            h("span", detail.labels.value.account),
          ]);
      },
    });
    app.use(plugin);
    installations.push({ app, plugin });
    expect(await renderToString(app)).toContain('value="1">user_status 正常');
    expect(load).toHaveBeenCalledOnce();
    expect(model?.account).toBe("1");
  });

  it("同一插件复用多个 app，各自读取注入身份且 dispose 不跨 app", async () => {
    const load = vi.fn(async (code: string, context: { scope: string }) => [
      { value: code, label: context.scope },
    ]);
    const scopeA = ref("公司甲");
    const scopeB = ref("公司乙");
    const read = vi.fn(() => inject<Ref<string>>("tenant")!.value);
    const plugin = createDictionaryPlugin({ load, scope: read });
    const a = createSSRApp({ render: () => null });
    const b = createSSRApp({ render: () => null });
    a.provide("tenant", scopeA).use(plugin);
    b.provide("tenant", scopeB).use(plugin);
    installations.push({ app: a, plugin }, { app: b, plugin });
    const storeA = a.runWithContext(useDictionaries);
    const storeB = b.runWithContext(useDictionaries);
    expect(storeA).not.toBe(storeB);
    await Promise.all([storeA.preload(["code"]), storeB.preload(["code"])]);
    expect(storeA.getDictionary("code")!.label("code")).toBe("公司甲");
    expect(storeB.getDictionary("code")!.label("code")).toBe("公司乙");
    plugin.dispose(a);
    const reads = read.mock.calls.length;
    scopeA.value = "旧 app 已释放";
    expect(read).toHaveBeenCalledTimes(reads);
    scopeB.value = "公司丙";
    await storeB.preload(["code"]);
    expect(storeB.getDictionary("code")!.label("code")).toBe("公司丙");
    await expect(storeA.getDictionary("code")!.load()).rejects.toThrow("销毁");
    plugin.dispose(a);
  });

  it("名称 ref/getter 跟随切换，显式局部来源不接管应用 Store", async () => {
    const { app, store } = install({
      load: async (code) => [{ value: 0, label: code }],
    });
    const code = ref("first");
    const state = consume(app, () => useDictionary(() => code.value));
    const byRef = consume(app, () => useDictionary(code));
    await Promise.all([state.reload(), byRef.reload()]);
    expect(state.label(0)).toBe("first");
    code.value = "second";
    await state.reload();
    expect(state.label(0)).toBe("second");
    expect(byRef.label(0)).toBe("second");
    const local = createDictionaryStore({
      first: [{ value: 0, label: "本页" }],
    });
    rawStores.push(local);
    const scoped = consume(app, () =>
      useDictLabels(ref({ value: 0 }), { value: "first" }, { provider: local }),
    );
    expect(scoped.labels.value.value).toBe("本页");
    expect(app.runWithContext(useDictionaries)).toBe(store);
    const direct = consume(app, () => useDictionary(code));
    await direct.reload();
    expect(direct.error.value).toBeNull();
    expect(direct.label(0)).toBe("second");
  });

  it("停用/换身份取消同源旧等待，不伪装 empty 或闪错误，恢复只发一次", async () => {
    const enabled = ref(false);
    const scope = ref("甲");
    const requests: Array<{
      scope: string;
      signal: AbortSignal;
      request: ReturnType<typeof pending>;
    }> = [];
    const load = vi.fn(
      (_code: string, context: { scope: string; signal: AbortSignal }) => {
        const request = pending();
        requests.push({ ...context, request });
        return request.promise;
      },
    );
    const { app, store } = install({ load, scope, enabled });
    const state = consume(app, () => useDictionary("remote"));
    const details = consume(app, () =>
      useDictLabels({ state: 0 }, { state: "remote" }),
    );
    const source = store.getDictionary("remote")!;
    await state.reload();
    expect(load).not.toHaveBeenCalled();
    expect(source.getState()).toMatchObject({
      status: "idle",
      updatedAt: null,
    });
    enabled.value = true;
    await nextTick();
    expect(requests).toHaveLength(1);
    const old = state.reload();
    const cancelled = expect(old).rejects.toMatchObject({ name: "AbortError" });
    enabled.value = false;
    await cancelled;
    expect(requests[0]!.signal.aborted).toBe(true);
    expect(source.getState()).toMatchObject({
      status: "idle",
      updatedAt: null,
    });
    expect(state.error.value).toBeNull();
    expect(details.error.value).toBeNull();
    scope.value = "乙";
    enabled.value = true;
    const fresh = state.reload();
    await nextTick();
    expect(requests).toHaveLength(2);
    expect(requests[1]!.scope).toBe("乙");
    requests[0]!.request.resolve([{ value: 0, label: "旧身份" }]);
    requests[1]!.request.resolve([{ value: 0, label: "当前身份" }]);
    await fresh;
    expect(state.error.value).toBeNull();
    expect(state.label(0)).toBe("当前身份");
    expect(details.labels.value.state).toBe("当前身份");
  });

  it("静态字典不受暂停限制，专属远程 loader 同样受控，真实失败仍可见", async () => {
    const enabled = ref(false);
    const failure = new Error("接口不可用");
    const own = vi.fn(async () => {
      throw failure;
    });
    const { app, store } = install({
      dictionaries: {
        fixed: [{ value: false, label: "否" }],
        own: { load: own },
      },
      enabled,
    });
    const state = consume(app, () => useDictionary("own"));
    await state.reload();
    expect(own).not.toHaveBeenCalled();
    expect(store.getDictionary("fixed")!.label(false)).toBe("否");
    enabled.value = true;
    await expect(state.reload()).rejects.toBe(failure);
    expect(state.error.value).toBe(failure);
    expect(own).toHaveBeenCalledOnce();
  });

  it("重复安装拒绝覆盖，getter 安装失败会停止 effect 并允许其他插件重试", () => {
    const { app, store } = install();
    const read = vi.fn(() => "scope");
    expect(() => app.use(createDictionaryPlugin({ scope: read }))).toThrow(
      "重复",
    );
    expect(read).not.toHaveBeenCalled();
    expect(app.runWithContext(useDictionaries)).toBe(store);
    const failed = createSSRApp({ render: () => null });
    const input = ref(0);
    const error = new Error("scope getter failed");
    const getter = vi.fn(() => {
      void input.value;
      throw error;
    });
    expect(() => failed.use(createDictionaryPlugin({ scope: getter }))).toThrow(
      error,
    );
    input.value++;
    expect(getter).toHaveBeenCalledOnce();
    expect(() => failed.runWithContext(useDictionaries)).toThrow(
      "createDictionaryPlugin",
    );
    const plugin = createDictionaryPlugin();
    failed.use(plugin);
    installations.push({ app: failed, plugin });
    expect(failed.runWithContext(useDictionaries)).toBeDefined();
  });

  it("Vue3.4 公开 unmount 包装保留 this/异常，仍能释放 Store 和观察者", async () => {
    const app = createSSRApp({ render: () => null });
    (app as Partial<App>).onUnmount = undefined;
    const error = new Error("原卸载失败");
    const original = vi.fn(function (this: App) {
      expect(this).toBe(app);
      throw error;
    });
    app.unmount = original;
    const scope = ref("甲");
    const getter = vi.fn(() => scope.value);
    const plugin = createDictionaryPlugin({
      scope: getter,
      dictionaries: { own: { load: async () => [] } },
    });
    app.use(plugin);
    installations.push({ app, plugin });
    const store = app.runWithContext(useDictionaries);
    expect(() => app.unmount()).toThrow(error);
    scope.value = "乙";
    expect(getter).toHaveBeenCalledOnce();
    await expect(store.getDictionary("own")!.load()).rejects.toThrow("销毁");
    expect(original).toHaveBeenCalledOnce();
  });

  it("宿主 provide 写入后抛错会恢复上下文、停止观察者，不留下部分安装", () => {
    const app = createSSRApp({ render: () => null });
    const original = app.provide;
    const failure = new Error("host provide failed");
    let failed = false;
    const provide = vi.spyOn(app, "provide").mockImplementation(function (
      this: App,
      key,
      value,
    ) {
      original.call(this, key, value);
      if (key === DICTIONARY_PROVIDER_KEY && !failed) {
        failed = true;
        throw failure;
      }
      return this;
    });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const input = ref("甲");
    const getter = vi.fn(() => input.value);
    expect(() => app.use(createDictionaryPlugin({ scope: getter }))).toThrow(
      failure,
    );
    input.value = "乙";
    expect(getter).toHaveBeenCalledOnce();
    expect(() => app.runWithContext(useDictionaries)).toThrow(
      "createDictionaryPlugin",
    );
    expect(
      app.runWithContext(() => inject(DICTIONARY_PROVIDER_KEY, undefined)),
    ).toBeUndefined();
    provide.mockRestore();
    const plugin = createDictionaryPlugin();
    app.use(plugin);
    installations.push({ app, plugin });
  });

  it("运行中 scope getter 失败先暂停清空旧标签，再交给 app 错误处理；恢复后可继续", async () => {
    const broken = ref(false);
    const error = new Error("scope unavailable");
    const getter = () => {
      if (broken.value) throw error;
      return "公司甲";
    };
    const load = vi.fn(async () => [{ value: 0, label: "当前公司" }]);
    const { app, store } = install({ scope: getter, load });
    const errors = vi.fn();
    app.config.errorHandler = errors;
    const state = consume(app, () => useDictionary("remote"));
    await state.reload();
    expect(state.label(0)).toBe("当前公司");
    broken.value = true;
    expect(errors).toHaveBeenCalledWith(
      error,
      null,
      "dictionary plugin configuration",
    );
    expect(store.getDictionary("remote")!.getState()).toMatchObject({
      status: "idle",
      updatedAt: null,
    });
    expect(state.label(0)).toBe("0");
    await state.reload();
    expect(load).toHaveBeenCalledOnce();
    broken.value = false;
    await state.reload();
    expect(load).toHaveBeenCalledTimes(2);
    expect(state.label(0)).toBe("当前公司");
  });

  it("核心 enabled 在 loading 同步通知后关闭，也不调用接口或发布伪 empty", async () => {
    let enabled = true;
    const load = vi.fn(async () => []);
    const store = createDictionaryStore(load, { enabled: () => enabled });
    rawStores.push(store);
    const source = store.getDictionary("remote")!;
    const statuses: string[] = [];
    source.subscribe(() => {
      statuses.push(source.getState().status);
      if (source.getState().status === "loading") enabled = false;
    });
    expect(await source.load()).toEqual([]);
    expect(load).not.toHaveBeenCalled();
    expect(statuses).toEqual(["loading", "idle"]);
    expect(source.getState().updatedAt).toBeNull();
  });

  it("无 getState 的旧源可在加载中通知空快照，最终成功值不会被当成 reset 丢弃", async () => {
    const response = pending();
    let options: readonly DictionaryOption[] = [];
    let notify: (() => void) | undefined;
    const source = {
      getOptions: () => options,
      subscribe(listener: () => void) {
        notify = listener;
        return () => {
          notify = undefined;
        };
      },
      async load() {
        notify?.();
        options = await response.promise;
        return options;
      },
    };
    const owner = effectScope();
    consumers.push(owner);
    const state = owner.run(() => useDictionary(source, { immediate: false }))!;
    const result = state.reload();
    response.resolve([{ value: 0, label: "加载完成" }]);
    await result;
    expect(state.label(0)).toBe("加载完成");
    expect(state.status.value).toBe("ready");
    expect(state.error.value).toBeNull();
  });
});

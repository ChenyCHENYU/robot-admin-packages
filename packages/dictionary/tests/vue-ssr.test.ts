import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h, onServerPrefetch, ref } from "vue";
import { renderToString } from "vue/server-renderer";
import {
  createDictionaryPlugin,
  useDictionary,
  useDictLabels,
} from "../src/vue";

describe("字典源解析的 SSR 边界", () => {
  it("静态来源在原生下拉与详情中直接消费，不依赖 computed 缓存结果对象", async () => {
    const plugin = createDictionaryPlugin({
      dictionaries: {
        status: [{ value: 0, label: "待下达" }],
      },
    });
    const row = ref({ status: 0 });
    const app = createSSRApp({
      setup() {
        const select = useDictionary("status");
        const detail = useDictLabels(row, { status: "status" });
        return () =>
          h("section", [
            h(
              "select",
              select.options.value.map((option) =>
                h("option", { value: option.value }, option.label),
              ),
            ),
            h("span", detail.labels.value.status),
          ]);
      },
    });
    app.use(plugin);
    try {
      expect(await renderToString(app)).toBe(
        '<section><select><option value="0">待下达</option></select><span>待下达</span></section>',
      );
      expect(row.value.status).toBe(0);
    } finally {
      plugin.dispose(app);
    }
  });

  it("SSR 中名称与启用状态改变后只请求当前源，详情仍共享同一次加载", async () => {
    const load = vi.fn(async (code: string) => [
      { value: 0, label: `${code}：待下达` },
    ]);
    const plugin = createDictionaryPlugin({ load });
    const app = createSSRApp({
      setup() {
        const code = ref("unused");
        const enabled = ref(false);
        const select = useDictionary(code, { enabled });
        const detail = useDictLabels(
          ref({ status: 0 }),
          { status: "current" },
          { enabled },
        );
        onServerPrefetch(async () => {
          expect(load).not.toHaveBeenCalled();
          code.value = "current";
          enabled.value = true;
          await Promise.all([select.reload(), detail.reload()]);
        });
        return () =>
          h("section", [
            h("span", select.label(0)),
            h("span", detail.labels.value.status),
          ]);
      },
    });
    app.use(plugin);
    try {
      expect(await renderToString(app)).toBe(
        "<section><span>current：待下达</span><span>current：待下达</span></section>",
      );
      expect(load).toHaveBeenCalledOnce();
      expect(load.mock.calls[0]![0]).toBe("current");
    } finally {
      plugin.dispose(app);
    }
  });

  it("未配置的字典保持原码与局部错误，SSR 渲染本身不会失败", async () => {
    const plugin = createDictionaryPlugin();
    const app = createSSRApp({
      setup() {
        const select = useDictionary("missing");
        const detail = useDictLabels(ref({ status: "S1" }), {
          status: "missing",
        });
        expect(String(select.error.value)).toContain("未注册字典");
        expect(String(detail.error.value)).toContain("未注册字典");
        return () =>
          h("span", `${select.label("S1")}/${detail.labels.value.status}`);
      },
    });
    app.use(plugin);
    try {
      expect(await renderToString(app)).toBe("<span>S1/S1</span>");
    } finally {
      plugin.dispose(app);
    }
  });
});

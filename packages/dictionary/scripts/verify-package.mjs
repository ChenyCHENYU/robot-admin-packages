import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { createSSRApp, effectScope, h, onServerPrefetch, ref } from "vue";
import { renderToString } from "vue/server-renderer";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const expected = {
  index: ["createDictionaryStore", "createDictionaryProvider", "defineEnum"],
  vue: [
    "useDictionary",
    "useDictionaryLabels",
    "useDictionaryRefresh",
    "createDictionaryPlugin",
    "useDictionaries",
    "useDictLabels",
  ],
};

async function sources(path, seen = new Set()) {
  if (seen.has(path)) return "";
  seen.add(path);
  const source = await readFile(path, "utf8");
  const nested = [];
  for (const match of source.matchAll(
    /(?:from\s+|require\()(["'])(\.\.?\/[^"']+)\1/g,
  )) {
    const declaration = path.match(/\.d\.(ts|cts)$/);
    const target = declaration
      ? match[2].replace(/\.(?:js|cjs)$/, `.d.${declaration[1]}`)
      : match[2];
    nested.push(await sources(resolve(dirname(path), target), seen));
  }
  return [source, ...nested].join("\n");
}

for (const [entry, names] of Object.entries(expected)) {
  for (const extension of ["js", "cjs"]) {
    const file = resolve(root, `dist/${entry}.${extension}`);
    const api =
      extension === "js" ? await import(pathToFileURL(file)) : require(file);
    for (const name of names) {
      if (typeof api[name] !== "function")
        throw new Error(`${entry}.${extension} 缺少 ${name}`);
    }
    if (
      /\b(?:from\s+|require\()["'](?:@robot-admin\/naive-ui-components|@agile-team\/mach-table|naive-ui|pinia|axios)(?:\/[^"']*)?["']/.test(
        await sources(file),
      )
    )
      throw new Error(`${entry}.${extension} 引入了其他 UI/请求包`);
    if (entry === "index") {
      const source = await sources(file);
      if (
        /\b(?:from\s+|require\()["'](?:vue|naive-ui|axios|pinia)["']/.test(
          source,
        )
      ) {
        throw new Error(`${entry}.${extension} 引入了框架或请求库`);
      }
      if (gzipSync(source).byteLength > 8 * 1024)
        throw new Error("纯内核 gzip 超过 8 KiB 预算");
      const store = api.createDictionaryStore({
        enabled: api.defineEnum([{ value: false, label: "停用" }]),
      });
      const provider = api.createDictionaryProvider(
        { getDictionary: () => undefined },
        store,
      );
      if (provider.getDictionary("enabled") !== store.getDictionary("enabled"))
        throw new Error("SSR Provider 顺序兜底不可用");
      if (store.getDictionary("enabled").label(false) !== "停用")
        throw new Error("SSR 纯内核不可用");
      store.destroy();
      let calls = 0;
      const remote = api.createDictionaryStore(async (name) => {
        calls++;
        return [{ value: "0", label: name }];
      });
      const dynamic = remote.getDictionary("backend_code");
      if (calls !== 0) throw new Error("按需取源不应发请求");
      await Promise.all([dynamic.load(), dynamic.load()]);
      if (calls !== 1 || dynamic.label("0") !== "backend_code")
        throw new Error(`${entry}.${extension} 统一原码加载或请求合并不可用`);
      remote.destroy();
    } else {
      const { createDictionaryStore } = await import(
        pathToFileURL(resolve(root, "dist/index.js"))
      );
      const store = createDictionaryStore({
        enabled: [{ value: false, label: "停用" }],
      });
      const owner = effectScope();
      const model = ref({ enabled: false });
      const visible = ref(false);
      const details = owner.run(() =>
        api.useDictionaryLabels(
          store,
          model,
          [{ prop: "enabled", dictionary: "enabled" }],
          { enabled: visible },
        ),
      );
      if (details.labels.value.enabled !== "false")
        throw new Error(`${entry}.${extension} 未启用的详情不应解析字典`);
      visible.value = true;
      if (details.labels.value.enabled !== "停用")
        throw new Error(`${entry}.${extension} 详情字段绑定不可用`);
      model.value = { enabled: true };
      if (details.labels.value.enabled !== "true")
        throw new Error(`${entry}.${extension} 详情原码变化未同步`);
      owner.stop();
      store.destroy();
      const plugin = api.createDictionaryPlugin({
        load: async (code) => [{ value: "1", label: code }],
      });
      const app = createSSRApp({
        setup() {
          const state = api.useDictionary("user_status");
          const dictionaries = api.useDictionaries();
          onServerPrefetch(() => dictionaries.preload(["user_status"]));
          return () =>
            h(
              "select",
              state.options.value.map((option) =>
                h("option", { value: option.value }, option.label),
              ),
            );
        },
      });
      app.use(plugin);
      try {
        if (!(await renderToString(app)).includes('value="1">user_status'))
          throw new Error(`${entry}.${extension} 独立插件/原生 select 不可用`);
      } finally {
        plugin.dispose(app);
      }
    }
  }
  for (const extension of ["d.ts", "d.cts"]) {
    const file = resolve(root, `dist/${entry}.${extension}`);
    const source = await readFile(file, "utf8");
    if (/\b(?:from|import\s*\()\s*["']\.\.\//.test(source))
      throw new Error(`${entry}.${extension} 引用 dist 外部文件`);
    if (
      entry === "index" &&
      /\b(?:from\s+|import\s*\()["']vue["']/.test(await sources(file))
    ) {
      throw new Error(`${entry}.${extension} 纯内核声明引入了 Vue`);
    }
  }
}

for (const file of await readdir(resolve(root, "dist"))) {
  if (!/\.d\.(?:ts|cts)$/.test(file)) continue;
  const source = await readFile(resolve(root, "dist", file), "utf8");
  if (/\b(?:from\s+|import\s*\()["'](?:naive-ui|axios|pinia)["']/.test(source))
    throw new Error(`${file} 含 UI 或请求依赖`);
}
console.log(
  "Dictionary ESM/CJS、声明文件、纯内核依赖、SSR 与 8 KiB gzip 预算通过。",
);

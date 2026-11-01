import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { effectScope, ref } from "vue";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const expected = {
  index: ["createDictionaryStore", "createDictionaryProvider", "defineEnum"],
  vue: ["useDictionary", "useDictionaryLabels", "useDictionaryRefresh"],
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

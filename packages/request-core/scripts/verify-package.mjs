import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const entrypoints = [
  {
    name: "root",
    esm: "dist/index.js",
    cjs: "dist/index.cjs",
    exports: [
      "createRequestClient",
      "createRequestCore",
      "createTableCrud",
      "useTableCrud",
    ],
  },
  {
    name: "axios",
    esm: "dist/axios.js",
    cjs: "dist/axios.cjs",
    exports: ["createRequestClient", "createRequestCore", "getData"],
  },
  {
    name: "vue",
    esm: "dist/vue.js",
    cjs: "dist/vue.cjs",
    exports: [
      "createRequestPlugin",
      "createTableCrud",
      "useRequest",
      "useTableCrud",
    ],
  },
  {
    name: "naive",
    esm: "dist/naive.js",
    cjs: "dist/naive.cjs",
    exports: ["useNaiveTableCrud"],
  },
  {
    name: "crud",
    esm: "dist/crud.js",
    cjs: "dist/crud.cjs",
    exports: ["useTableCrud", "useNaiveTableCrud"],
  },
];

const loaded = {};
for (const entrypoint of entrypoints) {
  const esm = await import(pathToFileURL(resolve(packageRoot, entrypoint.esm)));
  const cjs = require(resolve(packageRoot, entrypoint.cjs));
  loaded[`${entrypoint.name}:esm`] = esm;
  loaded[`${entrypoint.name}:cjs`] = cjs;
  for (const [format, module] of [["ESM", esm], ["CJS", cjs]]) {
    for (const name of entrypoint.exports) {
      if (typeof module[name] !== "function" && typeof module[name] !== "object") {
        throw new TypeError(`${entrypoint.name} ${format} is missing ${name}`);
      }
    }
  }
}

const rootCore = loaded["root:esm"].createRequestCore();
if (loaded["axios:esm"].getGlobalAxiosInstance() !== rootCore.axiosInstance) {
  throw new TypeError("ESM root and /axios do not share the default instance");
}
const rootCoreCjs = loaded["root:cjs"].createRequestCore();
if (loaded["axios:cjs"].getGlobalAxiosInstance() !== rootCoreCjs.axiosInstance) {
  throw new TypeError("CJS root and /axios do not share the default instance");
}

async function dependencySources(relativeFile, visited = new Set()) {
  const absolute = resolve(packageRoot, relativeFile);
  if (visited.has(absolute)) return [];
  visited.add(absolute);
  const source = await readFile(absolute, "utf8");
  const children = [];
  const pattern = /(?:from\s+|require\()(["'])(\.\.?\/[^"']+)\1/g;
  for (const match of source.matchAll(pattern)) {
    const child = resolve(dirname(absolute), match[2]);
    children.push(...(await dependencySources(child, visited)));
  }
  return [source, ...children];
}

for (const file of ["dist/axios.js", "dist/axios.cjs"]) {
  const source = (await dependencySources(file)).join("\n");
  if (/\b(?:vue|naive-ui|element-plus)\b/.test(source)) {
    throw new TypeError(`${file} contains a UI framework dependency`);
  }
}

for (const file of ["dist/vue.js", "dist/vue.cjs"]) {
  const source = (await dependencySources(file)).join("\n");
  if (/\b(?:naive-ui|element-plus)\b/.test(source)) {
    throw new TypeError(`${file} contains a UI framework dependency`);
  }
}

for (const entry of ["index", "axios", "vue", "naive", "crud"]) {
  for (const extension of ["d.ts", "d.cts"]) {
    const source = await readFile(
      resolve(packageRoot, `dist/${entry}.${extension}`),
      "utf8",
    );
    if (/\b(?:from|import\s*\()\s*["']\.\.\//.test(source)) {
      throw new TypeError(`${entry}.${extension} references outside dist`);
    }
  }
}

const crudDeclaration = await readFile(
  resolve(packageRoot, "dist/crud.d.ts"),
  "utf8",
);
const compatibilityAlias = crudDeclaration.indexOf("useTableCrud");
if (
  compatibilityAlias < 0 ||
  !crudDeclaration
    .slice(Math.max(0, compatibilityAlias - 180), compatibilityAlias)
    .includes("@deprecated")
) {
  throw new TypeError("The /crud useTableCrud alias is missing @deprecated");
}

console.log("All request-core CJS/ESM entrypoints and dependency boundaries are valid");

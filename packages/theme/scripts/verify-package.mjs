import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const entrypoints = [
  {
    name: "root",
    exports: ["createThemeStore", "useThemeStore", "resolveThemeMode"],
  },
  {
    name: "core",
    exports: ["isThemeMode", "isDesignStyle", "resolveThemeMode"],
  },
  {
    name: "vue",
    exports: ["createThemeStore", "useThemeStore", "useViewTransition"],
  },
  {
    name: "naive",
    exports: ["mergeNaiveThemeOverrides", "useNaiveTheme"],
  },
];

const loaded = {};
for (const entrypoint of entrypoints) {
  const esm = await import(
    pathToFileURL(resolve(packageRoot, `dist/${entrypoint.name === "root" ? "index" : entrypoint.name}.js`))
  );
  const cjs = require(
    resolve(packageRoot, `dist/${entrypoint.name === "root" ? "index" : entrypoint.name}.cjs`),
  );
  loaded[`${entrypoint.name}:esm`] = esm;
  loaded[`${entrypoint.name}:cjs`] = cjs;
  for (const [format, module] of [["ESM", esm], ["CJS", cjs]]) {
    for (const name of entrypoint.exports) {
      if (typeof module[name] !== "function" && typeof module[name] !== "object") {
        throw new TypeError(`${entrypoint.name} ${format} is missing export ${name}`);
      }
    }
  }
}

if (
  loaded["root:esm"].useThemeStore !== loaded["vue:esm"].useThemeStore ||
  loaded["root:cjs"].useThemeStore !== loaded["vue:cjs"].useThemeStore
) {
  throw new TypeError("root and /vue do not preserve Store identity");
}

async function dependencySources(relativeFile, visited = new Set()) {
  const absolute = resolve(packageRoot, relativeFile);
  if (visited.has(absolute)) return [];
  visited.add(absolute);
  const source = await readFile(absolute, "utf8");
  const children = [];
  const pattern = /(?:from\s+|require\()(["'])(\.\.?\/[^"']+)\1/g;
  for (const match of source.matchAll(pattern)) {
    children.push(
      ...(await dependencySources(resolve(dirname(relativeFile), match[2]), visited)),
    );
  }
  return [source, ...children];
}

for (const file of ["dist/core.js", "dist/core.cjs"]) {
  const source = (await dependencySources(file)).join("\n");
  if (/\b(?:vue|pinia|naive-ui|element-plus)\b/.test(source)) {
    throw new TypeError(`${file} contains a framework dependency`);
  }
}

for (const file of ["dist/vue.js", "dist/vue.cjs"]) {
  const source = (await dependencySources(file)).join("\n");
  if (/\b(?:naive-ui|element-plus)\b/.test(source)) {
    throw new TypeError(`${file} contains a UI framework dependency`);
  }
}

for (const entrypoint of ["index", "core", "vue", "naive"]) {
  for (const extension of ["d.ts", "d.cts"]) {
    const source = await readFile(
      resolve(packageRoot, `dist/${entrypoint}.${extension}`),
      "utf8",
    );
    if (/\b(?:from|import\s*\()\s*["']\.\.\//.test(source)) {
      throw new TypeError(`${entrypoint}.${extension} references outside dist`);
    }
  }
}

for (const style of [
  "glass-morphism",
  "corporate-minimal",
  "dark-tech",
]) {
  const source = await readFile(
    new URL(`../dist/styles/${style}.css`, import.meta.url),
    "utf8",
  );
  if (!source.includes(`[data-design-style=${style}]`) &&
      !source.includes(`[data-design-style="${style}"]`)) {
    throw new TypeError(`${style}.css is missing its design-style scope`);
  }
  if (/\.n-menu(?:\b|-)/.test(source)) {
    throw new TypeError(`${style}.css must not control menu presentation`);
  }
  if (!source.includes("prefers-reduced-motion")) {
    throw new TypeError(`${style}.css is missing reduced-motion fallback`);
  }
}

const aggregateStyle = await readFile(
  new URL("../dist/styles/naive.css", import.meta.url),
  "utf8",
);
for (const style of ["glass-morphism", "corporate-minimal", "dark-tech"]) {
  if (!aggregateStyle.includes(`data-design-style=${style}`) &&
      !aggregateStyle.includes(`data-design-style="${style}"`)) {
    throw new TypeError(`naive.css is missing ${style}`);
  }
}

const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
for (const file of ["README.md", "CHANGELOG.md", "LICENSE", "SECURITY.md"]) {
  if (!packageJson.files.includes(file)) {
    throw new TypeError(`published files are missing ${file}`);
  }
}

console.log("Theme core, Vue, Naive, styles and published files are valid");

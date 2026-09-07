import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const require = createRequire(import.meta.url);

const entrypoints = [
  {
    name: "root",
    esm: "../dist/index.js",
    cjs: "../dist/index.cjs",
    exports: [
      "C_LayoutContainer",
      "SettingsDrawer",
      "createLayoutContext",
      "provideLayout",
      "setupLayout",
    ],
  },
  {
    name: "core",
    esm: "../dist/core/index.js",
    cjs: "../dist/core/index.cjs",
    exports: [
      "adjustColor",
      "sanitizeSettingsPatch",
      "sanitizeLayoutSettingsConfig",
    ],
  },
  {
    name: "vue",
    esm: "../dist/vue/index.js",
    cjs: "../dist/vue/index.cjs",
    exports: [
      "bindLayoutCssVariables",
      "createLayoutContext",
      "provideLayout",
      "useResponsiveMenu",
      "useSettingsController",
    ],
  },
  {
    name: "naive",
    esm: "../dist/naive/index.js",
    cjs: "../dist/naive/index.cjs",
    exports: [
      "C_LayoutContainer",
      "C_SideLayout",
      "provideLayout",
      "SettingsDrawer",
      "SideLayout",
      "useSettingsController",
    ],
  },
];

for (const entrypoint of entrypoints) {
  const cjs = require(entrypoint.cjs);
  const esm = await import(entrypoint.esm);

  for (const [format, exports] of [
    ["CJS", cjs],
    ["ESM", esm],
  ]) {
    for (const name of entrypoint.exports) {
      if (
        typeof exports[name] !== "function" &&
        typeof exports[name] !== "object"
      ) {
        throw new TypeError(
          `${entrypoint.name} ${format} is missing export ${name}`,
        );
      }
    }
  }
}

for (const file of ["index.js", "index.cjs", "index.d.ts", "index.d.cts"]) {
  const source = await readFile(
    new URL(`../dist/core/${file}`, import.meta.url),
    "utf8",
  );
  if (/\b(?:vue|vue-router|pinia|naive-ui)\b/.test(source)) {
    throw new TypeError(`core/${file} contains a framework dependency`);
  }
}

for (const entry of ["", "core/", "vue/", "naive/"]) {
  for (const file of ["index.d.ts", "index.d.cts"]) {
    const source = await readFile(
      new URL(`../dist/${entry}${file}`, import.meta.url),
      "utf8",
    );
    if (/\b(?:from|import\s*\()\s*["']\.\.\//.test(source)) {
      throw new TypeError(
        `${entry}${file} references a declaration outside its published entry`,
      );
    }
  }
}

for (const file of ["index.js", "index.cjs", "index.d.ts", "index.d.cts"]) {
  const source = await readFile(
    new URL(`../dist/vue/${file}`, import.meta.url),
    "utf8",
  );
  if (/\b(?:naive-ui|element-plus)\b/.test(source)) {
    throw new TypeError(`vue/${file} contains a UI framework dependency`);
  }
}

const componentAliases = [
  "C_SideLayout",
  "C_TopLayout",
  "C_MixLayout",
  "C_MixTopLayout",
  "C_ReverseHorizontalMixLayout",
  "C_CardLayout",
];
for (const entrypoint of [
  { name: "root", module: await import("../dist/index.js") },
  { name: "naive", module: await import("../dist/naive/index.js") },
]) {
  for (const alias of componentAliases) {
    const canonical = alias.slice(2);
    if (entrypoint.module[alias] !== entrypoint.module[canonical]) {
      throw new TypeError(
        `${entrypoint.name} ${alias} does not reference ${canonical}`,
      );
    }
    if (entrypoint.module[alias].name !== alias) {
      throw new TypeError(
        `${entrypoint.name} ${alias} does not expose its canonical Vue name`,
      );
    }
  }
}

const rootDeclaration = await readFile(
  new URL("../dist/index.d.ts", import.meta.url),
  "utf8",
);
for (const canonical of componentAliases) {
  const legacyName = canonical.slice(2);
  const declarationIndex = rootDeclaration.indexOf(`const ${legacyName}`);
  const leadingComment = rootDeclaration.slice(
    Math.max(0, declarationIndex - 160),
    declarationIndex,
  );
  if (declarationIndex < 0 || !leadingComment.includes("@deprecated")) {
    throw new TypeError(
      `${legacyName} is missing its compatibility @deprecated marker`,
    );
  }
}

const rootModule = await import("../dist/index.js");
const vueModule = await import("../dist/vue/index.js");
const naiveModule = await import("../dist/naive/index.js");
const rootModuleCjs = require("../dist/index.cjs");
const vueModuleCjs = require("../dist/vue/index.cjs");
const naiveModuleCjs = require("../dist/naive/index.cjs");
for (const runtimeExport of [
  "LAYOUT_CONTEXT_KEY",
  "LAYOUT_SETTINGS_KEY",
  "MENU_COLLAPSE_KEY",
  "useSettingsStore",
]) {
  if (
    rootModule[runtimeExport] !== vueModule[runtimeExport] ||
    rootModule[runtimeExport] !== naiveModule[runtimeExport] ||
    rootModuleCjs[runtimeExport] !== vueModuleCjs[runtimeExport] ||
    rootModuleCjs[runtimeExport] !== naiveModuleCjs[runtimeExport]
  ) {
    throw new TypeError(
      `${runtimeExport} does not preserve identity across runtime entrypoints`,
    );
  }
}

console.log("Root, core, Vue and Naive CJS / ESM entrypoints are valid");

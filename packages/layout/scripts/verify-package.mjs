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
  const source = await readFile(new URL(`../dist/core/${file}`, import.meta.url), "utf8");
  if (/\b(?:vue|vue-router|pinia|naive-ui)\b/.test(source)) {
    throw new TypeError(`core/${file} contains a framework dependency`);
  }
}

const rootDeclaration = await readFile(
  new URL("../dist/index.d.ts", import.meta.url),
  "utf8",
);
for (const alias of [
  "C_SideLayout",
  "C_TopLayout",
  "C_MixLayout",
  "C_MixTopLayout",
  "C_ReverseHorizontalMixLayout",
  "C_CardLayout",
]) {
  const declarationIndex = rootDeclaration.indexOf(`const ${alias}`);
  const leadingComment = rootDeclaration.slice(
    Math.max(0, declarationIndex - 120),
    declarationIndex,
  );
  if (declarationIndex < 0 || !leadingComment.includes("@deprecated")) {
    throw new TypeError(`${alias} is missing its public @deprecated marker`);
  }
}

console.log("Root and framework-independent core CJS / ESM entrypoints are valid");

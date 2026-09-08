import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const esm = await import("../dist/index.js");
const cjs = require("../dist/index.cjs");
const requiredExports = [
  "createThemeStore",
  "useThemeStore",
  "useViewTransition",
  "isViewTransitionSupported",
  "DESIGN_STYLE_CONFIGS",
];

for (const [format, module] of [
  ["ESM", esm],
  ["CJS", cjs],
]) {
  for (const name of requiredExports) {
    if (typeof module[name] !== "function" && typeof module[name] !== "object") {
      throw new TypeError(`${format} root is missing export ${name}`);
    }
  }
}

for (const declaration of ["index.d.ts", "index.d.cts"]) {
  const source = await readFile(
    new URL(`../dist/${declaration}`, import.meta.url),
    "utf8",
  );
  if (/\b(?:from|import\s*\()\s*["']\.\.\//.test(source)) {
    throw new TypeError(`${declaration} references outside dist`);
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

const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
for (const file of ["README.md", "CHANGELOG.md", "LICENSE", "SECURITY.md"]) {
  if (!packageJson.files.includes(file)) {
    throw new TypeError(`published files are missing ${file}`);
  }
}

console.log("Theme CJS/ESM entrypoint, styles and published files are valid");

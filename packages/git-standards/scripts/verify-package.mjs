import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const cjs = require("../dist/index.cjs");
const esm = await import("../dist/index.js");

for (const [format, exports] of [
  ["CJS", cjs],
  ["ESM", esm],
]) {
  for (const name of ["init", "doctor", "detectPackageManager"]) {
    if (typeof exports[name] !== "function") {
      throw new TypeError(`${format} 缺少公共导出 ${name}`);
    }
  }
}

console.log("CJS / ESM 公共入口检查通过");

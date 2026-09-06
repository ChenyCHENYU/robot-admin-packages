import { defineConfig } from "tsup";

export default defineConfig({
  // CLI 与库入口共用同一产物，避免把完整运行时重复打包三次。
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  shims: true,
  // chalk / ora / execa 均为 ESM-only；内联后 CJS 公共入口才能可靠加载。
  noExternal: ["chalk", "ora", "execa"],
  // cross-spawn 是 execa 的 CommonJS 子依赖，保持外置可避免污染 ESM 产物。
  external: ["cross-spawn"],
});

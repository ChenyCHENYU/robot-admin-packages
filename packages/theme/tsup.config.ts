import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    core: "src/entries/core.ts",
    vue: "src/entries/vue.ts",
    naive: "src/entries/naive.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  splitting: true,
  sourcemap: true,
  external: ["vue", "pinia", "naive-ui"],
  treeshake: true,
  target: "es2020",
  minify: false,
});

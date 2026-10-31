import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts", vue: "src/vue.ts" },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  splitting: true,
  sourcemap: true,
  external: ["vue"],
  treeshake: true,
  target: "es2020",
  minify: false,
});

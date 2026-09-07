import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    axios: "src/entries/axios.ts",
    crud: "src/entries/crud.ts",
    vue: "src/entries/vue.ts",
    naive: "src/entries/naive.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  splitting: true,
  sourcemap: true,
  external: ["vue", "naive-ui", "axios"],
  treeshake: true,
  minify: false,
});

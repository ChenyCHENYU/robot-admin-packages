import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    axios: "src/entries/axios.ts",
    crud: "src/entries/crud.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  external: ["vue", "naive-ui", "axios"],
  treeshake: true,
  minify: false,
});

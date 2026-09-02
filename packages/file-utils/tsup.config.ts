import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    csv: "src/csv/index.ts",
    file: "src/file/index.ts",
    download: "src/download/index.ts",
    image: "src/image/index.ts",
    excel: "src/excel/index.ts",
    zip: "src/zip/index.ts",
    chunk: "src/chunk/index.ts",
    config: "src/config.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  splitting: false,
  treeshake: true,
  sourcemap: true,
  minify: false,
  outDir: "dist",
  external: ["vue", "xlsx", "jszip"],
  target: "es2020",
});

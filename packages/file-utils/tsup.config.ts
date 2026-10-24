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
  dts: { resolve: ["xlsx"] },
  clean: true,
  splitting: true,
  treeshake: true,
  sourcemap: process.env.FILE_UTILS_DEBUG_SOURCEMAP === "true",
  minify: true,
  outDir: "dist",
  external: ["vue", "jszip"],
  noExternal: ["xlsx"],
  target: "es2020",
});

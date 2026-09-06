import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "core/index": "src/core/index.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  clean: false,
  splitting: false,
  sourcemap: true,
  target: "es2020",
});

import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    copy: "src/directives/copy.ts",
    debounce: "src/directives/debounce.ts",
    throttle: "src/directives/throttle.ts",
    drag: "src/directives/drag.ts",
    longpress: "src/directives/longpress.ts",
    permission: "src/directives/permission.ts",
    watermark: "src/directives/watermark.ts",
    lazy: "src/directives/lazy.ts",
    loading: "src/directives/loading.ts",
    tooltip: "src/directives/tooltip.ts",
    "click-outside": "src/directives/click-outside.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  outDir: "dist",
  external: ["vue"],
});

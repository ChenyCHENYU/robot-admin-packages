import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "vue/index": "src/vue/index.ts",
  },
  format: ["esm"],
  dts: { only: true },
  clean: false,
  external: ["vue", "vue-router", "pinia"],
});

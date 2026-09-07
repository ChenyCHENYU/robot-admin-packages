import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import dts from "vite-plugin-dts";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    vue(),
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
      entryRoot: resolve(__dirname, "src"),
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        "vue/index": resolve(__dirname, "src/vue/index.ts"),
        "naive/index": resolve(__dirname, "src/naive/index.ts"),
      },
      name: "RobotAdminLayout",
      formats: ["es", "cjs"],
      fileName: (format, entryName) =>
        `${entryName}.${format === "es" ? "js" : "cjs"}`,
    },
    // Vite 8: rollupOptions → rolldownOptions
    rolldownOptions: {
      external: ["vue", "vue-router", "pinia", "naive-ui"],
      output: {
        assetFileNames: (assetInfo) => {
          // CSS 文件统一命名为 index.css
          if (assetInfo.name?.endsWith(".css")) {
            return "index.css";
          }
          // SCSS 文件保持原名
          if (assetInfo.name?.endsWith(".scss")) {
            return assetInfo.name;
          }
          return assetInfo.name || "asset";
        },
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
  },
});

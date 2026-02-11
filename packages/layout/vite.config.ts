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
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "RobotAdminLayout",
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format === "es" ? "js" : "cjs"}`,
    },
    rollupOptions: {
      external: [
        "vue",
        "vue-router",
        "pinia",
        "naive-ui",
        "@robot-admin/theme",
      ],
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

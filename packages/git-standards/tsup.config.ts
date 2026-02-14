import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli/init.ts", "src/cli/doctor.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  shims: true,
});

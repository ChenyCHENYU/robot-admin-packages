import { copyFile } from "node:fs/promises";

// Each rolled declaration needs a .d.cts twin so the CommonJS export condition
// is interpreted with the correct module mode by TypeScript.
for (const entry of ["index", "vue/index", "core/index"]) {
  await copyFile(`dist/${entry}.d.ts`, `dist/${entry}.d.cts`);
}

// The Naive entry is the root API under an explicit adapter name. Reuse the
// rolled declaration instead of Vite's per-entry declaration with source refs.
await copyFile("dist/index.d.ts", "dist/naive/index.d.ts");
await copyFile("dist/index.d.ts", "dist/naive/index.d.cts");

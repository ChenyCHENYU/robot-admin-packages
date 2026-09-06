import { copyFile } from "node:fs/promises";

// Vite emits one rolled-up declaration file. The CommonJS condition needs a
// .d.cts twin so TypeScript interprets the declarations with the correct mode.
await copyFile("dist/index.d.ts", "dist/index.d.cts");

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { it } from "vitest";

const require = createRequire(import.meta.url);

it("type-checks positive and negative consumers of all public entrypoints", () => {
  execFileSync(
    process.execPath,
    [
      require.resolve("vue-tsc/bin/vue-tsc.js"),
      "--noEmit",
      "-p",
      fileURLToPath(new URL("./tsconfig.json", import.meta.url)),
    ],
    { encoding: "utf8" },
  );
}, 30_000);

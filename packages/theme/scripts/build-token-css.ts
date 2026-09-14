import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createThemeCss } from "../src/tokens";

const packageRoot = resolve(import.meta.dir, "..");
const stylesRoot = resolve(packageRoot, "dist/styles");
const tokenCss = createThemeCss();
const naivePath = resolve(stylesRoot, "naive.css");
const naiveCss = await readFile(naivePath, "utf8");

await Promise.all([
  writeFile(resolve(stylesRoot, "tokens.css"), tokenCss, "utf8"),
  writeFile(naivePath, `${tokenCss}\n${naiveCss}`, "utf8"),
]);

console.log("Generated tokens.css and composed it into naive.css");

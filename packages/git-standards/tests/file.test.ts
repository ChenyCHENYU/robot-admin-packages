import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { updatePackageJson, writeFileWithBackup } from "../src/utils/file";

const tempDirs: string[] = [];

async function createTempDir() {
  const dir = await mkdtemp(join(tmpdir(), "robot-standards-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("safe file updates", () => {
  it("backs up differing content before overwrite", async () => {
    const dir = await createTempDir();
    const target = join(dir, ".editorconfig");
    await writeFile(target, "old", "utf8");

    await writeFileWithBackup(target, "new");
    expect(await readFile(target, "utf8")).toBe("new");
    expect(await readFile(`${target}.bak`, "utf8")).toBe("old");
  });

  it("does not overwrite the original when backup creation fails", async () => {
    const dir = await createTempDir();
    const target = join(dir, ".prettierrc.cjs");
    await writeFile(target, "user config", "utf8");
    await mkdir(`${target}.bak`);

    await expect(writeFileWithBackup(target, "generated")).rejects.toThrow();
    expect(await readFile(target, "utf8")).toBe("user config");
  });

  it("deep-merges package scripts and nested config", async () => {
    const dir = await createTempDir();
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({
        scripts: { dev: "vite" },
        config: { commitizen: { path: "custom" }, keep: true },
      }),
    );

    await updatePackageJson(
      {
        scripts: { lint: "eslint ." },
        config: { commitizen: { retry: true } },
      },
      dir,
    );
    const result = JSON.parse(await readFile(join(dir, "package.json"), "utf8"));
    expect(result.scripts).toEqual({ dev: "vite", lint: "eslint ." });
    expect(result.config).toEqual({
      commitizen: { path: "custom", retry: true },
      keep: true,
    });
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  detectPackageManager,
  getExecCommand,
  splitExecCommand,
} from "../src/utils/package-manager";

const tempDirs: string[] = [];

async function createTempDir() {
  const dir = await mkdtemp(join(tmpdir(), "robot-standards-pm-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("package manager detection", () => {
  it("detects a workspace package manager from a nested project", async () => {
    const root = await createTempDir();
    const nested = join(root, "packages", "app");
    await mkdir(join(root, ".git"));
    await mkdir(nested, { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({ packageManager: "bun@1.3.8" }),
    );
    await writeFile(join(nested, "package.json"), "{}");

    await expect(detectPackageManager(nested)).resolves.toBe("bun");
  });

  it("prefers the nearest lock file", async () => {
    const root = await createTempDir();
    const nested = join(root, "app");
    await mkdir(join(root, ".git"));
    await mkdir(nested);
    await writeFile(join(root, "bun.lock"), "");
    await writeFile(join(nested, "pnpm-lock.yaml"), "");

    await expect(detectPackageManager(nested)).resolves.toBe("pnpm");
  });

  it("uses only local binaries for npm and bun", () => {
    expect(getExecCommand("npm")).toBe("npx --no-install");
    expect(getExecCommand("bun")).toBe("bunx --no-install");
    expect(splitExecCommand("bun")).toEqual(["bunx", "--no-install"]);
  });
});

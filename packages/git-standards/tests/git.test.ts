import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findGitRoot, isGitRepository } from "../src/utils/git";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("Git repository detection", () => {
  it("finds an ancestor .git directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "robot-standards-git-"));
    tempDirs.push(root);
    const nested = join(root, "packages", "app");
    await mkdir(join(root, ".git"));
    await mkdir(nested, { recursive: true });

    expect(isGitRepository(nested)).toBe(true);
    expect(findGitRoot(nested)).toBe(root);
  });

  it("supports a worktree-style .git file", async () => {
    const root = await mkdtemp(join(tmpdir(), "robot-standards-git-"));
    tempDirs.push(root);
    await writeFile(join(root, ".git"), "gitdir: ../repo/.git/worktrees/app\n");

    expect(isGitRepository(root)).toBe(true);
  });
});

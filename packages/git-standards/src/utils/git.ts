/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-13
 * @Description: Git 工具函数
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { execa } from "execa";

/**
 * 检查是否在 Git 仓库中
 */
export function isGitRepository(cwd: string = process.cwd()): boolean {
  return findGitRoot(cwd) !== null;
}

/** 查找当前目录所属的 Git 根目录（兼容普通仓库、worktree 和 submodule）。 */
export function findGitRoot(cwd: string = process.cwd()): string | null {
  let current = resolve(cwd);

  // `.git` 在普通仓库中是目录，在 worktree / submodule 中可能是文件。
  // 向上查找可避免在 monorepo 子包中误建嵌套仓库。
  while (true) {
    if (existsSync(resolve(current, ".git"))) return current;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

/**
 * 初始化 Git 仓库
 */
export async function initGitRepository(
  cwd: string = process.cwd(),
): Promise<void> {
  if (!isGitRepository(cwd)) {
    await execa("git", ["init"], { cwd });
  }
}

/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-13
 * @Description: Git 工具函数
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { execa } from "execa";

/**
 * 检查是否在 Git 仓库中
 */
export function isGitRepository(cwd: string = process.cwd()): boolean {
  return existsSync(resolve(cwd, ".git"));
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

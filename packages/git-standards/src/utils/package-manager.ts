/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-13
 * @Description: 包管理器检测工具
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";

export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

/**
 * 检测项目使用的包管理器
 */
export async function detectPackageManager(
  cwd: string = process.cwd(),
): Promise<PackageManager> {
  // 检测 lockfile
  if (
    existsSync(resolve(cwd, "bun.lockb")) ||
    existsSync(resolve(cwd, "bun.lock"))
  ) {
    return "bun";
  }
  if (existsSync(resolve(cwd, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (existsSync(resolve(cwd, "yarn.lock"))) {
    return "yarn";
  }
  if (existsSync(resolve(cwd, "package-lock.json"))) {
    return "npm";
  }

  // 默认返回 npm
  return "npm";
}

/**
 * 获取安装命令
 */
export function getInstallCommand(pm: PackageManager): string {
  const commands = {
    npm: "npm install --save-dev",
    yarn: "yarn add --dev",
    pnpm: "pnpm add -D",
    bun: "bun add --dev",
  };
  return commands[pm];
}

/**
 * 获取执行（运行本地已安装包）命令
 *
 * 注意：返回的是“执行本地依赖二进制”的命令前缀：
 * - npm: `npx --no-install`（仅使用本地已安装包，避免联网下载）
 * - pnpm: `pnpm exec`（执行本地包；`pnpm dlx` 会下载到临时环境，不适合此场景）
 * - yarn: `yarn`
 * - bun: `bunx`
 *
 * 这些前缀会拼进 husky hook 脚本，也会被拆分后传给 execa。
 */
export function getExecCommand(pm: PackageManager): string {
  const commands = {
    npm: "npx --no-install",
    yarn: "yarn",
    pnpm: "pnpm exec",
    bun: "bunx",
  };
  return commands[pm];
}

/**
 * 将“执行本地包”命令拆分为 [bin, ...args]，便于传给 execa（其首个参数必须是单个可执行名）。
 */
export function splitExecCommand(pm: PackageManager): string[] {
  return getExecCommand(pm).split(" ");
}

/**
 * 获取包管理器的显示名称
 */
export function getPackageManagerName(pm: PackageManager): string {
  const names = {
    npm: "npm",
    yarn: "Yarn",
    pnpm: "pnpm",
    bun: "Bun",
  };
  return names[pm];
}

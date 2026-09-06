/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-13
 * @Description: 包管理器检测工具
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

/**
 * 检测项目使用的包管理器
 */
export async function detectPackageManager(
  cwd: string = process.cwd(),
): Promise<PackageManager> {
  let current = resolve(cwd);

  // 支持 workspace 子目录：优先使用最近的 packageManager 声明或锁文件，
  // 找到 Git 根后停止，避免误读用户目录中的无关配置。
  while (true) {
    const packageJsonPath = resolve(current, "package.json");
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
        const declared = String(packageJson.packageManager || "").split("@")[0];
        if (["npm", "yarn", "pnpm", "bun"].includes(declared)) {
          return declared as PackageManager;
        }
      } catch {
        // package.json 的完整校验由 init 负责；检测阶段继续查找锁文件。
      }
    }

    if (
      existsSync(resolve(current, "bun.lockb")) ||
      existsSync(resolve(current, "bun.lock"))
    ) {
      return "bun";
    }
    if (existsSync(resolve(current, "pnpm-lock.yaml"))) return "pnpm";
    if (existsSync(resolve(current, "yarn.lock"))) return "yarn";
    if (existsSync(resolve(current, "package-lock.json"))) return "npm";

    if (existsSync(resolve(current, ".git"))) break;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
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
 * - bun: `bunx --no-install`（仅执行本地包）
 *
 * 这些前缀会拼进 husky hook 脚本，也会被拆分后传给 execa。
 */
export function getExecCommand(pm: PackageManager): string {
  const commands = {
    npm: "npx --no-install",
    yarn: "yarn",
    pnpm: "pnpm exec",
    bun: "bunx --no-install",
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

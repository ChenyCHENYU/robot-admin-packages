/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-13
 * @Description: 文件操作工具
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

import { existsSync, chmodSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";

/**
 * 检查文件是否存在
 */
export function fileExists(filePath: string): boolean {
  return existsSync(filePath);
}

/**
 * 读取文件内容
 */
export async function readFileContent(filePath: string): Promise<string> {
  return await readFile(filePath, "utf-8");
}

/**
 * 写入文件内容
 */
export async function writeFileContent(
  filePath: string,
  content: string,
): Promise<void> {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(filePath, content, "utf-8");
}

/**
 * 写入可执行文件（自动设置 chmod 755 执行权限）
 * 用于 Husky Hook 等需要执行权限的文件
 */
export async function writeExecutableFile(
  filePath: string,
  content: string,
): Promise<void> {
  await writeFileContent(filePath, content);
  try {
    chmodSync(filePath, 0o755);
  } catch {
    // Windows 环境下 chmod 可能不生效，忽略错误
  }
}

/**
 * 读取并解析 JSON 文件
 */
export async function readJsonFile<T = any>(filePath: string): Promise<T> {
  const content = await readFileContent(filePath);
  return JSON.parse(content) as T;
}

/**
 * 写入 JSON 文件
 */
export async function writeJsonFile(
  filePath: string,
  data: any,
  pretty: boolean = true,
): Promise<void> {
  const content = pretty
    ? JSON.stringify(data, null, 2) + "\n"
    : JSON.stringify(data);
  await writeFileContent(filePath, content);
}

/**
 * 更新 package.json
 */
export async function updatePackageJson(
  updates: Record<string, any>,
  cwd: string = process.cwd(),
): Promise<void> {
  const packageJsonPath = resolve(cwd, "package.json");
  const packageJson = await readJsonFile(packageJsonPath);
  const updated = { ...packageJson, ...updates };
  await writeJsonFile(packageJsonPath, updated);
}

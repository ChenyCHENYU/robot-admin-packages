/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-13
 * @Description: 文件操作工具
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

import { existsSync, chmodSync } from "node:fs";
import { copyFile, readFile, writeFile, mkdir } from "node:fs/promises";
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
 * 写入文件内容（写入前若目标已存在则备份为 `.bak`，避免重复初始化覆盖用户自定义内容）
 */
export async function writeFileWithBackup(
  filePath: string,
  content: string,
): Promise<void> {
  if (existsSync(filePath)) {
    const existing = await readFileContent(filePath);
    // 内容一致时不触碰文件，保证重复初始化真正幂等
    if (existing === content) return;

    // 使用文件复制保留原始字节；备份失败必须阻止后续覆盖
    await copyFile(filePath, `${filePath}.bak`);
  }
  await writeFileContent(filePath, content);
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
 * 安全深合并两个对象（仅对普通对象递归合并，其余直接覆盖）。
 * 用以避免 `config` / `lint-staged` 等嵌套字段在更新 package.json 时被整体替换。
 */
const UNSAFE_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function isPlainObject(value: unknown): value is Record<string, any> {
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function deepMerge(target: any, source: any): any {
  if (Array.isArray(target) || Array.isArray(source)) {
    return source !== undefined ? source : target;
  }
  if (isPlainObject(target) && isPlainObject(source)) {
    const result: Record<string, any> = { ...target };
    for (const key of Object.keys(source)) {
      if (UNSAFE_OBJECT_KEYS.has(key)) {
        throw new Error(`package.json 包含不安全字段: ${key}`);
      }
      result[key] = deepMerge(target[key], source[key]);
    }
    return result;
  }
  return source !== undefined ? source : target;
}

/**
 * 更新 package.json
 *
 * 对 scripts / config / lint-staged 等嵌套对象做深合并，
 * 避免重复初始化时覆盖用户已有的相关字段。
 */
export async function updatePackageJson(
  updates: Record<string, any>,
  cwd: string = process.cwd(),
): Promise<void> {
  const packageJsonPath = resolve(cwd, "package.json");
  const packageJson = await readJsonFile(packageJsonPath);

  // 顶层普通字段直接覆盖；对已知嵌套字段做深合并
  const MERGE_KEYS = ["scripts", "config", "lint-staged"];
  const updated: Record<string, any> = { ...packageJson };
  for (const [key, value] of Object.entries(updates)) {
    if (
      MERGE_KEYS.includes(key) &&
      isPlainObject(packageJson[key]) &&
      isPlainObject(value)
    ) {
      updated[key] = deepMerge(packageJson[key], value);
    } else {
      updated[key] = value;
    }
  }

  await writeJsonFile(packageJsonPath, updated);
}

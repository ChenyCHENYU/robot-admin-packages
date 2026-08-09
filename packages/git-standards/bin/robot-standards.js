#!/usr/bin/env node

/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-13
 * @Description: Robot Standards CLI 入口
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

import { Command } from "commander";
import chalk from "chalk";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { init } from "../dist/cli/init.js";
import { doctor } from "../dist/cli/doctor.js";

// 运行时读取版本，避免与 package.json 漂移
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, "..", "package.json"), "utf-8"),
);

const program = new Command();

program
  .name("robot-standards")
  .description("零配置 Git 工程化标准工具包")
  .version(pkg.version);

program
  .command("init")
  .description("初始化 Git 标准化配置")
  .option("--cwd <path>", "目标目录", process.cwd())
  .option("--ci", "CI 模式（非交互式）", false)
  .option("--preset <preset>", "预设方案 (minimal|standard|full)", "standard")
  .option("--framework <framework>", "项目框架 (vue|react|vanilla)", "vue")
  .option("--typescript", "使用 TypeScript")
  .option("--no-typescript", "不使用 TypeScript")
  .option("--oxlint", "启用 Oxlint")
  .option("--no-oxlint", "不启用 Oxlint")
  .option("--prettier", "启用 Prettier")
  .option("--no-prettier", "不启用 Prettier")
  .option("--jsdoc", "启用 JSDoc（生成相关配置）", false)
  .action(async (options) => {
    try {
      await init(options);
    } catch (error) {
      // execa 错误带 stderr/shortMessage，优先展示便于排障
      const detail = error?.stderr || error?.shortMessage || error?.message || error;
      console.error(
        `\n  ${chalk.red("x")} ${chalk.red.bold("初始化失败:")}`,
        detail,
      );
      process.exit(1);
    }
  });

program
  .command("doctor")
  .description("诊断 Git 工程化配置")
  .option("--cwd <path>", "目标目录", process.cwd())
  .action(async (options) => {
    try {
      const passed = await doctor(options);
      process.exit(passed ? 0 : 1);
    } catch (error) {
      const detail = error?.stderr || error?.shortMessage || error?.message || error;
      console.error(
        `\n  ${chalk.red("x")} ${chalk.red.bold("诊断失败:")}`,
        detail,
      );
      process.exit(1);
    }
  });

program.parse();

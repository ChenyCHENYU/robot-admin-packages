/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-13
 * @Description: Doctor 命令 - 智能诊断 Git 标准化配置
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

import { resolve } from "node:path";
import chalk from "chalk";
import { fileExists, readJsonFile } from "../utils/file";
import { isGitRepository } from "../utils/git";

// ─── 品牌 & 符号 ──────────────────────────────────────────────────
const BRAND = "#7C3AED";
const S = {
  LOGO: chalk.hex(BRAND).bold("[RS]"),
  OK: chalk.green("✔"),
  FAIL: chalk.red("✖"),
  WARN: chalk.yellow("▲"),
  SKIP: chalk.gray("○"),
  LINE: chalk.gray("─".repeat(48)),
};

export interface DoctorOptions {
  cwd?: string;
}

interface CheckResult {
  name: string;
  status: "pass" | "fail" | "skip";
  message?: string;
}

/**
 * Doctor 命令主函数
 * 根据已安装的功能智能检测，未安装的功能只做提示不标记为失败
 */
export async function doctor(options: DoctorOptions = {}) {
  const cwd = options.cwd || process.cwd();

  // ── Banner ──
  console.log();
  console.log(S.LINE);
  console.log(
    `  ${S.LOGO}  ${chalk.bold("Robot Standards")}  ${chalk.gray("Doctor")}`,
  );
  console.log(S.LINE);
  console.log();

  const checks: CheckResult[] = [];

  // ── 1. 基础环境 ──
  const isGit = isGitRepository(cwd);
  checks.push({
    name: "Git 仓库",
    status: isGit ? "pass" : "fail",
    message: isGit ? undefined : "未初始化 Git 仓库，运行 git init",
  });

  // ── 2. 读取 package.json 探测已安装功能 ──
  let packageJson: any = {};
  const packageJsonPath = resolve(cwd, "package.json");
  const hasPackageJson = fileExists(packageJsonPath);

  if (hasPackageJson) {
    try {
      packageJson = await readJsonFile(packageJsonPath);
    } catch {
      // ignore
    }
  } else {
    checks.push({
      name: "package.json",
      status: "fail",
      message: "缺少 package.json",
    });
  }

  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  // 检测已安装的功能模块
  const hasCommitizen = !!allDeps["commitizen"];
  const hasCommitlint = !!allDeps["@commitlint/cli"];
  const hasHusky = !!allDeps["husky"];
  const hasEslint = !!allDeps["eslint"];
  const hasLintStaged = !!allDeps["lint-staged"];
  const hasPrettier = !!allDeps["prettier"];

  // ── 3. 核心功能检查（始终检查） ──
  console.log(`  ${chalk.bold("核心功能")}`);
  console.log();

  // Husky
  if (hasHusky) {
    const huskyDir = fileExists(resolve(cwd, ".husky"));
    checks.push({
      name: "Husky 目录",
      status: huskyDir ? "pass" : "fail",
      message: huskyDir ? undefined : "缺少 .husky 目录",
    });

    const commitMsg = fileExists(resolve(cwd, ".husky/commit-msg"));
    checks.push({
      name: "commit-msg hook",
      status: commitMsg ? "pass" : "fail",
      message: commitMsg ? undefined : "缺少 commit-msg hook",
    });
  } else {
    checks.push({
      name: "Husky",
      status: "fail",
      message: "未安装 husky",
    });
  }

  // Commitlint
  if (hasCommitlint) {
    const hasConfig =
      fileExists(resolve(cwd, "commitlint.config.cjs")) ||
      fileExists(resolve(cwd, "commitlint.config.js")) ||
      fileExists(resolve(cwd, "commitlint.config.ts"));
    checks.push({
      name: "Commitlint 配置",
      status: hasConfig ? "pass" : "fail",
      message: hasConfig ? undefined : "缺少 commitlint.config.*",
    });
  } else {
    checks.push({
      name: "Commitlint",
      status: "fail",
      message: "未安装 @commitlint/cli",
    });
  }

  // Commitizen
  if (hasCommitizen) {
    const hasCzConfig =
      fileExists(resolve(cwd, ".cz-config.cjs")) ||
      fileExists(resolve(cwd, ".cz-config.js"));
    checks.push({
      name: "Commitizen 配置",
      status: hasCzConfig ? "pass" : "fail",
      message: hasCzConfig ? undefined : "缺少 .cz-config.*",
    });

    const hasCommitizenPath = !!packageJson.config?.commitizen;
    checks.push({
      name: "commitizen path 配置",
      status: hasCommitizenPath ? "pass" : "fail",
      message: hasCommitizenPath
        ? undefined
        : "package.json 中缺少 config.commitizen",
    });
  } else {
    checks.push({
      name: "Commitizen",
      status: "fail",
      message: "未安装 commitizen",
    });
  }

  // cz 脚本
  const hasCzScript = !!packageJson.scripts?.cz;
  checks.push({
    name: "cz 脚本",
    status: hasCzScript ? "pass" : "fail",
    message: hasCzScript ? undefined : "缺少 cz 脚本 (bun run cz)",
  });

  // ── 输出核心检查结果 ──
  const coreChecks = checks.slice();
  for (const check of coreChecks) {
    printCheck(check);
  }

  // ── 4. 附加功能检查（仅检测已安装的） ──
  const extraChecks: CheckResult[] = [];

  if (hasEslint) {
    console.log();
    console.log(`  ${chalk.bold("代码检查")}`);
    console.log();

    const hasEslintConfig =
      fileExists(resolve(cwd, "eslint.config.ts")) ||
      fileExists(resolve(cwd, "eslint.config.js")) ||
      fileExists(resolve(cwd, "eslint.config.mjs"));
    const eslintCheck: CheckResult = {
      name: "ESLint 配置",
      status: hasEslintConfig ? "pass" : "fail",
      message: hasEslintConfig ? undefined : "缺少 eslint.config.*",
    };
    extraChecks.push(eslintCheck);
    printCheck(eslintCheck);

    if (hasHusky) {
      const preCommit = fileExists(resolve(cwd, ".husky/pre-commit"));
      const preCommitCheck: CheckResult = {
        name: "pre-commit hook",
        status: preCommit ? "pass" : "fail",
        message: preCommit ? undefined : "缺少 pre-commit hook",
      };
      extraChecks.push(preCommitCheck);
      printCheck(preCommitCheck);
    }
  }

  if (hasLintStaged) {
    const lintStagedConfig = !!packageJson["lint-staged"];
    const lintStagedCheck: CheckResult = {
      name: "lint-staged 配置",
      status: lintStagedConfig ? "pass" : "fail",
      message: lintStagedConfig
        ? undefined
        : "package.json 中缺少 lint-staged 配置",
    };
    extraChecks.push(lintStagedCheck);
    printCheck(lintStagedCheck);
  }

  if (hasPrettier) {
    console.log();
    console.log(`  ${chalk.bold("代码格式化")}`);
    console.log();

    const hasPrettierConfig =
      fileExists(resolve(cwd, ".prettierrc.cjs")) ||
      fileExists(resolve(cwd, ".prettierrc.js")) ||
      fileExists(resolve(cwd, ".prettierrc.json")) ||
      fileExists(resolve(cwd, ".prettierrc"));
    const prettierCheck: CheckResult = {
      name: "Prettier 配置",
      status: hasPrettierConfig ? "pass" : "fail",
      message: hasPrettierConfig ? undefined : "缺少 .prettierrc.*",
    };
    extraChecks.push(prettierCheck);
    printCheck(prettierCheck);
  }

  // EditorConfig（不依赖 package.json，直接检测文件）
  const hasEditorConfig = fileExists(resolve(cwd, ".editorconfig"));
  if (hasEditorConfig) {
    // 只在存在时标记 pass，不存在不报错（属于可选功能）
  }

  // ── 5. 未安装功能提示 ──
  const notInstalled: string[] = [];
  if (!hasEslint) notInstalled.push("ESLint");
  if (!hasLintStaged) notInstalled.push("lint-staged");
  if (!hasPrettier) notInstalled.push("Prettier");
  if (!hasEditorConfig) notInstalled.push("EditorConfig");

  if (notInstalled.length > 0) {
    console.log();
    console.log(`  ${chalk.bold("未启用的功能")}`);
    console.log();
    for (const name of notInstalled) {
      console.log(`  ${S.SKIP} ${chalk.gray(name)}`);
    }
  }

  // ── 6. 汇总 ──
  const allChecks = [...coreChecks, ...extraChecks];
  const passedCount = allChecks.filter((c) => c.status === "pass").length;
  const failedCount = allChecks.filter((c) => c.status === "fail").length;

  console.log();
  console.log(S.LINE);
  console.log(
    `  ${chalk.bold("总计:")} ${chalk.green(`${passedCount} 通过`)}  ${
      failedCount > 0 ? chalk.red(`${failedCount} 失败`) : chalk.gray("0 失败")
    }`,
  );

  if (failedCount > 0) {
    console.log();
    console.log(
      `  ${S.WARN} ${chalk.yellow("运行")} ${chalk.cyan(
        "robot-standards init",
      )} ${chalk.yellow("修复问题")}`,
    );
  } else {
    console.log();
    console.log(`  ${S.OK} ${chalk.green("所有检查通过!")}`);
  }

  console.log(S.LINE);
  console.log();

  return failedCount === 0;
}

function printCheck(check: CheckResult) {
  const icon =
    check.status === "pass" ? S.OK : check.status === "fail" ? S.FAIL : S.SKIP;
  console.log(`  ${icon} ${check.name}`);
  if (check.message && check.status === "fail") {
    console.log(`    ${chalk.gray(check.message)}`);
  }
}

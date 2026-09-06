/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-13
 * @Description: Init 命令 - 模块化初始化 Git 标准化配置（预设 + 自定义）
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

import { relative, resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import chalk from "chalk";
import ora from "ora";
import { execa } from "execa";
import {
  detectPackageManager,
  getInstallCommand,
  getExecCommand,
  getPackageManagerName,
  splitExecCommand,
  type PackageManager,
} from "../utils/package-manager";
import { findGitRoot, initGitRepository } from "../utils/git";
import {
  writeFileWithBackup,
  writeExecutableFileWithBackup,
  updatePackageJson,
  readFileContent,
  readJsonFile,
} from "../utils/file";
import { generateLintStagedConfig } from "../configs/lint-staged";

// ─── 品牌 & 符号系统 ──────────────────────────────────────────────
const BRAND = "#7C3AED";

// 运行时读取版本，避免与 package.json 漂移（兼容 ESM/CJS，路径深度自适应）
function readPkgVersion(): string {
  try {
    // dist/cli/init.js → package.json 在 dist 的上两级
    const candidates: string[] = [
      resolve(__dirname, "..", "..", "package.json"),
      resolve(process.cwd(), "package.json"),
    ];
    for (const p of candidates) {
      if (existsSync(p)) {
        return JSON.parse(readFileSync(p, "utf-8")).version ?? "0.0.0";
      }
    }
  } catch {
    // 忽略，返回占位
  }
  return "0.0.0";
}
const VERSION = readPkgVersion();

const S = {
  LOGO: chalk.hex(BRAND).bold("[RS]"),
  OK: chalk.green("✔"),
  FAIL: chalk.red("✖"),
  WARN: chalk.yellow("▲"),
  STEP: chalk.hex(BRAND)("◆"),
  ARROW: chalk.cyan("▸"),
  DOT: chalk.gray("●"),
  INFO: chalk.blue("ℹ"),
  LINE: chalk.gray("─".repeat(48)),
};

// ─── 类型定义 ──────────────────────────────────────────────────────
type PresetId = "minimal" | "standard" | "full" | "custom";

/**
 * 功能开关集合
 * - commitizen / commitlint / husky 为核心功能，始终包含
 * - 以下为可选附加功能
 */
export interface FeatureSet {
  eslint: boolean;
  lintStaged: boolean;
  prettier: boolean;
  oxlint: boolean;
  editorconfig: boolean;
}

export interface ESLintOptions {
  framework: "vue" | "react" | "vanilla";
  typescript: boolean;
  jsdoc: boolean;
}

export interface InitOptions {
  cwd?: string;
  ci?: boolean;
  preset?: PresetId;
  framework?: "vue" | "react" | "vanilla";
  typescript?: boolean;
  oxlint?: boolean;
  jsdoc?: boolean;
  prettier?: boolean;
}

// ─── 预设模式定义 ──────────────────────────────────────────────────
const PRESETS: Record<
  Exclude<PresetId, "custom">,
  { name: string; desc: string; features: FeatureSet }
> = {
  minimal: {
    name: "极简模式",
    desc: "仅 Git 提交规范 (Commitizen + Commitlint)",
    features: {
      eslint: false,
      lintStaged: false,
      prettier: false,
      oxlint: false,
      editorconfig: false,
    },
  },
  standard: {
    name: "标准模式",
    desc: "提交规范 + 代码质量检查 (+ ESLint + lint-staged)",
    features: {
      eslint: true,
      lintStaged: true,
      prettier: false,
      oxlint: false,
      editorconfig: true,
    },
  },
  full: {
    name: "完整模式",
    desc: "全部工具链 (+ Prettier + Oxlint + EditorConfig)",
    features: {
      eslint: true,
      lintStaged: true,
      prettier: true,
      oxlint: true,
      editorconfig: true,
    },
  },
};

// ─── 主函数 ──────────────────────────────────────────────────────
export async function init(options: InitOptions = {}) {
  const cwd = resolve(options.cwd || process.cwd());

  if (!existsSync(cwd)) {
    throw new Error(`目标目录不存在: ${cwd}`);
  }
  try {
    await readJsonFile(resolve(cwd, "package.json"));
  } catch (error) {
    throw new Error(`目标目录缺少有效的 package.json: ${cwd}`, {
      cause: error,
    });
  }

  // Git hooks 属于整个仓库。禁止在已有仓库的子目录中生成另一套配置，
  // 避免 package-local .husky 与仓库级 core.hooksPath 指向不一致。
  const gitRoot = findGitRoot(cwd);
  if (gitRoot && relative(gitRoot, cwd) !== "") {
    throw new Error(
      `目标目录不是 Git 仓库根目录: ${cwd}。请改用 --cwd ${gitRoot}`,
    );
  }

  const presetId = options.preset || "standard";
  if (presetId !== "custom" && !(presetId in PRESETS)) {
    throw new Error(`不支持的预设: ${String(presetId)}`);
  }
  const framework = options.framework || "vue";
  if (!["vue", "react", "vanilla"].includes(framework)) {
    throw new Error(`不支持的框架: ${String(framework)}`);
  }

  // ── Banner ──
  printBanner();

  // 1. 环境检测
  console.log(`  ${S.STEP} ${chalk.bold("环境检测")}`);
  console.log();

  const hasGitRepository = gitRoot !== null;
  if (hasGitRepository) {
    console.log(`  ${S.OK} Git 仓库已就绪`);
  } else {
    console.log(`  ${S.WARN} ${chalk.yellow("将初始化 Git 仓库")}`);
  }

  const pm = await detectPackageManager(cwd);
  const pmName = getPackageManagerName(pm);
  console.log(`  ${S.OK} 包管理器: ${chalk.cyan.bold(pmName)}`);
  console.log();

  // 2. 功能选择（交互式 or CI）
  let features: FeatureSet;
  let eslintOpts: ESLintOptions = {
    framework: "vue",
    typescript: true,
    jsdoc: false,
  };

  if (options.ci) {
    // ── CI 模式 ──
    if (presetId === "custom") {
      features = {
        eslint: true,
        lintStaged: true,
        prettier: options.prettier ?? true,
        oxlint: options.oxlint ?? true,
        editorconfig: true,
      };
    } else {
      features = { ...PRESETS[presetId].features };
    }
    // CLI flag 覆盖
    if (options.prettier !== undefined) features.prettier = options.prettier;
    if (options.oxlint !== undefined) features.oxlint = options.oxlint;
    const jsdocDefault = presetId === "full" ? true : false;
    eslintOpts = {
      framework,
      typescript: options.typescript ?? true,
      jsdoc: options.jsdoc ?? jsdocDefault,
    };
    console.log(
      `  ${S.INFO} ${chalk.gray("CI 模式")} ${chalk.white(
        "预设:",
      )} ${chalk.cyan(presetId)}`,
    );
    console.log();
  } else {
    // ── 交互式模式：每次重新选择后都必须再次确认 ──
    const { confirm } = await import("@inquirer/prompts");
    while (true) {
      const result = await interactiveSetup(options);
      features = result.features;
      eslintOpts = result.eslintOpts;
      printSummary(features, eslintOpts, pmName);
      const proceed = await confirm({
        message: chalk.white("确认以上配置并开始安装?"),
        default: true,
        theme: { prefix: `  ${S.ARROW}` },
      });
      if (proceed) break;
      console.log();
      console.log(`  ${S.INFO} ${chalk.gray("重新选择配置...")}`);
      console.log();
    }
  }

  // 3. CI 摘要；交互模式已在确认循环中输出。
  if (options.ci) printSummary(features, eslintOpts, pmName);

  console.log();

  // 4. 所有确认完成后才允许修改目标目录。
  if (!hasGitRepository) {
    const spinner = ora({
      text: chalk.gray("初始化 Git 仓库..."),
      prefixText: "  ",
      spinner: "dots",
    }).start();
    await initGitRepository(cwd);
    spinner.succeed(chalk.white("Git 仓库初始化完成"));
  }

  // 5. 执行安装流程
  await installDependencies(cwd, pm, features, eslintOpts);
  await generateConfigFiles(cwd, features, eslintOpts);
  await addPackageScripts(cwd, pm, features);
  await setupHusky(cwd, pm, features);

  // 6. 完成
  printCompletion(pm, features);
}

// ─── Banner ──────────────────────────────────────────────────────
function printBanner() {
  console.log();
  console.log(S.LINE);
  console.log(
    `  ${S.LOGO}  ${chalk.bold("Robot Standards")}  ${chalk.gray(`v${VERSION}`)}`,
  );
  console.log(`  ${chalk.gray("零配置 · 模块化 · Git 工程化标准工具包")}`);
  console.log(S.LINE);
  console.log();
}

// ─── 交互式选择 ─────────────────────────────────────────────────
async function interactiveSetup(
  options: InitOptions,
): Promise<{ features: FeatureSet; eslintOpts: ESLintOptions }> {
  const { select, checkbox, confirm } = await import("@inquirer/prompts");

  // 外层循环：支持从后续步骤返回重选
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // ── Step 1: 预设选择 ──
    console.log(`  ${S.STEP} ${chalk.bold("选择模式")}`);
    console.log();

    const presetId = await select<PresetId>({
      message: chalk.white("选择预设方案"),
      choices: [
        {
          name: `极简模式  ${chalk.gray(
            "── 仅提交规范 (Commitizen + Commitlint)",
          )}`,
          value: "minimal" as PresetId,
          description: chalk.gray("适合只需规范提交信息的项目"),
        },
        {
          name: `标准模式  ${chalk.gray("── 提交规范 + 代码检查 (+ ESLint)")}`,
          value: "standard" as PresetId,
          description: chalk.gray("适合大多数项目"),
        },
        {
          name: `完整模式  ${chalk.gray(
            "── 全部工具链 (+ Prettier + Oxlint)",
          )}  ${chalk.hex(BRAND)("主项目(Robot_Admin)")}`,
          value: "full" as PresetId,
          description: chalk.gray("全面代码质量管控"),
        },
        {
          name: `自定义    ${chalk.gray("── 自由组合需要的工具链")}`,
          value: "custom" as PresetId,
          description: chalk.gray("精确控制每个功能模块"),
        },
      ],
      default: "standard" as PresetId,
      theme: { prefix: `  ${S.ARROW}` },
    });

    let features: FeatureSet;

    if (presetId === "custom") {
      // ── Step 2: 自定义功能选择 ──
      console.log();
      console.log(
        `  ${S.STEP} ${chalk.bold("选择功能")} ${chalk.gray(
          "(Git 提交规范默认包含)",
        )}`,
      );
      console.log();

      type FeatureChoice =
        | "eslint"
        | "lintStaged"
        | "prettier"
        | "oxlint"
        | "editorconfig"
        | "__back__";

      const selected = await checkbox<FeatureChoice>({
        message: chalk.white("选择附加功能 (空格切换, 回车确认)"),
        choices: [
          {
            name: `ESLint           ${chalk.gray("代码质量检查")}`,
            value: "eslint" as FeatureChoice,
          },
          {
            name: `lint-staged      ${chalk.gray("暂存区增量检查")}`,
            value: "lintStaged" as FeatureChoice,
          },
          {
            name: `Prettier         ${chalk.gray("代码自动格式化")}`,
            value: "prettier" as FeatureChoice,
          },
          {
            name: `Oxlint           ${chalk.gray(
              "高性能 Lint 引擎 (50x faster)",
            )}`,
            value: "oxlint" as FeatureChoice,
          },
          {
            name: `EditorConfig     ${chalk.gray("编辑器统一配置")}`,
            value: "editorconfig" as FeatureChoice,
          },
          {
            name: chalk.yellow("↩ 返回上一步"),
            value: "__back__" as FeatureChoice,
          },
        ],
        theme: { prefix: `  ${S.ARROW}` },
      });

      if (selected.includes("__back__")) continue;

      features = {
        eslint: selected.includes("eslint"),
        lintStaged: selected.includes("lintStaged"),
        prettier: selected.includes("prettier"),
        oxlint: selected.includes("oxlint"),
        editorconfig: selected.includes("editorconfig"),
      };

      // ── 依赖关系自动修正 ──
      if (features.oxlint && !features.eslint) {
        console.log(
          `\n  ${S.INFO} ${chalk.gray(
            "Oxlint 需要 ESLint 配合，已自动启用 ESLint",
          )}`,
        );
        features.eslint = true;
      }
      if (features.lintStaged && !features.eslint && !features.prettier) {
        console.log(
          `\n  ${S.INFO} ${chalk.gray(
            "lint-staged 需要 ESLint 或 Prettier，已自动启用 ESLint",
          )}`,
        );
        features.eslint = true;
      }
    } else {
      features = { ...PRESETS[presetId].features };
    }

    // ── Step 3: ESLint 子配置（仅当 ESLint 启用时显示）──
    let eslintOpts: ESLintOptions = {
      framework: "vue",
      typescript: true,
      jsdoc: false,
    };

    if (features.eslint) {
      console.log();
      console.log(`  ${S.STEP} ${chalk.bold("ESLint 配置")}`);
      console.log();

      const framework = await select({
        message: chalk.white("项目框架"),
        choices: [
          {
            name: "Vue 3",
            value: "vue" as const,
          },
          { name: "React", value: "react" as const },
          { name: "Vanilla JS / TS", value: "vanilla" as const },
          {
            name: chalk.yellow("↩ 返回上一步"),
            value: "__back__" as const,
          },
        ],
        default: options.framework || "vue",
        theme: { prefix: `  ${S.ARROW}` },
      });

      if (framework === "__back__") continue;

      const typescript = await confirm({
        message: chalk.white("使用 TypeScript"),
        default: options.typescript ?? true,
        theme: { prefix: `  ${S.ARROW}` },
      });

      const jsdoc = await confirm({
        message: chalk.white("强制 JSDoc 注释"),
        default: options.jsdoc ?? true,
        theme: { prefix: `  ${S.ARROW}` },
      });

      eslintOpts = { framework, typescript, jsdoc };
    }

    return { features, eslintOpts };
  } // end while
}

// ─── 配置摘要 ────────────────────────────────────────────────────
function printSummary(
  features: FeatureSet,
  eslintOpts: ESLintOptions,
  pmName: string,
) {
  console.log();
  console.log(`  ${S.STEP} ${chalk.bold("配置摘要")}`);
  console.log();

  // 核心模块（始终包含）
  console.log(
    `  ${S.OK} ${chalk.white("核心")}   Commitizen + Commitlint + Husky`,
  );

  if (features.eslint) {
    const fw =
      eslintOpts.framework === "vue"
        ? "Vue 3"
        : eslintOpts.framework === "react"
          ? "React"
          : "Vanilla";
    const ts = eslintOpts.typescript ? " + TS" : "";
    const jsdoc = eslintOpts.jsdoc ? " + JSDoc" : "";
    console.log(
      `  ${S.OK} ${chalk.white("检查")}   ESLint (${fw}${ts}${jsdoc})`,
    );
  }
  if (features.lintStaged) {
    console.log(`  ${S.OK} ${chalk.white("暂存")}   lint-staged`);
  }
  if (features.oxlint) {
    console.log(
      `  ${S.OK} ${chalk.white("加速")}   Oxlint ${chalk.gray("(50x faster)")}`,
    );
  }
  if (features.prettier) {
    console.log(`  ${S.OK} ${chalk.white("格式")}   Prettier`);
  }
  if (features.editorconfig) {
    console.log(`  ${S.OK} ${chalk.white("编辑")}   EditorConfig`);
  }
  console.log(`  ${S.DOT} ${chalk.gray("管理")}   ${pmName}`);
  console.log();
}

// ─── 安装依赖 ────────────────────────────────────────────────────
const TOOL_VERSIONS: Record<string, string> = {
  "@commitlint/cli": "^19.6.0",
  "@commitlint/config-conventional": "^19.6.0",
  commitizen: "^4.3.1",
  "cz-customizable": "^7.2.1",
  husky: "^9.1.7",
  eslint: "^9.39.0",
  "@eslint/js": "^9.39.0",
  "eslint-plugin-vue": "^10.0.0",
  "@vue/eslint-config-typescript": "^14.0.0",
  "typescript-eslint": "^8.0.0",
  "eslint-plugin-react": "^7.37.0",
  "eslint-plugin-react-hooks": "^7.0.0",
  "eslint-plugin-jsdoc": "^50.0.0",
  "lint-staged": "^15.2.0",
  oxlint: "^1.52.0",
  "eslint-plugin-oxlint": "^1.52.0",
  prettier: "^3.0.0",
  "@vue/eslint-config-prettier": "^10.0.0",
};

const withTestedVersion = (name: string): string => {
  const version = TOOL_VERSIONS[name];
  if (!version) throw new Error(`缺少工具版本约束: ${name}`);
  return `${name}@${version}`;
};

async function installDependencies(
  cwd: string,
  pm: PackageManager,
  features: FeatureSet,
  eslintOpts: ESLintOptions,
) {
  const spinner = ora({
    text: chalk.gray("分析依赖..."),
    prefixText: "  ",
    spinner: "dots",
  }).start();

  // ── 核心依赖（始终安装） ──
  const deps: string[] = [
    "@commitlint/cli",
    "@commitlint/config-conventional",
    "commitizen",
    "cz-customizable",
    "husky",
  ];

  // ── ESLint ──
  if (features.eslint) {
    deps.push("eslint", "@eslint/js");
    if (eslintOpts.framework === "vue") {
      deps.push("eslint-plugin-vue");
      if (eslintOpts.typescript) {
        deps.push("@vue/eslint-config-typescript");
      }
    }
    if (eslintOpts.typescript && eslintOpts.framework !== "vue") {
      deps.push("typescript-eslint");
    }
    if (eslintOpts.framework === "react") {
      deps.push("eslint-plugin-react", "eslint-plugin-react-hooks");
    }
    if (eslintOpts.jsdoc) {
      deps.push("eslint-plugin-jsdoc");
    }
  }

  // ── lint-staged ──
  if (features.lintStaged) {
    deps.push("lint-staged");
  }

  // ── Oxlint ──
  if (features.oxlint) {
    deps.push("oxlint", "eslint-plugin-oxlint");
  }

  // ── Prettier ──
  if (features.prettier) {
    deps.push("prettier");
    if (features.eslint && eslintOpts.framework === "vue") {
      deps.push("@vue/eslint-config-prettier");
    }
  }

  spinner.text = chalk.gray(`安装 ${deps.length} 个依赖...`);

  try {
    const installCmd = getInstallCommand(pm);
    await execa(
      installCmd.split(" ")[0],
      [...installCmd.split(" ").slice(1), ...deps.map(withTestedVersion)],
      { cwd, stdio: "pipe" },
    );
    spinner.succeed(
      chalk.white("依赖安装完成 ") + chalk.gray(`(${deps.length} packages)`),
    );
  } catch (error) {
    spinner.fail(chalk.red("依赖安装失败"));
    throw error;
  }
}

// ─── 生成配置文件 ────────────────────────────────────────────────
export async function generateConfigFiles(
  cwd: string,
  features: FeatureSet,
  eslintOpts: ESLintOptions,
) {
  const spinner = ora({
    text: chalk.gray("生成配置文件..."),
    prefixText: "  ",
    spinner: "dots",
  }).start();

  const generated: string[] = [];

  // 检测目标项目是否是 ESM（"type": "module"）
  // ESM 项目中 .js 默认按 ESModule 解析，CJS 语法（module.exports）需要 .cjs 扩展名
  let isESM = false;
  try {
    const pkg = await readJsonFile(resolve(cwd, "package.json"));
    isESM = pkg.type === "module";
  } catch {
    // package.json 不存在或解析失败，默认为 CJS
  }
  const jsExt = isESM ? ".cjs" : ".js";

  try {
    // ── .cz-config.js（始终生成）──
    const czConfig = `/*
 * Commitizen 自定义配置 (cz-customizable)
 * @generated by @robot-admin/git-standards
 *
 * 直接修改此文件即可自定义提交规范
 */
module.exports = {
  scopes: [],
  allowEmptyScopes: false,
  allowCustomScopes: true,

  types: [
    { value: 'wip', name: 'wip:      🚧 开发中' },
    { value: 'feat', name: 'feat:     🎯 新功能' },
    { value: 'fix', name: 'fix:      🐛 Bug 修复' },
    { value: 'perf', name: 'perf:     ⚡️ 性能优化' },
    { value: 'deps', name: 'deps:     📦 依赖更新' },
    { value: 'refactor', name: 'refactor: ♻️  重构' },
    { value: 'docs', name: 'docs:     📚 文档变更' },
    { value: 'test', name: 'test:     🔎 测试相关' },
    { value: 'style', name: 'style:    💄 代码样式' },
    { value: 'build', name: 'build:    🧳 构建/打包' },
    { value: 'chore', name: 'chore:    🔧 其他杂项' },
    { value: 'revert', name: 'revert:   🔙 回退' },
  ],

  messages: {
    type: '请选择提交类型:',
    customScope: '请输入修改范围(必填，格式如：模块/子模块):',
    subject: '请简要描述提交(必填，不加句号):',
    body: '请输入更详细的说明(可选):\\n',
    footer: 'Footer(可选): 例如 "Closes #123" 或 "Release-As: 1.3.1"\\n',
    confirmCommit: '确认提交以上内容？(y/n/e/h)',
  },

  skipQuestions: ['body'],

  allowBreakingChanges: ['feat', 'fix', 'refactor'],
  breakingPrefix: 'BREAKING CHANGE:',

  subjectLimit: 88,
}
`;
    await writeFileWithBackup(resolve(cwd, `.cz-config${jsExt}`), czConfig);
    generated.push(`.cz-config${jsExt}`);

    // ── commitlint.config.js（始终生成）──
    const commitlintConfig = `/*
 * Commitlint 配置
 * @generated by @robot-admin/git-standards
 *
 * 直接修改此文件即可自定义提交校验规则
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'wip', 'feat', 'fix', 'docs', 'style', 'refactor',
        'perf', 'test', 'chore', 'revert', 'build', 'deps',
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'scope-empty': [2, 'never'],
    'subject-empty': [2, 'never'],
    'subject-case': [0],
    'subject-full-stop': [0, 'never'],
    'header-max-length': [2, 'always', 88],
  },
}
`;
    await writeFileWithBackup(
      resolve(cwd, `commitlint.config${jsExt}`),
      commitlintConfig,
    );
    generated.push(`commitlint.config${jsExt}`);

    // ── .prettierrc.js（仅当 prettier 启用）──
    if (features.prettier) {
      const prettierConfig = `/*
 * Prettier 配置
 * @generated by @robot-admin/git-standards
 *
 * 直接修改此文件即可自定义格式化规则
 */
module.exports = {
  semi: false,
  singleQuote: true,
  printWidth: 80,
  tabWidth: 2,
  quoteProps: 'as-needed',
  trailingComma: 'es5',
  bracketSpacing: true,
  jsxSingleQuote: true,
  arrowParens: 'avoid',
  endOfLine: 'lf',
  htmlWhitespaceSensitivity: 'strict',
  vueIndentScriptAndStyle: true,
  singleAttributePerLine: true,
}
`;
      await writeFileWithBackup(
        resolve(cwd, `.prettierrc${jsExt}`),
        prettierConfig,
      );
      generated.push(`.prettierrc${jsExt}`);
    }

    // ── eslint.config.mjs（仅当 eslint 启用）──
    if (features.eslint) {
      // 根据选项动态构建完整的 eslint 配置模板
      const hasOxlint = features.oxlint;
      const hasPrettier = features.prettier;
      const hasJsdoc = eslintOpts.jsdoc;
      const isVue = eslintOpts.framework === "vue";
      const isTs = eslintOpts.typescript;

      // ── imports ──
      const isReact = eslintOpts.framework === "react";
      const importLines: string[] = ["import js from '@eslint/js'"];
      if (isVue) importLines.push("import pluginVue from 'eslint-plugin-vue'");
      if (isVue && isTs) {
        importLines.push(
          "import {\n  defineConfigWithVueTs,\n  vueTsConfigs,\n} from '@vue/eslint-config-typescript'",
        );
      }
      if (!isVue && isTs) {
        importLines.push("import tseslint from 'typescript-eslint'");
      }
      if (isReact) {
        importLines.push(
          "import reactPlugin from 'eslint-plugin-react'",
          "import reactHooks from 'eslint-plugin-react-hooks'",
        );
      }
      if (hasOxlint)
        importLines.push("import oxlint from 'eslint-plugin-oxlint'");
      if (hasPrettier && isVue) {
        importLines.push(
          "import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'",
        );
      }
      if (hasJsdoc)
        importLines.push("import jsdocPlugin from 'eslint-plugin-jsdoc'");

      // ── 文件扩展名 ──
      const fileExts = isVue
        ? isTs
          ? "js,ts,mts,tsx,vue"
          : "js,vue"
        : isReact
          ? isTs
            ? "js,jsx,ts,tsx"
            : "js,jsx"
          : isTs
            ? "js,ts,mts"
            : "js";

      // ── Vue 2 废弃规则 ──
      const vue2DeprecationRules = isVue
        ? `
      //! 主动禁止 Vue 2 写法
      'vue/no-deprecated-props-default-this': 'error',
      'vue/no-deprecated-events-api': 'error',
      'vue/no-deprecated-filter': 'error',
      'vue/no-deprecated-functional-template': 'error',
`
        : "";

      // ── Vue 组件规则 ──
      const vueComponentRules = isVue
        ? `
      // Vue 规范
      //! PascalCase 命名规范
      'vue/component-name-in-template-casing': [
        'error',
        'PascalCase',
        {
          registeredComponentsOnly: false,
          ignores: [
            'router-view',
            'router-link',
            'transition',
            'draggable',
            '/^icon-/i',
          ],
        },
      ],
      'vue/multi-word-component-names': [
        'error',
        {
          ignores: ['index'],
        },
      ],
      //! 禁止在模板中注册但未使用的组件
      'vue/no-unused-components': 'error',
${vue2DeprecationRules}`
        : "";

      // ── JSDoc 块 ──
      const jsdocBlock = hasJsdoc
        ? `
  //MARK: 自定义规则组（优先级最高）
  {
    plugins: {
      jsdoc: jsdocPlugin,
    },
    rules: {
      //! JSDoc 注释规则
      'jsdoc/require-jsdoc': [
        'error',
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: false,
            FunctionExpression: true,
          },
          contexts: [
            'FunctionDeclaration',
            'ClassDeclaration',
            'ClassProperty',
            'MethodDefinition',
            'FunctionExpression',
          ],
          checkConstructors: true,
          checkGetters: true,
          checkSetters: true,
        },
      ],
`
        : `
  // 自定义规则组
  {
    rules: {
`;

      // ── 文件类型覆盖 ──
      const fileTypeOverrides = isTs
        ? `
  //MARK: 文件类型覆盖规则

  //! 变量使用规则
  {
    files: ['**/*.js'],
    rules: {
      'no-unused-vars': 'error',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['**/*.{${isVue ? "ts,mts,tsx,vue" : isReact ? "ts,tsx" : "ts,mts"}}'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },
`
        : "";

      // ── 忽略白名单 ──
      const ignoreAssets = `
  //MARK: ESLINT 白名单配置组
  {
    name: 'app/ignore-assets',
    ignores: [
      'src/assets/images/**/*',
      '**/*.d.ts',
      '**/auto-imports.d.ts',
    ],
  },
`;

      // ── TS 引号和表达式规则 ──
      const tsRules = isTs
        ? `
      //! 关闭与 oxlint 重复的 ESLint 规则
      'no-undef': 'off',

      //! 引号规范
      quotes: ['error', 'single', { allowTemplateLiterals: true }],${
        isVue ? "\n      'vue/html-quotes': ['error', 'double']," : ""
      }

      //! TypeScript 安全
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': 'allow-with-description',
        },
      ],

      //! 表达式规范
      '@typescript-eslint/no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTernary: false,
          allowTaggedTemplates: false,
          enforceForJSX: true,
        },
      ],
`
        : "";

      // ── 组装 ──
      const useWrapper = isVue && isTs;
      const wrapperStart = useWrapper
        ? "export default defineConfigWithVueTs("
        : "export default [";
      const wrapperEnd = useWrapper ? ")" : "]";

      const oxlintLine = hasOxlint
        ? "\n  ...oxlint.configs['flat/recommended'], // 高性能基础校验\n"
        : "";
      const vueLine = isVue
        ? `\n  //! 忽略转义字符\n  {\n    rules: {\n      'no-useless-escape': 'off',\n    },\n  },\n\n  ...pluginVue.configs['flat/essential'], // Vue 专用规则`
        : "";
      const tsLine =
        isVue && isTs
          ? "\n  vueTsConfigs.recommended, // TS 专用规则"
          : !isVue && isTs
            ? "\n  ...tseslint.configs.recommended, // TS 专用规则"
            : "";
      const reactLine = isReact
        ? `
  {
    ...reactPlugin.configs.flat.recommended,
    files: ['**/*.{js,jsx,ts,tsx}'],
    settings: { react: { version: 'detect' } },
  },
  {
    ...reactPlugin.configs.flat['jsx-runtime'],
    files: ['**/*.{js,jsx,ts,tsx}'],
  },
  {
    ...reactHooks.configs.flat.recommended,
    files: ['**/*.{js,jsx,ts,tsx}'],
  },`
        : "";
      const skipLine = hasPrettier && isVue ? "\n  skipFormatting" : "";

      const eslintConfig = `/*
 * ESLint Flat Config
 * @generated by @robot-admin/git-standards
 *
 * 直接修改此文件即可自定义 ESLint 规则
 */
${importLines.join("\n")}

${wrapperStart}
  //MARK: 基础配置组
  {
    name: 'app/files-to-lint',
    files: ['**/*.{${fileExts}}'],
  },

  {
    name: 'app/files-to-ignore',
    ignores: [
      '**/dist/**',
      '**/dist-ssr/**',
      '**/coverage/**',
    ],
  },

  //MARK: 核心规则组（按优先级排序）
  js.configs.recommended,
${oxlintLine}${vueLine}${tsLine}${reactLine}
${fileTypeOverrides}
${jsdocBlock}${tsRules}
      //! 代码复杂度
      'max-depth': ['error', 4],
      complexity: ['warn', 10],

      //! 异步代码规范
      'no-await-in-loop': 'error',
${vueComponentRules}
      //MARK: 格式规范
      'no-irregular-whitespace': 'error',
      'no-multi-spaces': 'error',
      'space-infix-ops': 'error',
      'array-bracket-spacing': ['error', 'never'],
      'arrow-spacing': ['error', { before: true, after: true }],
      'max-params': ['warn', 6],
      'no-eval': 'error',
      'prefer-const': 'warn',
      'no-var': 'warn',
      'prefer-destructuring': [
        1,
        { object: true, array: false },
      ],
      'no-duplicate-imports': 'error',
    },
  },
${ignoreAssets}${skipLine}
${wrapperEnd}
`;
      await writeFileWithBackup(
        resolve(cwd, "eslint.config.mjs"),
        eslintConfig,
      );
      generated.push("eslint.config.mjs");
    }

    // ── .editorconfig（仅当 editorconfig 启用）──
    if (features.editorconfig) {
      const editorConfig = `# EditorConfig - 编辑器统一配置
# @generated by @robot-admin/git-standards
# 参考: https://editorconfig.org

root = true

[*]
charset = utf-8
indent_style = space
indent_size = 2
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false

[*.{yml,yaml}]
indent_size = 2

[Makefile]
indent_style = tab
`;
      await writeFileWithBackup(resolve(cwd, ".editorconfig"), editorConfig);
      generated.push(".editorconfig");
    }

    spinner.succeed(
      chalk.white("配置文件生成完成 ") +
        chalk.gray(`(${generated.join(", ")})`),
    );
  } catch (error) {
    spinner.fail(chalk.red("配置文件生成失败"));
    throw error;
  }
}

// ─── Husky 设置 ──────────────────────────────────────────────────
async function setupHusky(
  cwd: string,
  pm: PackageManager,
  features: FeatureSet,
) {
  const spinner = ora({
    text: chalk.gray("初始化 Husky..."),
    prefixText: "  ",
    spinner: "dots",
  }).start();

  try {
    // execCmd 为“执行本地包”前缀（如 "npx --no-install" / "pnpm exec"），
    // 既是 hook 脚本里的命令前缀，也需拆分后传给 execa（首个参数须为单个可执行名）。
    const execCmd = getExecCommand(pm);
    const [execBin, ...execArgs] = splitExecCommand(pm);
    // 仅安装 Husky 运行时，不使用会覆盖 prepare / pre-commit 的 `husky init`。
    // .husky/_/ 是 Husky v9 的**核心运行时目录**（被 .gitignore 自动排除）：
    //   - _/h: 调度脚本，负责查找并执行 .husky/<hook-name> 用户脚本
    //   - _/pre-commit, _/commit-msg 等: 包装脚本，Git 通过 core.hooksPath 实际调用这些
    //   - 执行链: Git → .husky/_/<hook> → .husky/_/h → .husky/<hook>（用户脚本）
    //
    // ⚠️ 切勿删除 .husky/_/ 目录！它不是旧版遗留物，而是 hook 执行的必要基础设施。
    //    该目录由 prepare 脚本（husky）在每次 install 后自动重建。
    await execa(execBin, [...execArgs, "husky"], {
      cwd,
      stdio: "pipe",
    });

    const writeHook = async (
      name: string,
      content: string,
    ): Promise<boolean> => {
      const filePath = resolve(cwd, ".husky", name);
      if (existsSync(filePath)) {
        const existing = await readFileContent(filePath);
        if (existing.trim() && existing !== content) {
          console.log(
            `\n  ${S.WARN} ${chalk.yellow(`${name} 已存在，已保留原内容`)}`,
          );
          return false;
        }
      }
      await writeExecutableFileWithBackup(filePath, content);
      return true;
    };

    // ── commit-msg hook（始终创建）──
    // --no-install 已包含在 npm / bun 的 execCmd 中。
    const commitMsg = `${execCmd} commitlint --edit "$1"\n`;
    const commitMsgWritten = await writeHook("commit-msg", commitMsg);

    const hooks: string[] = commitMsgWritten ? ["commit-msg"] : [];

    // ── pre-commit hook（根据功能动态生成）──
    const needsPreCommit =
      features.eslint || features.lintStaged || features.oxlint;

    if (needsPreCommit) {
      const cmds: string[] = [];
      if (features.lintStaged) {
        cmds.push(`${execCmd} lint-staged`);
      } else if (features.oxlint) {
        cmds.push(`${execCmd} oxlint --max-warnings 0 --deny-warnings`);
      } else if (features.eslint) {
        cmds.push(`${execCmd} eslint . --fix`);
      }
      if (await writeHook("pre-commit", cmds.join("\n") + "\n")) {
        hooks.push("pre-commit");
      }
    }

    spinner.succeed(
      chalk.white("Husky 初始化完成 ") +
        chalk.gray(hooks.length ? `(${hooks.join(", ")})` : "(保留已有 hooks)"),
    );
  } catch (error) {
    spinner.fail(chalk.red("Husky 初始化失败"));
    throw error;
  }
}

// ─── 更新 package.json ──────────────────────────────────────────
export async function addPackageScripts(
  cwd: string,
  pm: PackageManager,
  features: FeatureSet,
) {
  const spinner = ora({
    text: chalk.gray("更新 package.json..."),
    prefixText: "  ",
    spinner: "dots",
  }).start();

  try {
    const packageJsonPath = resolve(cwd, "package.json");
    const packageJson = await readJsonFile(packageJsonPath);

    if (
      packageJson.scripts !== undefined &&
      (typeof packageJson.scripts !== "object" ||
        packageJson.scripts === null ||
        Array.isArray(packageJson.scripts))
    ) {
      throw new Error("package.json#scripts 必须是对象");
    }
    const scripts: Record<string, string> = packageJson.scripts
      ? { ...packageJson.scripts }
      : {};
    const preserved: string[] = [];

    const addScriptIfMissing = (name: string, command: string) => {
      if (!scripts[name]) {
        scripts[name] = command;
      } else if (scripts[name] !== command) {
        preserved.push(`scripts.${name}`);
      }
    };

    // 通用命令只补缺失项，不改写项目已有约定。
    addScriptIfMissing("cz", "git-cz");
    if (features.eslint) {
      addScriptIfMissing(
        "lint",
        features.oxlint
          ? "oxlint . --fix -D correctness --ignore-path .gitignore && eslint . --fix"
          : "eslint . --fix",
      );
    }
    if (features.prettier) {
      addScriptIfMissing("format", "prettier --write src/");
    }

    // Husky 需要在依赖安装后初始化；已有生命周期脚本采用追加方式保留。
    const lifecycle = pm === "yarn" ? "postinstall" : "prepare";
    const lifecycleScript = scripts[lifecycle];
    if (!lifecycleScript) {
      scripts[lifecycle] = "husky";
    } else if (!/(^|\s|&&|;)husky(?:\s|$)/.test(lifecycleScript)) {
      scripts[lifecycle] = `${lifecycleScript} && husky`;
    }

    // commitizen config（始终添加）
    // ESM 项目需要指定 .cjs 配置路径，因为 cz-customizable 默认只查找 .cz-config.js
    const isESM = packageJson.type === "module";
    if (
      packageJson.config !== undefined &&
      (typeof packageJson.config !== "object" ||
        packageJson.config === null ||
        Array.isArray(packageJson.config))
    ) {
      throw new Error("package.json#config 必须是对象");
    }
    const existingConfig = packageJson.config || {};
    const czConfig: Record<string, any> = { ...existingConfig };
    if (!existingConfig.commitizen) {
      czConfig.commitizen = { path: "node_modules/cz-customizable" };
    } else if (
      typeof existingConfig.commitizen === "object" &&
      existingConfig.commitizen !== null &&
      !Array.isArray(existingConfig.commitizen) &&
      !existingConfig.commitizen.path
    ) {
      czConfig.commitizen = {
        ...existingConfig.commitizen,
        path: "node_modules/cz-customizable",
      };
    } else if (
      existingConfig.commitizen.path !== "node_modules/cz-customizable"
    ) {
      preserved.push("config.commitizen");
    }
    if (isESM && !existingConfig["cz-customizable"]) {
      czConfig["cz-customizable"] = { config: ".cz-config.cjs" };
    }

    const updates: Record<string, any> = { scripts, config: czConfig };

    // lint-staged config（仅当 lintStaged 启用）
    if (features.lintStaged) {
      const generated = generateLintStagedConfig({
        eslint: features.eslint,
        oxlint: features.oxlint,
        prettier: features.prettier,
      });
      const existing = packageJson["lint-staged"];
      if (existing === undefined) {
        updates["lint-staged"] = generated;
      } else if (
        existing &&
        typeof existing === "object" &&
        !Array.isArray(existing)
      ) {
        const merged = { ...existing } as Record<string, string | string[]>;
        for (const [pattern, commands] of Object.entries(generated)) {
          const current = merged[pattern];
          if (!current) {
            merged[pattern] = commands;
            continue;
          }
          const currentCommands = Array.isArray(current) ? current : [current];
          merged[pattern] = [...new Set([...currentCommands, ...commands])];
        }
        updates["lint-staged"] = merged;
      } else {
        preserved.push("lint-staged");
      }
    }

    await updatePackageJson(updates, cwd);

    const parts = ["scripts"];
    if (features.lintStaged) parts.push("lint-staged");
    spinner.succeed(
      chalk.white("package.json 更新完成 ") +
        chalk.gray(`(${parts.join(" + ")})`),
    );
    if (preserved.length > 0) {
      console.log(
        `  ${S.WARN} ${chalk.yellow(`已保留现有配置: ${preserved.join(", ")}`)}`,
      );
    }
  } catch (error) {
    spinner.fail(chalk.red("package.json 更新失败"));
    throw error;
  }
}

// ─── 完成输出 ────────────────────────────────────────────────────
function printCompletion(pm: PackageManager, features: FeatureSet) {
  console.log();
  console.log(S.LINE);
  console.log(`  ${S.OK} ${chalk.green.bold("初始化完成!")}`);
  console.log(S.LINE);
  console.log();
  console.log(`  ${chalk.bold("快速开始:")}`);
  console.log();
  console.log(`  ${S.DOT} 提交代码  ${chalk.cyan(`${pm} run cz`)}`);
  if (features.eslint) {
    console.log(`  ${S.DOT} 检查代码  ${chalk.cyan(`${pm} run lint`)}`);
  }
  if (features.prettier) {
    console.log(`  ${S.DOT} 格式化    ${chalk.cyan(`${pm} run format`)}`);
  }
  console.log();
  console.log(
    `  ${S.INFO} ${chalk.gray("全局安装 commitizen 后可直接使用 git cz 提交")}`,
  );
  console.log(`  ${S.DOT} ${chalk.gray(`npm install -g commitizen`)}`);
  console.log();
  console.log(
    `  ${S.INFO} ${chalk.gray("所有配置文件均支持覆盖扩展，详见 README.md")}`,
  );
  console.log();
}

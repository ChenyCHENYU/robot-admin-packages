/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-13
 * @Description: Init 命令 - 模块化初始化 Git 标准化配置（预设 + 自定义）
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

import { resolve } from "node:path";
import { unlinkSync, existsSync } from "node:fs";
import chalk from "chalk";
import ora from "ora";
import { execa } from "execa";
import {
  detectPackageManager,
  getInstallCommand,
  getExecCommand,
  getPackageManagerName,
} from "../utils/package-manager";
import { isGitRepository, initGitRepository } from "../utils/git";
import {
  writeFileContent,
  writeExecutableFile,
  updatePackageJson,
  readJsonFile,
} from "../utils/file";
import { generateLintStagedConfig } from "../configs/lint-staged";

// ─── 品牌 & 符号系统 ──────────────────────────────────────────────
const BRAND = "#7C3AED";
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
  const cwd = options.cwd || process.cwd();

  // ── Banner ──
  printBanner();

  // 1. 环境检测
  console.log(`  ${S.STEP} ${chalk.bold("环境检测")}`);
  console.log();

  if (!isGitRepository(cwd)) {
    const spinner = ora({
      text: chalk.gray("初始化 Git 仓库..."),
      prefixText: "  ",
      spinner: "dots",
    }).start();
    await initGitRepository(cwd);
    spinner.succeed(chalk.white("Git 仓库初始化完成"));
  } else {
    console.log(`  ${S.OK} Git 仓库已就绪`);
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
    const presetId: PresetId = options.preset || "standard";
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
      framework: options.framework || "vue",
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
    // ── 交互式模式 ──
    const result = await interactiveSetup(options);
    features = result.features;
    eslintOpts = result.eslintOpts;
  }

  // 3. 配置摘要 & 确认
  printSummary(features, eslintOpts, pmName);

  if (!options.ci) {
    const { confirm } = await import("@inquirer/prompts");
    const proceed = await confirm({
      message: chalk.white("确认以上配置并开始安装?"),
      default: true,
      theme: { prefix: `  ${S.ARROW}` },
    });
    if (!proceed) {
      console.log();
      console.log(`  ${S.INFO} ${chalk.gray("重新选择配置...")}`);
      console.log();
      const result = await interactiveSetup(options);
      features = result.features;
      eslintOpts = result.eslintOpts;
      printSummary(features, eslintOpts, pmName);
      // 递归确认后直接继续
    }
  }

  console.log();

  // 4. 执行安装流程
  await installDependencies(cwd, pm, features, eslintOpts);
  await generateConfigFiles(cwd, features, eslintOpts);
  await setupHusky(cwd, pm, features);
  await addPackageScripts(cwd, pm, features);

  // 5. 完成
  printCompletion(pm, features);
}

// ─── Banner ──────────────────────────────────────────────────────
function printBanner() {
  console.log();
  console.log(S.LINE);
  console.log(
    `  ${S.LOGO}  ${chalk.bold("Robot Standards")}  ${chalk.gray("v1.0.0")}`,
  );
  console.log(`  ${chalk.gray("零配置 · 模块化 · Git 工程化标准工具包")}`);
  console.log(S.LINE);
  console.log();
}

// ─── 交互式选择 ─────────────────────────────────────────────────
const BACK_SIGNAL = Symbol("back");

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
async function installDependencies(
  cwd: string,
  pm: string,
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
    deps.push("eslint");
    if (eslintOpts.framework === "vue") {
      deps.push("eslint-plugin-vue", "@vue/eslint-config-typescript");
    }
    if (eslintOpts.typescript) {
      deps.push(
        "@typescript-eslint/eslint-plugin",
        "@typescript-eslint/parser",
      );
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
    const installCmd = getInstallCommand(pm as any);
    await execa(
      installCmd.split(" ")[0],
      [...installCmd.split(" ").slice(1), ...deps],
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
async function generateConfigFiles(
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
    await writeFileContent(resolve(cwd, `.cz-config${jsExt}`), czConfig);
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
    'scope-empty': [2, 'never'],
    'subject-case': [0],
  },
}
`;
    await writeFileContent(
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
  $schema: 'https://json.schemastore.org/prettierrc',
  semi: false,
  singleQuote: true,
  printWidth: 80,
  tabWidth: 2,
  quoteProps: 'as-needed',
  trailingComma: 'es5',
  bracketSpacing: true,
  jsxSingleQuote: true,
  arrowParens: 'avoid',
  endOfLine: 'auto',
  htmlWhitespaceSensitivity: 'strict',
  vueIndentScriptAndStyle: true,
  singleAttributePerLine: true,
}
`;
      await writeFileContent(resolve(cwd, `.prettierrc${jsExt}`), prettierConfig);
      generated.push(`.prettierrc${jsExt}`);
    }

    // ── eslint.config.ts（仅当 eslint 启用）──
    if (features.eslint) {
      // 根据选项动态构建完整的 eslint 配置模板
      const hasOxlint = features.oxlint;
      const hasPrettier = features.prettier;
      const hasJsdoc = eslintOpts.jsdoc;
      const isVue = eslintOpts.framework === "vue";
      const isTs = eslintOpts.typescript;

      // ── imports ──
      const importLines: string[] = [];
      if (isVue) importLines.push("import pluginVue from 'eslint-plugin-vue'");
      if (isVue && isTs) {
        importLines.push(
          "import {\n  defineConfigWithVueTs,\n  vueTsConfigs,\n} from '@vue/eslint-config-typescript'",
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
      const fileExts = isTs ? "js,ts,mts,tsx,vue" : "js,jsx,vue";

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
            '/^C_/',
            '/^c_/',
            'v-md-editor',
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
    files: ['**/*.{ts,mts,tsx,vue}'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },
`
        : "";

      // ── JSDoc 白名单 ──
      const jsdocWhitelist = hasJsdoc
        ? `
  //MARK: JSDoc 白名单覆盖规则
  {
    files: [
      'src/router/**/*.ts',
      'src/stores/**/*.ts',
      'src/views/**/components/*.vue',
    ],
    rules: {
      'jsdoc/require-jsdoc': 'off',
      '@typescript-eslint/require-jsdoc': 'off',
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
      'src/views/**/components/*.vue',
      'scripts/**/*',
    ],
  },
`;

      // ── TS 引号和表达式规则 ──
      const tsRules = isTs
        ? `
      //! 关闭与 oxlint 重复的 ESLint 规则
      'no-undef': 'off',

      //! 引号规范
      '@typescript-eslint/quotes': ['error', 'single'],${
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
        ? `\n  //! 忽略转义字符\n  {\n    rules: {\n      'no-useless-escape': 'off',\n    },\n  },\n\n  pluginVue.configs['flat/essential'], // Vue 专用规则`
        : "";
      const tsLine =
        isVue && isTs ? "\n  vueTsConfigs.recommended, // TS 专用规则" : "";
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
${oxlintLine}${vueLine}${tsLine}
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
${ignoreAssets}${jsdocWhitelist}${skipLine}
${wrapperEnd}
`;
      await writeFileContent(resolve(cwd, "eslint.config.ts"), eslintConfig);
      generated.push("eslint.config.ts");
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
      await writeFileContent(resolve(cwd, ".editorconfig"), editorConfig);
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
async function setupHusky(cwd: string, pm: string, features: FeatureSet) {
  const spinner = ora({
    text: chalk.gray("初始化 Husky..."),
    prefixText: "  ",
    spinner: "dots",
  }).start();

  try {
    const execCmd = getExecCommand(pm as any);
    // husky init 会执行两件事：
    // 1. 调用 index.js default export → 创建 .husky/_/ 运行时基础设施 + 设置 core.hooksPath = .husky/_
    // 2. 创建 .husky/ 目录和默认 pre-commit 脚本
    //
    // .husky/_/ 是 Husky v9 的**核心运行时目录**（被 .gitignore 自动排除）：
    //   - _/h: 调度脚本，负责查找并执行 .husky/<hook-name> 用户脚本
    //   - _/pre-commit, _/commit-msg 等: 包装脚本，Git 通过 core.hooksPath 实际调用这些
    //   - 执行链: Git → .husky/_/<hook> → .husky/_/h → .husky/<hook>（用户脚本）
    //
    // ⚠️ 切勿删除 .husky/_/ 目录！它不是旧版遗留物，而是 hook 执行的必要基础设施。
    //    该目录由 prepare 脚本（husky）在每次 install 后自动重建。
    await execa(execCmd, ["husky", "init"], { cwd, stdio: "pipe" });

    // ── commit-msg hook（始终创建）──
    const commitMsg = `${execCmd} --no-install commitlint --edit "$1"\n`;
    await writeExecutableFile(resolve(cwd, ".husky/commit-msg"), commitMsg);

    const hooks: string[] = ["commit-msg"];

    // ── pre-commit hook（根据功能动态生成）──
    const needsPreCommit =
      features.eslint || features.lintStaged || features.oxlint;

    if (needsPreCommit) {
      const cmds: string[] = [];
      if (features.oxlint) {
        cmds.push(`${execCmd} oxlint --max-warnings 0`);
      }
      if (features.lintStaged) {
        cmds.push(`${execCmd} lint-staged`);
      } else if (features.eslint) {
        cmds.push(`${execCmd} eslint . --fix`);
      }
      await writeExecutableFile(
        resolve(cwd, ".husky/pre-commit"),
        cmds.join("\n") + "\n",
      );
      hooks.push("pre-commit");
    } else {
      // 极简模式：移除 husky init 创建的默认 pre-commit
      const defaultPreCommit = resolve(cwd, ".husky/pre-commit");
      if (existsSync(defaultPreCommit)) {
        unlinkSync(defaultPreCommit);
      }
    }

    spinner.succeed(
      chalk.white("Husky 初始化完成 ") + chalk.gray(`(${hooks.join(", ")})`),
    );
  } catch (error) {
    spinner.fail(chalk.red("Husky 初始化失败"));
    throw error;
  }
}

// ─── 更新 package.json ──────────────────────────────────────────
async function addPackageScripts(
  cwd: string,
  pm: string,
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

    const scripts = packageJson.scripts || {};

    // cz 脚本（始终添加）
    scripts.cz = "git-cz";

    // prepare 脚本（husky 需要）
    scripts.prepare = "husky";

    // lint 脚本（仅当 eslint 启用）
    if (features.eslint) {
      scripts.lint = features.oxlint
        ? "oxlint . --fix -D correctness --ignore-path .gitignore && eslint . --fix"
        : "eslint . --fix";
    }

    // format 脚本（仅当 prettier 启用）
    if (features.prettier) {
      scripts.format = "prettier --write src/";
    }

    // commitizen config（始终添加）
    // ESM 项目需要指定 .cjs 配置路径，因为 cz-customizable 默认只查找 .cz-config.js
    const isESM = packageJson.type === "module";
    const czConfig: Record<string, any> = {
      commitizen: { path: "node_modules/cz-customizable" },
    };
    if (isESM) {
      czConfig["cz-customizable"] = { config: ".cz-config.cjs" };
    }

    const updates: Record<string, any> = { scripts, config: czConfig };

    // lint-staged config（仅当 lintStaged 启用）
    if (features.lintStaged) {
      updates["lint-staged"] = generateLintStagedConfig({
        eslint: features.eslint,
        oxlint: features.oxlint,
        prettier: features.prettier,
      });
    }

    await updatePackageJson(updates, cwd);

    const parts = ["scripts"];
    if (features.lintStaged) parts.push("lint-staged");
    spinner.succeed(
      chalk.white("package.json 更新完成 ") +
        chalk.gray(`(${parts.join(" + ")})`),
    );
  } catch (error) {
    spinner.fail(chalk.red("package.json 更新失败"));
    throw error;
  }
}

// ─── 完成输出 ────────────────────────────────────────────────────
function printCompletion(pm: string, features: FeatureSet) {
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

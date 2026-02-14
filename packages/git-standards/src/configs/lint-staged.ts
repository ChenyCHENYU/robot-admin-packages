/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-13
 * @Description: Lint-staged 配置生成器
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

export interface LintStagedOptions {
  /**
   * 是否启用 ESLint（默认 true）
   */
  eslint?: boolean;
  /**
   * 是否启用 Oxlint
   */
  oxlint?: boolean;
  /**
   * 是否启用 Prettier
   */
  prettier?: boolean;
  /**
   * 文件 glob 模式
   */
  filePatterns?: {
    code?: string;
    markup?: string;
  };
}

/**
 * 创建 Lint-staged 配置
 */
export function createLintStagedConfig(options: LintStagedOptions = {}) {
  const codePattern =
    options.filePatterns?.code || "src/**/*.{js,jsx,ts,tsx,vue}";
  const markupPattern = options.filePatterns?.markup || "*.{json,md,yml,yaml}";

  const codeCommands: string[] = [];

  // Oxlint 优先（性能最优）
  if (options.oxlint !== false) {
    codeCommands.push("oxlint --max-warnings 0 --deny-warnings");
  }

  // ESLint（默认启用，可通过 eslint: false 关闭）
  if (options.eslint !== false) {
    codeCommands.push("eslint --fix --no-cache");
  }

  // Prettier
  if (options.prettier !== false) {
    codeCommands.push("prettier --write");
  }

  // 如果没有任何代码检查命令，不生成代码模式配置
  const config: Record<string, string[]> = {};

  if (codeCommands.length > 0) {
    config[codePattern] = codeCommands;
  }

  // 为标记文件添加 Prettier
  if (options.prettier !== false) {
    config[markupPattern] = ["prettier --write"];
  }

  return config;
}

/**
 * 生成 lint-staged 配置（用于 package.json）
 */
export function generateLintStagedConfig(
  options: LintStagedOptions = {},
): Record<string, string[]> {
  return createLintStagedConfig(options);
}

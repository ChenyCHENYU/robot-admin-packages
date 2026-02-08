/**
 * @robot-admin/form-validate
 * 企业级表单验证规则库，专为 Naive UI 设计
 */

import type { FormItemRule } from "naive-ui/es/form";

// ==================== 类型定义 ====================

/**
 * 扩展的表单验证规则类型
 */
export type FieldRule = Omit<FormItemRule, "validator"> & {
  validator: NonNullable<FormItemRule["validator"]>;
};

export type { FormItemRule };

// ==================== 正则表达式库 ====================
export { REGEX_PATTERNS } from "./regex";

// ==================== 工具函数 ====================
export {
  debounce,
  createMessageTemplate,
  createRule,
  createAsyncRule,
  transform,
  customRule,
  customAsyncRule,
  mergeRules,
  _mergeRules, // 向后兼容
} from "./utils";

// ==================== 基础验证规则 ====================
export * as BasicRules from "./rules/basic";
export * as ValueRules from "./rules/value";
export * as FormatRules from "./rules/format";
export * as ChinaRules from "./rules/china";

// ==================== 高级验证功能 ====================
export {
  when,
  compareWith,
  debouncedAsyncCheck,
  some,
  every,
} from "./advanced";

// ==================== 预设规则组合 ====================
export { RULE_COMBOS } from "./combos";

// ==================== 整合的预设规则对象 ====================

import * as BasicRules from "./rules/basic";
import * as ValueRules from "./rules/value";
import * as FormatRules from "./rules/format";
import * as ChinaRules from "./rules/china";

/**
 * PRESET_RULES - 整合所有验证规则的命名空间
 * 提供统一的规则访问接口，保持向后兼容
 */
export const PRESET_RULES = {
  // 基础规则
  ...BasicRules,
  // 值验证规则（字符串、数字、数组、日期）
  ...ValueRules,
  // 格式规则
  ...FormatRules,
  // 中国本地化规则
  ...ChinaRules,
};

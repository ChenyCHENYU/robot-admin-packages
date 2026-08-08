/**
 * @robot-admin/form-validate-element
 * 企业级表单验证规则库，专为 Element Plus 设计
 *
 * 与 naive-ui 版（@robot-admin/form-validate）API 完全一致，用法一一对应。
 * 产出的规则为 element-plus FormItemRule，可直接用于：
 * - <el-form-item :rules>（BaseForm / 原生 el-form）
 * - 表格内嵌编辑（advance-table column.meta.rules / jh-grid column.rules）
 */

import type { FormItemRule } from "element-plus";

// ==================== 类型定义 ====================

/**
 * 扩展的表单验证规则类型（与 naive 版 API 对齐）
 */
export type FieldRule = Omit<FormItemRule, "validator"> & {
  validator: NonNullable<FormItemRule["validator"]>;
};

export type { FormItemRule };

// ==================== adapter（供手动转换 RuleSpec） ====================
export { toElementRule, toElementRules } from "./adapter";

// ==================== 正则表达式库 ====================
export { REGEX_PATTERNS } from "@robot-admin/form-validate-core";

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

// ==================== 数据库数值契约 ====================
import { toElementRule } from "./adapter";
import { numeric as numericCore, type NumericContract } from "@robot-admin/form-validate-core";

/**
 * 数据库数值契约验证（对标 SQL DECIMAL(p, s)）
 */
export const numeric = (contract: NumericContract, field?: string): FormItemRule =>
  toElementRule(numericCore(contract, field));
export type { NumericContract };

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
 * 提供统一的规则访问接口，用法与 naive-ui 版完全一致。
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
  // 数据库数值契约
  numeric,
};

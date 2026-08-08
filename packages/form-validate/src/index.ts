/**
 * @robot-admin/form-validate
 * 企业级表单验证规则库 —— 单包同时支持 Naive UI 与 Element Plus
 *
 * 设计：所有规则逻辑产出框架无关的 RuleSpec（一份源真相），
 * 通过 toNaiveRule / toElementRule 适配为各框架规则。
 *
 * - naive-ui 用户：PRESET_RULES / RULE_COMBOS / createRule / when ...（向后兼容）
 * - element-plus 用户：ELEMENT_RULES / ELEMENT_COMBOS / toElementRule / whenElement ...
 */

// ==================== 类型定义 ====================
export type {
  RuleSpec,
  NaiveRule,
  ElementRule,
  Trigger,
  ValidateResult,
  FieldRule,
} from "./types";

// ==================== 正则表达式库 ====================
export { REGEX_PATTERNS } from "./regex";

// ==================== 工具函数 ====================
export {
  debounce,
  createMessageTemplate,
  isBlank,
  createSpec,
  createAsyncSpec,
  mergeTriggers,
  optional,
  transform,
  mergeSpecs,
  // 向后兼容（返回 NaiveRule）
  createRule,
  createAsyncRule,
  customRule,
  customAsyncRule,
  mergeRules,
  _mergeRules,
} from "./utils";

// ==================== 适配器 ====================
export {
  runSpec,
  toNaiveRule,
  toNaiveRules,
  toElementRule,
  toElementRules,
} from "./adapter";

// ==================== 规则工厂（框架无关 RuleSpec） ====================
export * as BasicRules from "./rules/basic";
export * as ValueRules from "./rules/value";
export * as FormatRules from "./rules/format";
export * as ChinaRules from "./rules/china";

// ==================== 数据库数值契约 ====================
export { numeric } from "./numeric";
export type { NumericContract } from "./numeric";

// ==================== 高级验证功能 ====================
export {
  // 框架无关
  whenSpec,
  compareWithSpec,
  debouncedAsyncCheckSpec,
  someSpec,
  everySpec,
  // naive 版（向后兼容）
  when,
  compareWith,
  debouncedAsyncCheck,
  some,
  every,
  // element 版
  whenElement,
  compareWithElement,
  debouncedAsyncCheckElement,
  someElement,
  everyElement,
} from "./advanced";

// ==================== 预设规则组合 ====================
export {
  RULE_COMBOS,
  NAIVE_COMBOS,
  ELEMENT_COMBOS,
} from "./combos";

// ==================== 整合的预设规则对象 ====================
export { SPEC_RULES, PRESET_RULES, ELEMENT_RULES } from "./presets";

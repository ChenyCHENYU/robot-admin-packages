/**
 * @robot-admin/form-validate-core
 * 企业级表单验证规则库核心 —— 框架无关的验证逻辑层
 *
 * 所有验证逻辑都产出 RuleSpec，由各 UI 框架的 adapter 转换为对应规则对象：
 * - naive-ui:    @robot-admin/form-validate
 * - element-plus: @robot-admin/form-validate-element
 */

// ==================== 类型定义 ====================
export type { RuleSpec, Trigger, ValidateResult } from "./types";

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
  isBlank,
  optional,
  mergeRules,
  _mergeRules, // 向后兼容
} from "./utils";

// ==================== 基础验证规则 ====================
export * as BasicRules from "./rules/basic";
export * as ValueRules from "./rules/value";
export * as FormatRules from "./rules/format";
export * as ChinaRules from "./rules/china";

// ==================== 数据库数值契约 ====================
export { numeric } from "./numeric";
export type { NumericContract } from "./numeric";

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
export { PRESET_RULES } from "./presets";

/**
 * 整合的预设规则命名空间
 * 提供统一的规则访问接口（全部产出 RuleSpec）
 */

import * as BasicRules from "./rules/basic";
import * as ValueRules from "./rules/value";
import * as FormatRules from "./rules/format";
import * as ChinaRules from "./rules/china";
import { numeric } from "./numeric";
import type { RuleSpec } from "./types";
import type { NumericContract } from "./numeric";

/**
 * PRESET_RULES - 整合所有验证规则的命名空间
 * 每个成员都是一个工厂函数，返回 RuleSpec。
 *
 * adapter 包（form-validate / form-validate-element）会把这些 RuleSpec 工厂
 * 包装成各自框架的规则对象，保持调用方写法一致。
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
  numeric: (contract: NumericContract, field?: string): RuleSpec =>
    numeric(contract, field),
};

export type { NumericContract };

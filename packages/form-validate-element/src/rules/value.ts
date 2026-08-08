/**
 * 值验证规则（element-plus 版）
 * 薄包装层：从 core 引入框架无关逻辑，经 toElementRule 转换为 FormItemRule。
 */

import { toElementRule } from "../adapter";
import { ValueRules, type RuleSpec } from "@robot-admin/form-validate-core";
import type { FormItemRule } from "element-plus";

type SpecFactory = (...args: any[]) => RuleSpec;
const wrap = <F extends SpecFactory>(f: F) =>
  ((...args: any[]): FormItemRule => toElementRule(f(...args))) as F;

// 字符串验证
export const length = wrap(ValueRules.length);
export const minLength = wrap(ValueRules.minLength);
export const maxLength = wrap(ValueRules.maxLength);
export const startsWith = wrap(ValueRules.startsWith);
export const endsWith = wrap(ValueRules.endsWith);
export const includes = wrap(ValueRules.includes);

// 数字验证
export const range = wrap(ValueRules.range);
export const min = wrap(ValueRules.min);
export const max = wrap(ValueRules.max);
export const between = wrap(ValueRules.between);

// 数组验证
export const array = wrap(ValueRules.array);
export const arrayMinLength = wrap(ValueRules.arrayMinLength);
export const arrayMaxLength = wrap(ValueRules.arrayMaxLength);
export const arrayUnique = wrap(ValueRules.arrayUnique);

// 日期验证
export const date = wrap(ValueRules.date);
export const dateAfter = wrap(ValueRules.dateAfter);
export const dateBefore = wrap(ValueRules.dateBefore);
export const dateRange = wrap(ValueRules.dateRange);

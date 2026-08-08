/**
 * 基础验证规则（element-plus 版）
 * 薄包装层：从 core 引入框架无关逻辑，经 toElementRule 转换为 FormItemRule。
 */

import { toElementRule } from "../adapter";
import {
  BasicRules,
  type RuleSpec,
} from "@robot-admin/form-validate-core";
import type { FormItemRule } from "element-plus";

type SpecFactory = (...args: any[]) => RuleSpec;
const wrap = <F extends SpecFactory>(f: F) =>
  ((...args: any[]): FormItemRule => toElementRule(f(...args))) as F;

export const required = wrap(BasicRules.required);
export const integer = wrap(BasicRules.integer);
export const positiveInteger = wrap(BasicRules.positiveInteger);
export const number = wrap(BasicRules.number);
export const positiveNumber = wrap(BasicRules.positiveNumber);
export const boolean = wrap(BasicRules.boolean);
export const enumValue = wrap(BasicRules.enumValue);
export const pattern = wrap(BasicRules.pattern);
export const optional = wrap(BasicRules.optional);

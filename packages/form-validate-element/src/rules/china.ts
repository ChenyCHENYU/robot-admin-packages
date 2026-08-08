/**
 * 中国本地化验证规则（element-plus 版）
 * 薄包装层：从 core 引入框架无关逻辑，经 toElementRule 转换为 FormItemRule。
 */

import { toElementRule } from "../adapter";
import { ChinaRules, type RuleSpec } from "@robot-admin/form-validate-core";
import type { FormItemRule } from "element-plus";

type SpecFactory = (...args: any[]) => RuleSpec;
const wrap = <F extends SpecFactory>(f: F) =>
  ((...args: any[]): FormItemRule => toElementRule(f(...args))) as F;

export const idCard = wrap(ChinaRules.idCard);
export const postalCode = wrap(ChinaRules.postalCode);
export const bankCard = wrap(ChinaRules.bankCard);
export const creditCode = wrap(ChinaRules.creditCode);
export const licensePlate = wrap(ChinaRules.licensePlate);
export const qq = wrap(ChinaRules.qq);
export const wechat = wrap(ChinaRules.wechat);

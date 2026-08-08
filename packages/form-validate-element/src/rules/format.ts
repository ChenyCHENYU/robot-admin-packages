/**
 * 格式验证规则（element-plus 版）
 * 薄包装层：从 core 引入框架无关逻辑，经 toElementRule 转换为 FormItemRule。
 */

import { toElementRule } from "../adapter";
import { FormatRules, type RuleSpec } from "@robot-admin/form-validate-core";
import type { FormItemRule } from "element-plus";

type SpecFactory = (...args: any[]) => RuleSpec;
const wrap = <F extends SpecFactory>(f: F) =>
  ((...args: any[]): FormItemRule => toElementRule(f(...args))) as F;

export const mobile = wrap(FormatRules.mobile);
export const email = wrap(FormatRules.email);
export const url = wrap(FormatRules.url);
export const ip = wrap(FormatRules.ip);
export const ipv6 = wrap(FormatRules.ipv6);
export const mac = wrap(FormatRules.mac);
export const domain = wrap(FormatRules.domain);
export const hexColor = wrap(FormatRules.hexColor);
export const username = wrap(FormatRules.username);
export const strongPassword = wrap(FormatRules.strongPassword);
export const confirmPassword = wrap(FormatRules.confirmPassword);
export const asyncCheck = wrap(FormatRules.asyncCheck);

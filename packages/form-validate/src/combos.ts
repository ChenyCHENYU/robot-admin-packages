/**
 * 预设规则组合
 * - RULE_COMBOS：NAIVE_COMBOS 的历史别名（向后兼容）
 * - NAIVE_COMBOS：返回 NaiveRule[]
 * - ELEMENT_COMBOS：返回 ElementRule[]
 */

import * as BasicSpecs from "./rules/basic";
import * as FormatSpecs from "./rules/format";
import * as ChinaSpecs from "./rules/china";
import { toElementRule, toNaiveRule } from "./adapter";
import type { ElementRule, NaiveRule } from "./types";

/**
 * naive-ui 预设组合（向后兼容，返回 NaiveRule[]）
 */
export const NAIVE_COMBOS = Object.freeze({
  username: (field: string = "用户名"): NaiveRule[] => [
    toNaiveRule(BasicSpecs.required(field)),
    toNaiveRule(FormatSpecs.username(field)),
  ],
  password: (field: string = "密码"): NaiveRule[] => [
    toNaiveRule(BasicSpecs.required(field)),
    toNaiveRule(FormatSpecs.strongPassword(field)),
  ],
  email: (field: string = "邮箱"): NaiveRule[] => [
    toNaiveRule(BasicSpecs.required(field)),
    toNaiveRule(FormatSpecs.email(field)),
  ],
  mobile: (field: string = "手机号"): NaiveRule[] => [
    toNaiveRule(BasicSpecs.required(field)),
    toNaiveRule(FormatSpecs.mobile(field)),
  ],
  confirmPassword: (
    field: string,
    getOriginalValue: () => any,
  ): NaiveRule[] => [
    toNaiveRule(BasicSpecs.required(field)),
    toNaiveRule(FormatSpecs.confirmPassword(field, getOriginalValue)),
  ],
  idCard: (field: string = "身份证号"): NaiveRule[] => [
    toNaiveRule(BasicSpecs.required(field)),
    toNaiveRule(ChinaSpecs.idCard(field)),
  ],
  bankCard: (field: string = "银行卡号"): NaiveRule[] => [
    toNaiveRule(BasicSpecs.required(field)),
    toNaiveRule(ChinaSpecs.bankCard(field)),
  ],
  url: (field: string = "链接"): NaiveRule[] => [
    toNaiveRule(BasicSpecs.required(field)),
    toNaiveRule(FormatSpecs.url(field)),
  ],
});

/**
 * element-plus 预设组合（返回 ElementRule[]）
 */
export const ELEMENT_COMBOS = Object.freeze({
  username: (field: string = "用户名"): ElementRule[] => [
    toElementRule(BasicSpecs.required(field)),
    toElementRule(FormatSpecs.username(field)),
  ],
  password: (field: string = "密码"): ElementRule[] => [
    toElementRule(BasicSpecs.required(field)),
    toElementRule(FormatSpecs.strongPassword(field)),
  ],
  email: (field: string = "邮箱"): ElementRule[] => [
    toElementRule(BasicSpecs.required(field)),
    toElementRule(FormatSpecs.email(field)),
  ],
  mobile: (field: string = "手机号"): ElementRule[] => [
    toElementRule(BasicSpecs.required(field)),
    toElementRule(FormatSpecs.mobile(field)),
  ],
  confirmPassword: (
    field: string,
    getOriginalValue: () => any,
  ): ElementRule[] => [
    toElementRule(BasicSpecs.required(field)),
    toElementRule(FormatSpecs.confirmPassword(field, getOriginalValue)),
  ],
  idCard: (field: string = "身份证号"): ElementRule[] => [
    toElementRule(BasicSpecs.required(field)),
    toElementRule(ChinaSpecs.idCard(field)),
  ],
  bankCard: (field: string = "银行卡号"): ElementRule[] => [
    toElementRule(BasicSpecs.required(field)),
    toElementRule(ChinaSpecs.bankCard(field)),
  ],
  url: (field: string = "链接"): ElementRule[] => [
    toElementRule(BasicSpecs.required(field)),
    toElementRule(FormatSpecs.url(field)),
  ],
});

/**
 * @deprecated 历史别名，等同 NAIVE_COMBOS。保留以向后兼容。
 */
export const RULE_COMBOS = NAIVE_COMBOS;

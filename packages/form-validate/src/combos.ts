/**
 * 预设规则组合
 * 常用验证规则的组合，开箱即用
 */

import * as BasicRules from "./rules/basic";
import * as FormatRules from "./rules/format";
import * as ChinaRules from "./rules/china";

/**
 * 常用规则组合库
 */
export const RULE_COMBOS = {
  /**
   * 用户名规则组合（必填 + 格式）
   */
  username: (field: string = "用户名") => [
    BasicRules.required(field),
    FormatRules.username(field),
  ],

  /**
   * 密码规则组合（必填 + 强密码）
   */
  password: (field: string = "密码") => [
    BasicRules.required(field),
    FormatRules.strongPassword(field),
  ],

  /**
   * 邮箱规则组合（必填 + 格式）
   */
  email: (field: string = "邮箱") => [
    BasicRules.required(field),
    FormatRules.email(field),
  ],

  /**
   * 手机号规则组合（必填 + 格式）
   */
  mobile: (field: string = "手机号") => [
    BasicRules.required(field),
    FormatRules.mobile(field),
  ],

  /**
   * 确认密码规则组合（必填 + 一致性）
   */
  confirmPassword: (field: string, getOriginalValue: () => any) => [
    BasicRules.required(field),
    FormatRules.confirmPassword(field, getOriginalValue),
  ],

  /**
   * 身份证号规则组合（必填 + 格式）
   */
  idCard: (field: string = "身份证号") => [
    BasicRules.required(field),
    ChinaRules.idCard(field),
  ],

  /**
   * 银行卡号规则组合（必填 + 格式）
   */
  bankCard: (field: string = "银行卡号") => [
    BasicRules.required(field),
    ChinaRules.bankCard(field),
  ],

  /**
   * URL规则组合（必填 + 格式）
   */
  url: (field: string = "链接") => [
    BasicRules.required(field),
    FormatRules.url(field),
  ],
};

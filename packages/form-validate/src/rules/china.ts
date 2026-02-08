/**
 * 中国本地化验证规则
 * 包含身份证、银行卡、车牌号等中国特色验证
 */

import { createRule } from "../utils";
import { REGEX_PATTERNS } from "../regex";

/**
 * 身份证验证
 * @param field 字段名
 */
export const idCard = (field: string = "身份证号") =>
  createRule(
    "blur",
    (v) => !v || REGEX_PATTERNS.ID_CARD.test(v),
    `${field}格式错误`,
  );

/**
 * 邮政编码验证
 * @param field 字段名
 */
export const postalCode = (field: string = "邮政编码") =>
  createRule(
    "blur",
    (v) => !v || REGEX_PATTERNS.POSTAL_CODE.test(v),
    `${field}必须是6位数字`,
  );

/**
 * 银行卡号验证
 * @param field 字段名
 */
export const bankCard = (field: string = "银行卡号") =>
  createRule(
    "blur",
    (v) => !v || REGEX_PATTERNS.BANK_CARD.test(v),
    `${field}格式错误`,
  );

/**
 * 统一社会信用代码验证
 * @param field 字段名
 */
export const creditCode = (field: string = "统一社会信用代码") =>
  createRule(
    "blur",
    (v) => !v || REGEX_PATTERNS.UNIFIED_CREDIT_CODE.test(v),
    `${field}格式错误`,
  );

/**
 * 车牌号验证
 * @param field 字段名
 */
export const licensePlate = (field: string = "车牌号") =>
  createRule(
    "blur",
    (v) => !v || REGEX_PATTERNS.LICENSE_PLATE.test(v),
    `${field}格式错误`,
  );

/**
 * QQ号验证
 * @param field 字段名
 */
export const qq = (field: string = "QQ号") =>
  createRule(
    "blur",
    (v) => !v || REGEX_PATTERNS.QQ.test(v),
    `${field}格式错误`,
  );

/**
 * 微信号验证
 * @param field 字段名
 */
export const wechat = (field: string = "微信号") =>
  createRule(
    "blur",
    (v) => !v || REGEX_PATTERNS.WECHAT.test(v),
    `${field}格式错误（6-20位，字母开头，可含字母数字下划线减号）`,
  );

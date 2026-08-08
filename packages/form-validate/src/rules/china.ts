/**
 * 中国本地化验证规则（产出框架无关的 RuleSpec）
 */

import { createSpec } from "../utils";
import { REGEX_PATTERNS } from "../regex";

export const idCard = (field: string = "身份证号") =>
  createSpec("blur", (v) => !v || REGEX_PATTERNS.ID_CARD.test(v), `${field}格式错误`);

export const postalCode = (field: string = "邮政编码") =>
  createSpec(
    "blur",
    (v) => !v || REGEX_PATTERNS.POSTAL_CODE.test(v),
    `${field}必须是6位数字`,
  );

export const bankCard = (field: string = "银行卡号") =>
  createSpec("blur", (v) => !v || REGEX_PATTERNS.BANK_CARD.test(v), `${field}格式错误`);

export const creditCode = (field: string = "统一社会信用代码") =>
  createSpec(
    "blur",
    (v) => !v || REGEX_PATTERNS.UNIFIED_CREDIT_CODE.test(v),
    `${field}格式错误`,
  );

export const licensePlate = (field: string = "车牌号") =>
  createSpec(
    "blur",
    (v) => !v || REGEX_PATTERNS.LICENSE_PLATE.test(v),
    `${field}格式错误`,
  );

export const qq = (field: string = "QQ号") =>
  createSpec("blur", (v) => !v || REGEX_PATTERNS.QQ.test(v), `${field}格式错误`);

export const wechat = (field: string = "微信号") =>
  createSpec(
    "blur",
    (v) => !v || REGEX_PATTERNS.WECHAT.test(v),
    `${field}格式错误（6-20位，字母开头，可含字母数字下划线减号）`,
  );

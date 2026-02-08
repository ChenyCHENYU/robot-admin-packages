/**
 * 基础验证规则
 * 包含必填、类型验证等基础功能
 */

import { createRule } from "../utils";
import { REGEX_PATTERNS } from "../regex";

/**
 * 必填验证（支持字符串、数组、对象等多种类型）
 * @param field 字段名
 * @param trigger 触发方式
 */
export const required = (
  field: string,
  trigger: "blur" | "input" | "change" | ("blur" | "input" | "change")[] = [
    "blur",
    "input",
  ],
) =>
  createRule(
    trigger,
    (v) => {
      if (v === null || v === undefined) return false;
      if (typeof v === "string") return v.trim() !== "";
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === "object") return Object.keys(v).length > 0;
      return !!v;
    },
    `${field}不能为空`,
  );

/**
 * 整数验证
 * @param field 字段名
 */
export const integer = (field: string = "数值") =>
  createRule(
    "blur",
    (v) => (!v && v !== 0) || REGEX_PATTERNS.INTEGER.test(String(v)),
    `${field}必须是整数`,
  );

/**
 * 正整数验证
 * @param field 字段名
 */
export const positiveInteger = (field: string = "数值") =>
  createRule(
    "blur",
    (v) => (!v && v !== 0) || REGEX_PATTERNS.POSITIVE_INTEGER.test(String(v)),
    `${field}必须是正整数`,
  );

/**
 * 数字验证（包括小数）
 * @param field 字段名
 */
export const number = (field: string = "数值") =>
  createRule(
    "blur",
    (v) => {
      if (!v && v !== 0) return true;
      return !isNaN(Number(v));
    },
    `${field}必须是数字`,
  );

/**
 * 正数验证
 * @param field 字段名
 */
export const positiveNumber = (field: string = "数值") =>
  createRule(
    "blur",
    (v) => {
      if (!v && v !== 0) return true;
      const num = Number(v);
      return !isNaN(num) && num > 0;
    },
    `${field}必须是正数`,
  );

/**
 * 布尔值验证
 * @param field 字段名
 */
export const boolean = (field: string = "选项") =>
  createRule("blur", (v) => typeof v === "boolean", `${field}必须是布尔值`);

/**
 * 枚举验证
 * @param field 字段名
 * @param allowedValues 允许的值列表
 * @param message 自定义错误消息
 */
export const enumValue = (
  field: string,
  allowedValues: any[],
  message?: string,
) =>
  createRule(
    "blur",
    (v) => !v || allowedValues.includes(v),
    message || `${field}必须是: ${allowedValues.join("、")} 中的一个`,
  );

/**
 * 自定义正则验证
 * @param field 字段名
 * @param pattern 正则表达式
 * @param message 自定义错误消息
 */
export const pattern = (field: string, pattern: RegExp, message?: string) =>
  createRule(
    "blur",
    (v) => !v || pattern.test(v),
    message || `${field}格式错误`,
  );

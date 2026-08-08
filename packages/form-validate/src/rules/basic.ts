/**
 * 基础验证规则（产出框架无关的 RuleSpec）
 */

import { createSpec, optional } from "../utils";
import { REGEX_PATTERNS } from "../regex";

export const required = (
  field: string,
  trigger: "blur" | "input" | "change" | ("blur" | "input" | "change")[] = [
    "blur",
    "input",
  ],
) =>
  createSpec(
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

export const integer = (field: string = "数值") =>
  createSpec(
    "blur",
    (v) => (!v && v !== 0) || REGEX_PATTERNS.INTEGER.test(String(v)),
    `${field}必须是整数`,
  );

export const positiveInteger = (field: string = "数值") =>
  createSpec(
    "blur",
    (v) => (!v && v !== 0) || REGEX_PATTERNS.POSITIVE_INTEGER.test(String(v)),
    `${field}必须是正整数`,
  );

export const number = (field: string = "数值") =>
  createSpec(
    "blur",
    (v) => {
      if (!v && v !== 0) return true;
      return !isNaN(Number(v));
    },
    `${field}必须是数字`,
  );

export const positiveNumber = (field: string = "数值") =>
  createSpec(
    "blur",
    (v) => {
      if (!v && v !== 0) return true;
      const num = Number(v);
      return !isNaN(num) && num > 0;
    },
    `${field}必须是正数`,
  );

export const boolean = (field: string = "选项") =>
  createSpec("blur", (v) => typeof v === "boolean", `${field}必须是布尔值`);

export const enumValue = (
  field: string,
  allowedValues: any[],
  message?: string,
) =>
  createSpec(
    "blur",
    (v) => !v || allowedValues.includes(v),
    message || `${field}必须是: ${allowedValues.join("、")} 中的一个`,
  );

export const pattern = (field: string, pattern: RegExp, message?: string) =>
  createSpec(
    "blur",
    (v) => !v || pattern.test(v),
    message || `${field}格式错误`,
  );

export { optional };

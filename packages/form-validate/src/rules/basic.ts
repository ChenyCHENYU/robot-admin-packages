/**
 * 基础验证规则（产出框架无关的 RuleSpec）
 */

import { createSpec, isBlank, optional } from "../utils";
import { REGEX_PATTERNS } from "../regex";

export const required = (
  field: string,
  trigger: "blur" | "input" | "change" | ("blur" | "input" | "change")[] = [
    "blur",
    "input",
  ],
) => ({
  ...createSpec(
    trigger,
    (v) => {
      if (isBlank(v)) return false;
      if (Array.isArray(v)) return v.length > 0;
      if (v instanceof Map || v instanceof Set) return v.size > 0;
      if (typeof v === "object") {
        const prototype = Object.getPrototypeOf(v);
        if (prototype === Object.prototype || prototype === null) {
          return Object.keys(v).length > 0;
        }
      }
      return true;
    },
    `${field}不能为空`,
  ),
  required: true,
});

export const integer = (field: string = "数值") =>
  createSpec(
    "blur",
    (v) =>
      isBlank(v) ||
      ((typeof v === "number" || typeof v === "string") &&
        REGEX_PATTERNS.INTEGER.test(String(v))),
    `${field}必须是整数`,
  );

export const positiveInteger = (field: string = "数值") =>
  createSpec(
    "blur",
    (v) =>
      isBlank(v) ||
      ((typeof v === "number" || typeof v === "string") &&
        REGEX_PATTERNS.POSITIVE_INTEGER.test(String(v))),
    `${field}必须是正整数`,
  );

export const number = (field: string = "数值") =>
  createSpec(
    "blur",
    (v) => {
      if (isBlank(v)) return true;
      if (typeof v !== "number" && typeof v !== "string") return false;
      return Number.isFinite(Number(v));
    },
    `${field}必须是数字`,
  );

export const positiveNumber = (field: string = "数值") =>
  createSpec(
    "blur",
    (v) => {
      if (isBlank(v)) return true;
      if (typeof v !== "number" && typeof v !== "string") return false;
      const num = Number(v);
      return Number.isFinite(num) && num > 0;
    },
    `${field}必须是正数`,
  );

export const boolean = (field: string = "选项") =>
  createSpec("blur", (v) => typeof v === "boolean", `${field}必须是布尔值`);

export const enumValue = <T>(
  field: string,
  allowedValues: readonly T[],
  message?: string,
) => {
  const values = [...allowedValues];
  return createSpec(
    "blur",
    (v) => isBlank(v) || values.includes(v as T),
    message || `${field}必须是: ${values.join("、")} 中的一个`,
  );
};

export const pattern = (field: string, pattern: RegExp, message?: string) => {
  const stablePattern = new RegExp(pattern.source, pattern.flags);

  return createSpec(
    "blur",
    (v) => {
      if (isBlank(v)) return true;
      stablePattern.lastIndex = 0;
      const isValid = stablePattern.test(String(v));
      stablePattern.lastIndex = 0;
      return isValid;
    },
    message || `${field}格式错误`,
  );
};

export { optional };

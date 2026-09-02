/**
 * 值验证规则（产出框架无关的 RuleSpec）
 */

import { createSpec, isBlank } from "../utils";

const parseDate = (value: any): Date | null => {
  if (
    !(value instanceof Date) &&
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

// ==================== 字符串验证 ====================

export const length = (field: string, min: number, max?: number) =>
  createSpec(
    "blur",
    (v) => {
      if (isBlank(v)) return true;
      const len = String(v).length;
      if (max !== undefined) return len >= min && len <= max;
      return len >= min;
    },
    max !== undefined
      ? `${field}长度需在${min}-${max}位之间`
      : `${field}长度至少${min}位`,
  );

export const minLength = (field: string, min: number) =>
  createSpec(
    "blur",
    (v) => isBlank(v) || String(v).length >= min,
    `${field}长度至少${min}位`,
  );

export const maxLength = (field: string, max: number) =>
  createSpec(
    "blur",
    (v) => isBlank(v) || String(v).length <= max,
    `${field}长度最多${max}位`,
  );

export const startsWith = (field: string, prefix: string) =>
  createSpec(
    "blur",
    (v) => isBlank(v) || String(v).startsWith(prefix),
    `${field}必须以"${prefix}"开头`,
  );

export const endsWith = (field: string, suffix: string) =>
  createSpec(
    "blur",
    (v) => isBlank(v) || String(v).endsWith(suffix),
    `${field}必须以"${suffix}"结尾`,
  );

export const includes = (field: string, substring: string) =>
  createSpec(
    "blur",
    (v) => isBlank(v) || String(v).includes(substring),
    `${field}必须包含"${substring}"`,
  );

// ==================== 数字验证 ====================

export const range = (field: string, min: number, max: number) =>
  createSpec(
    "blur",
    (v) => {
      if (isBlank(v)) return true;
      if (typeof v !== "number" && typeof v !== "string") return false;
      const num = Number(v);
      if (!Number.isFinite(num)) return false;
      return num >= min && num <= max;
    },
    `${field}必须在${min}-${max}之间`,
  );

export const min = (field: string, minValue: number) =>
  createSpec(
    "blur",
    (v) => {
      if (isBlank(v)) return true;
      if (typeof v !== "number" && typeof v !== "string") return false;
      const num = Number(v);
      return Number.isFinite(num) && num >= minValue;
    },
    `${field}不能小于${minValue}`,
  );

export const max = (field: string, maxValue: number) =>
  createSpec(
    "blur",
    (v) => {
      if (isBlank(v)) return true;
      if (typeof v !== "number" && typeof v !== "string") return false;
      const num = Number(v);
      return Number.isFinite(num) && num <= maxValue;
    },
    `${field}不能大于${maxValue}`,
  );

export const between = (field: string, min: number, max: number) =>
  createSpec(
    "blur",
    (v) => {
      if (isBlank(v)) return true;
      if (typeof v !== "number" && typeof v !== "string") return false;
      const num = Number(v);
      return Number.isFinite(num) && num > min && num < max;
    },
    `${field}必须在${min}和${max}之间（不含边界）`,
  );

// ==================== 数组验证 ====================

export const array = (
  field: string = "列表",
  minLen?: number,
  maxLen?: number,
) =>
  createSpec(
    "blur",
    (v) => {
      if (!Array.isArray(v)) return false;
      if (minLen !== undefined && v.length < minLen) return false;
      if (maxLen !== undefined && v.length > maxLen) return false;
      return true;
    },
    minLen !== undefined && maxLen !== undefined
      ? `${field}长度必须在${minLen}-${maxLen}之间`
      : minLen !== undefined
        ? `${field}至少需要${minLen}项`
        : maxLen !== undefined
          ? `${field}最多${maxLen}项`
          : `${field}必须是数组`,
  );

export const arrayMinLength = (field: string, min: number) =>
  createSpec(
    "blur",
    (v) => isBlank(v) || (Array.isArray(v) && v.length >= min),
    `${field}至少需要${min}项`,
  );

export const arrayMaxLength = (field: string, max: number) =>
  createSpec(
    "blur",
    (v) => isBlank(v) || (Array.isArray(v) && v.length <= max),
    `${field}最多${max}项`,
  );

export const arrayUnique = (field: string) =>
  createSpec(
    "blur",
    (v) => {
      if (isBlank(v)) return true;
      if (!Array.isArray(v)) return false;
      return new Set(v).size === v.length;
    },
    `${field}不能有重复项`,
  );

// ==================== 日期验证 ====================

export const date = (field: string = "日期") =>
  createSpec(
    "blur",
    (v) => {
      if (isBlank(v)) return true;
      return parseDate(v) !== null;
    },
    `${field}格式错误`,
  );

export const dateAfter = (
  field: string,
  compareDate: Date | (() => Date),
  message?: string,
) => {
  const staticCompare =
    typeof compareDate === "function" ? null : new Date(compareDate.getTime());
  return createSpec(
    "blur",
    (v) => {
      if (isBlank(v)) return true;
      const date = parseDate(v);
      const compare =
        typeof compareDate === "function" ? compareDate() : staticCompare!;
      return (
        date !== null && !Number.isNaN(compare.getTime()) && date > compare
      );
    },
    message ||
      `${field}必须晚于${typeof compareDate === "function" ? "指定日期" : compareDate.toLocaleDateString()}`,
  );
};

export const dateBefore = (
  field: string,
  compareDate: Date | (() => Date),
  message?: string,
) => {
  const staticCompare =
    typeof compareDate === "function" ? null : new Date(compareDate.getTime());
  return createSpec(
    "blur",
    (v) => {
      if (isBlank(v)) return true;
      const date = parseDate(v);
      const compare =
        typeof compareDate === "function" ? compareDate() : staticCompare!;
      return (
        date !== null && !Number.isNaN(compare.getTime()) && date < compare
      );
    },
    message ||
      `${field}必须早于${typeof compareDate === "function" ? "指定日期" : compareDate.toLocaleDateString()}`,
  );
};

export const dateRange = (field: string, startDate: Date, endDate: Date) => {
  const start = new Date(startDate.getTime());
  const end = new Date(endDate.getTime());
  return createSpec(
    "blur",
    (v) => {
      if (isBlank(v)) return true;
      const date = parseDate(v);
      return (
        date !== null &&
        !Number.isNaN(start.getTime()) &&
        !Number.isNaN(end.getTime()) &&
        date >= start &&
        date <= end
      );
    },
    `${field}必须在${startDate.toLocaleDateString()}至${endDate.toLocaleDateString()}之间`,
  );
};

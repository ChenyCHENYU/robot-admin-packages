/**
 * 值验证规则（产出框架无关的 RuleSpec）
 */

import { createSpec } from "../utils";

// ==================== 字符串验证 ====================

export const length = (field: string, min: number, max?: number) =>
  createSpec(
    "blur",
    (v) => {
      if (!v) return true;
      const len = String(v).length;
      if (max !== undefined) return len >= min && len <= max;
      return len >= min;
    },
    max ? `${field}长度需在${min}-${max}位之间` : `${field}长度至少${min}位`,
  );

export const minLength = (field: string, min: number) =>
  createSpec(
    "blur",
    (v) => !v || String(v).length >= min,
    `${field}长度至少${min}位`,
  );

export const maxLength = (field: string, max: number) =>
  createSpec(
    "blur",
    (v) => !v || String(v).length <= max,
    `${field}长度最多${max}位`,
  );

export const startsWith = (field: string, prefix: string) =>
  createSpec(
    "blur",
    (v) => !v || String(v).startsWith(prefix),
    `${field}必须以"${prefix}"开头`,
  );

export const endsWith = (field: string, suffix: string) =>
  createSpec(
    "blur",
    (v) => !v || String(v).endsWith(suffix),
    `${field}必须以"${suffix}"结尾`,
  );

export const includes = (field: string, substring: string) =>
  createSpec(
    "blur",
    (v) => !v || String(v).includes(substring),
    `${field}必须包含"${substring}"`,
  );

// ==================== 数字验证 ====================

export const range = (field: string, min: number, max: number) =>
  createSpec(
    "blur",
    (v) => {
      if (!v && v !== 0) return true;
      const num = Number(v);
      if (isNaN(num)) return false;
      return num >= min && num <= max;
    },
    `${field}必须在${min}-${max}之间`,
  );

export const min = (field: string, minValue: number) =>
  createSpec(
    "blur",
    (v) => {
      if (!v && v !== 0) return true;
      const num = Number(v);
      return !isNaN(num) && num >= minValue;
    },
    `${field}不能小于${minValue}`,
  );

export const max = (field: string, maxValue: number) =>
  createSpec(
    "blur",
    (v) => {
      if (!v && v !== 0) return true;
      const num = Number(v);
      return !isNaN(num) && num <= maxValue;
    },
    `${field}不能大于${maxValue}`,
  );

export const between = (field: string, min: number, max: number) =>
  createSpec(
    "blur",
    (v) => {
      if (!v && v !== 0) return true;
      const num = Number(v);
      return !isNaN(num) && num > min && num < max;
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
    (v) => !v || (Array.isArray(v) && v.length >= min),
    `${field}至少需要${min}项`,
  );

export const arrayMaxLength = (field: string, max: number) =>
  createSpec(
    "blur",
    (v) => !v || (Array.isArray(v) && v.length <= max),
    `${field}最多${max}项`,
  );

export const arrayUnique = (field: string) =>
  createSpec(
    "blur",
    (v) => {
      if (!v || !Array.isArray(v)) return true;
      return new Set(v).size === v.length;
    },
    `${field}不能有重复项`,
  );

// ==================== 日期验证 ====================

export const date = (field: string = "日期") =>
  createSpec(
    "blur",
    (v) => {
      if (!v) return true;
      const date = new Date(v);
      return date instanceof Date && !isNaN(date.getTime());
    },
    `${field}格式错误`,
  );

export const dateAfter = (
  field: string,
  compareDate: Date | (() => Date),
  message?: string,
) =>
  createSpec(
    "blur",
    (v) => {
      if (!v) return true;
      const date = new Date(v);
      const compare =
        typeof compareDate === "function" ? compareDate() : compareDate;
      return date > compare;
    },
    message ||
      `${field}必须晚于${typeof compareDate === "function" ? "指定日期" : compareDate.toLocaleDateString()}`,
  );

export const dateBefore = (
  field: string,
  compareDate: Date | (() => Date),
  message?: string,
) =>
  createSpec(
    "blur",
    (v) => {
      if (!v) return true;
      const date = new Date(v);
      const compare =
        typeof compareDate === "function" ? compareDate() : compareDate;
      return date < compare;
    },
    message ||
      `${field}必须早于${typeof compareDate === "function" ? "指定日期" : compareDate.toLocaleDateString()}`,
  );

export const dateRange = (field: string, startDate: Date, endDate: Date) =>
  createSpec(
    "blur",
    (v) => {
      if (!v) return true;
      const date = new Date(v);
      return date >= startDate && date <= endDate;
    },
    `${field}必须在${startDate.toLocaleDateString()}至${endDate.toLocaleDateString()}之间`,
  );

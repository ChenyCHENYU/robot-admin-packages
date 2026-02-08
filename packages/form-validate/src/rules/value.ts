/**
 * 值验证规则
 * 包含字符串、数字、数组、日期等值类型的验证规则
 */

import { createRule } from "../utils";

// ==================== 字符串验证 ====================

/**
 * 长度验证
 * @param field 字段名
 * @param min 最小长度
 * @param max 最大长度（可选）
 */
export const length = (field: string, min: number, max?: number) =>
  createRule(
    "blur",
    (v) => {
      if (!v) return true;
      const len = String(v).length;
      if (max !== undefined) {
        return len >= min && len <= max;
      }
      return len >= min;
    },
    max ? `${field}长度需在${min}-${max}位之间` : `${field}长度至少${min}位`,
  );

/**
 * 最小长度验证
 * @param field 字段名
 * @param min 最小长度
 */
export const minLength = (field: string, min: number) =>
  createRule(
    "blur",
    (v) => !v || String(v).length >= min,
    `${field}长度至少${min}位`,
  );

/**
 * 最大长度验证
 * @param field 字段名
 * @param max 最大长度
 */
export const maxLength = (field: string, max: number) =>
  createRule(
    "blur",
    (v) => !v || String(v).length <= max,
    `${field}长度最多${max}位`,
  );

/**
 * 以指定字符串开头
 * @param field 字段名
 * @param prefix 前缀字符串
 */
export const startsWith = (field: string, prefix: string) =>
  createRule(
    "blur",
    (v) => !v || String(v).startsWith(prefix),
    `${field}必须以"${prefix}"开头`,
  );

/**
 * 以指定字符串结尾
 * @param field 字段名
 * @param suffix 后缀字符串
 */
export const endsWith = (field: string, suffix: string) =>
  createRule(
    "blur",
    (v) => !v || String(v).endsWith(suffix),
    `${field}必须以"${suffix}"结尾`,
  );

/**
 * 包含指定字符串
 * @param field 字段名
 * @param substring 子字符串
 */
export const includes = (field: string, substring: string) =>
  createRule(
    "blur",
    (v) => !v || String(v).includes(substring),
    `${field}必须包含"${substring}"`,
  );

// ==================== 数字验证 ====================

/**
 * 数字范围验证（含边界）
 * @param field 字段名
 * @param min 最小值
 * @param max 最大值
 */
export const range = (field: string, min: number, max: number) =>
  createRule(
    "blur",
    (v) => {
      if (!v && v !== 0) return true;
      const num = Number(v);
      if (isNaN(num)) return false;
      return num >= min && num <= max;
    },
    `${field}必须在${min}-${max}之间`,
  );

/**
 * 最小值验证
 * @param field 字段名
 * @param minValue 最小值
 */
export const min = (field: string, minValue: number) =>
  createRule(
    "blur",
    (v) => {
      if (!v && v !== 0) return true;
      const num = Number(v);
      return !isNaN(num) && num >= minValue;
    },
    `${field}不能小于${minValue}`,
  );

/**
 * 最大值验证
 * @param field 字段名
 * @param maxValue 最大值
 */
export const max = (field: string, maxValue: number) =>
  createRule(
    "blur",
    (v) => {
      if (!v && v !== 0) return true;
      const num = Number(v);
      return !isNaN(num) && num <= maxValue;
    },
    `${field}不能大于${maxValue}`,
  );

/**
 * 区间验证（不含边界）
 * @param field 字段名
 * @param min 最小值
 * @param max 最大值
 */
export const between = (field: string, min: number, max: number) =>
  createRule(
    "blur",
    (v) => {
      if (!v && v !== 0) return true;
      const num = Number(v);
      return !isNaN(num) && num > min && num < max;
    },
    `${field}必须在${min}和${max}之间（不含边界）`,
  );

// ==================== 数组验证 ====================

/**
 * 数组验证
 * @param field 字段名
 * @param minLen 最小长度（可选）
 * @param maxLen 最大长度（可选）
 */
export const array = (
  field: string = "列表",
  minLen?: number,
  maxLen?: number,
) =>
  createRule(
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

/**
 * 数组最小长度
 * @param field 字段名
 * @param min 最小长度
 */
export const arrayMinLength = (field: string, min: number) =>
  createRule(
    "blur",
    (v) => !v || (Array.isArray(v) && v.length >= min),
    `${field}至少需要${min}项`,
  );

/**
 * 数组最大长度
 * @param field 字段名
 * @param max 最大长度
 */
export const arrayMaxLength = (field: string, max: number) =>
  createRule(
    "blur",
    (v) => !v || (Array.isArray(v) && v.length <= max),
    `${field}最多${max}项`,
  );

/**
 * 数组元素唯一性验证
 * @param field 字段名
 */
export const arrayUnique = (field: string) =>
  createRule(
    "blur",
    (v) => {
      if (!v || !Array.isArray(v)) return true;
      return new Set(v).size === v.length;
    },
    `${field}不能有重复项`,
  );

// ==================== 日期验证 ====================

/**
 * 日期验证
 * @param field 字段名
 */
export const date = (field: string = "日期") =>
  createRule(
    "blur",
    (v) => {
      if (!v) return true;
      const date = new Date(v);
      return date instanceof Date && !isNaN(date.getTime());
    },
    `${field}格式错误`,
  );

/**
 * 日期晚于指定日期
 * @param field 字段名
 * @param compareDate 比较日期或获取日期的函数
 * @param message 自定义错误消息
 */
export const dateAfter = (
  field: string,
  compareDate: Date | (() => Date),
  message?: string,
) =>
  createRule(
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

/**
 * 日期早于指定日期
 * @param field 字段名
 * @param compareDate 比较日期或获取日期的函数
 * @param message 自定义错误消息
 */
export const dateBefore = (
  field: string,
  compareDate: Date | (() => Date),
  message?: string,
) =>
  createRule(
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

/**
 * 日期范围验证
 * @param field 字段名
 * @param startDate 开始日期
 * @param endDate 结束日期
 */
export const dateRange = (field: string, startDate: Date, endDate: Date) =>
  createRule(
    "blur",
    (v) => {
      if (!v) return true;
      const date = new Date(v);
      return date >= startDate && date <= endDate;
    },
    `${field}必须在${startDate.toLocaleDateString()}至${endDate.toLocaleDateString()}之间`,
  );

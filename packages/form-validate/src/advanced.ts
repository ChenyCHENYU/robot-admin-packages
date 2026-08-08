/**
 * 高级验证功能
 *
 * 三层 API：
 * 1. 框架无关核心（when/compareWith/debouncedAsyncCheck/some/every）—— 产 RuleSpec，零重复逻辑
 * 2. naive 向后兼容（when/compareWith/debouncedAsyncCheck/some/every）—— 返回 NaiveRule
 * 3. element 版（whenElement/...）—— 返回 ElementRule
 *
 * naive / element 版全部基于核心 RuleSpec + 适配器包装，无逻辑重复。
 */

import {
  createSpec,
  debounce,
  mergeTriggers,
} from "./utils";
import { runSpec, toElementRule, toNaiveRule } from "./adapter";
import type { ElementRule, NaiveRule, RuleSpec, Trigger, ValidateResult } from "./types";

// ==================== 框架无关核心 ====================

/**
 * 条件验证（RuleSpec）
 */
export const whenSpec = (
  getDependencyValue: () => any,
  condition: (value: any) => boolean,
  thenRules: RuleSpec[],
  elseRules: RuleSpec[] = [],
): RuleSpec => ({
  trigger: mergeTriggers([...thenRules, ...elseRules]),
  message: thenRules[0]?.message ?? "校验不通过",
  validate: async (value): Promise<ValidateResult> => {
    const depValue = getDependencyValue();
    const rules = condition(depValue) ? thenRules : elseRules;
    for (const rule of rules) {
      const r = await runSpec(rule, value);
      if (!r.ok) return r.message;
    }
    return true;
  },
});

/**
 * 跨字段比较验证（RuleSpec）
 */
export const compareWithSpec = (
  field: string,
  getCompareValue: () => any,
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "ne",
  message?: string,
): RuleSpec => {
  const operators = {
    gt: (a: number, b: number) => a > b,
    gte: (a: number, b: number) => a >= b,
    lt: (a: number, b: number) => a < b,
    lte: (a: number, b: number) => a <= b,
    eq: (a: any, b: any) => a === b,
    ne: (a: any, b: any) => a !== b,
  };
  const operatorLabels = {
    gt: "大于", gte: "不小于", lt: "小于", lte: "不大于", eq: "等于", ne: "不等于",
  };
  return createSpec(
    "blur",
    (v) => !v || operators[operator](v, getCompareValue()),
    message || `${field}必须${operatorLabels[operator]}比较值`,
  );
};

/**
 * 防抖异步验证（RuleSpec）
 */
export const debouncedAsyncCheckSpec = (
  field: string,
  asyncFn: (v: any) => Promise<boolean>,
  delay: number = 500,
  message?: string,
): RuleSpec => {
  const debouncedFn = debounce(asyncFn, delay);
  return {
    trigger: "input",
    message: message || `${field}验证失败`,
    validate: async (value): Promise<ValidateResult> => {
      if (!value) return true;
      const isValid = await debouncedFn(value);
      return isValid;
    },
  };
};

/**
 * 规则 OR 组合（RuleSpec）
 */
export const someSpec = (
  rules: RuleSpec[],
  message: string = "至少满足一个条件",
): RuleSpec => ({
  trigger: mergeTriggers(rules),
  message,
  validate: async (value): Promise<ValidateResult> => {
    for (const rule of rules) {
      const r = await runSpec(rule, value);
      if (r.ok) return true;
    }
    return false;
  },
});

/**
 * 规则 AND 组合（RuleSpec）
 */
export const everySpec = (rules: RuleSpec[]): RuleSpec => ({
  trigger: mergeTriggers(rules),
  message: rules[0]?.message ?? "校验不通过",
  validate: async (value): Promise<ValidateResult> => {
    for (const rule of rules) {
      const r = await runSpec(rule, value);
      if (!r.ok) return r.message;
    }
    return true;
  },
});

// ==================== naive 版（向后兼容，返回 NaiveRule） ====================

export const when = (
  getDependencyValue: () => any,
  condition: (value: any) => boolean,
  thenRules: RuleSpec[],
  elseRules: RuleSpec[] = [],
): NaiveRule =>
  toNaiveRule(whenSpec(getDependencyValue, condition, thenRules, elseRules));

export const compareWith = (
  field: string,
  getCompareValue: () => any,
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "ne",
  message?: string,
): NaiveRule => toNaiveRule(compareWithSpec(field, getCompareValue, operator, message));

export const debouncedAsyncCheck = (
  field: string,
  asyncFn: (v: any) => Promise<boolean>,
  delay: number = 500,
  message?: string,
): NaiveRule => toNaiveRule(debouncedAsyncCheckSpec(field, asyncFn, delay, message));

export const some = (
  rules: RuleSpec[],
  message: string = "至少满足一个条件",
): NaiveRule => toNaiveRule(someSpec(rules, message));

export const every = (rules: RuleSpec[]): NaiveRule => toNaiveRule(everySpec(rules));

// ==================== element 版（返回 ElementRule） ====================

export const whenElement = (
  getDependencyValue: () => any,
  condition: (value: any) => boolean,
  thenRules: RuleSpec[],
  elseRules: RuleSpec[] = [],
): ElementRule =>
  toElementRule(whenSpec(getDependencyValue, condition, thenRules, elseRules));

export const compareWithElement = (
  field: string,
  getCompareValue: () => any,
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "ne",
  message?: string,
): ElementRule =>
  toElementRule(compareWithSpec(field, getCompareValue, operator, message));

export const debouncedAsyncCheckElement = (
  field: string,
  asyncFn: (v: any) => Promise<boolean>,
  delay: number = 500,
  message?: string,
): ElementRule =>
  toElementRule(debouncedAsyncCheckSpec(field, asyncFn, delay, message));

export const someElement = (
  rules: RuleSpec[],
  message: string = "至少满足一个条件",
): ElementRule => toElementRule(someSpec(rules, message));

export const everyElement = (rules: RuleSpec[]): ElementRule =>
  toElementRule(everySpec(rules));

export type { Trigger };

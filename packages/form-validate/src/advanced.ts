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

import { createSpec, debounce, isBlank, mergeTriggers } from "./utils";
import { runSpec, toElementRule, toNaiveRule } from "./adapter";
import type {
  ElementRule,
  NaiveRule,
  NativeNaiveRule,
  RuleSpec,
  Trigger,
  ValidateResult,
} from "./types";

type NaiveComposableRule = RuleSpec | NativeNaiveRule;
type ElementComposableRule = RuleSpec | ElementRule;

const snapshotSpecs = (rules: readonly RuleSpec[]): RuleSpec[] =>
  rules.map((rule) => ({
    trigger: Array.isArray(rule.trigger) ? [...rule.trigger] : rule.trigger,
    validate: rule.validate,
    message: rule.message,
    ...(rule.required === undefined ? {} : { required: rule.required }),
  }));

const isRuleSpec = (
  rule: NaiveComposableRule | ElementComposableRule,
): rule is RuleSpec => typeof (rule as RuleSpec).validate === "function";

const errorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
};

const isCoreTrigger = (trigger: string): trigger is Trigger =>
  trigger === "blur" || trigger === "input" || trigger === "change";

const toNaiveSpec = (rule: NaiveComposableRule): RuleSpec => {
  if (isRuleSpec(rule)) return rule;

  const source: NativeNaiveRule = {
    ...rule,
    trigger: Array.isArray(rule.trigger) ? [...rule.trigger] : rule.trigger,
  };
  const validator = source.asyncValidator ?? source.validator;
  if (!validator || validator.length >= 3) {
    throw new TypeError(
      "Naive 原生组合规则必须提供仅使用 rule、value 的自定义 validator 或 asyncValidator；不支持 callback、source/options，声明式约束请使用规则数组或 SPEC_RULES",
    );
  }
  const declarativeKeys = [
    "type",
    "min",
    "max",
    "len",
    "enum",
    "pattern",
    "fields",
    "defaultField",
    "transform",
    "whitespace",
  ];
  if (declarativeKeys.some((key) => source[key] !== undefined)) {
    throw new TypeError(
      "Naive 组合器不解释声明式约束；请使用规则数组或 SPEC_RULES",
    );
  }
  if (source.level === "warning") {
    throw new TypeError(
      "Naive 原生组合仅支持 error 级别；warning 规则请保留框架原生规则数组",
    );
  }
  const triggers =
    source.trigger === undefined
      ? ["blur", "input"]
      : Array.isArray(source.trigger)
        ? [...source.trigger]
        : [source.trigger];
  if (!triggers.every(isCoreTrigger)) {
    throw new TypeError("Naive 组合规则的 trigger 仅支持 blur、input、change");
  }
  const message =
    typeof source.message === "function"
      ? source.message()
      : (source.message ?? "校验不通过");
  return {
    trigger: triggers,
    message,
    ...(source.required === undefined ? {} : { required: source.required }),
    validate: (value): Promise<ValidateResult> =>
      new Promise((resolve) => {
        const unsupportedCallback =
          "Naive 组合器不支持 callback 或同步 undefined；请返回 true 或 Promise<void>";
        // Reject callback completion, including hidden default/rest parameters.
        // Resolving the same Promise again is harmless for a late callback.
        const rejectCallback = () => resolve(unsupportedCallback);
        const resultOf = (result: unknown): ValidateResult => {
          if (result === true) return true;
          if (result === false) return message;
          if (result instanceof Error || Array.isArray(result)) {
            if (Array.isArray(result) && result.length === 0) return true;
            return errorMessage(
              Array.isArray(result) ? result[0] : result,
              message,
            );
          }
          return result === undefined
            ? unsupportedCallback
            : "Naive 自定义 validator 返回了不支持的结果";
        };
        try {
          const result = validator.call(source, source, value, rejectCallback);
          if (
            result &&
            typeof (result as PromiseLike<unknown>).then === "function"
          ) {
            void Promise.resolve(result).then(
              () => resolve(true),
              (error) => resolve(errorMessage(error, message)),
            );
          } else {
            resolve(resultOf(result));
          }
        } catch (error) {
          resolve(errorMessage(error, message));
        }
      }),
  };
};

const toElementSpec = (rule: ElementComposableRule): RuleSpec => {
  if (isRuleSpec(rule)) return rule;

  const message = rule.message ?? "校验不通过";
  return {
    trigger: rule.trigger ?? ["blur", "change"],
    message,
    ...(rule.required === undefined ? {} : { required: rule.required }),
    validate: (value) =>
      new Promise<ValidateResult>((resolve) => {
        const done = (error?: Error | string) =>
          resolve(error === undefined ? true : errorMessage(error, message));

        try {
          if (rule.asyncValidator) {
            void rule.asyncValidator(rule, value).then(
              () => done(),
              (error) => done(errorMessage(error, message)),
            );
            return;
          }

          if (rule.validator) {
            rule.validator(rule, value, done);
            return;
          }

          done();
        } catch (error) {
          done(errorMessage(error, message));
        }
      }),
  };
};

// ==================== 框架无关核心 ====================

/**
 * 条件验证（RuleSpec）
 */
export const whenSpec = (
  getDependencyValue: () => any,
  condition: (value: any) => boolean,
  thenRules: readonly RuleSpec[],
  elseRules: readonly RuleSpec[] = [],
): RuleSpec => {
  const thenSources = snapshotSpecs(thenRules);
  const elseSources = snapshotSpecs(elseRules);

  return {
    trigger: mergeTriggers([...thenSources, ...elseSources]),
    message: thenSources[0]?.message ?? "校验不通过",
    validate: async (value): Promise<ValidateResult> => {
      const depValue = getDependencyValue();
      const rules = condition(depValue) ? thenSources : elseSources;
      for (const rule of rules) {
        const r = await runSpec(rule, value);
        if (!r.ok) return r.message;
      }
      return true;
    },
  };
};

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
    gt: "大于",
    gte: "不小于",
    lt: "小于",
    lte: "不大于",
    eq: "等于",
    ne: "不等于",
  };
  return createSpec(
    "blur",
    (v) => isBlank(v) || operators[operator](v, getCompareValue()),
    message || `${field}必须${operatorLabels[operator]}比较值`,
  );
};

/**
 * 防抖异步验证（RuleSpec）
 */
export const debouncedAsyncCheckSpec = (
  field: string,
  asyncFn: (v: any) => Promise<ValidateResult>,
  delay: number = 500,
  message?: string,
): RuleSpec => {
  const debouncedFn = debounce(asyncFn, delay);
  return {
    trigger: "input",
    message: message || `${field}验证失败`,
    validate: async (value): Promise<ValidateResult> => {
      if (isBlank(value)) return true;
      return debouncedFn(value);
    },
  };
};

/**
 * 规则 OR 组合（RuleSpec）
 */
export const someSpec = (
  rules: readonly RuleSpec[],
  message: string = "至少满足一个条件",
): RuleSpec => {
  const sources = snapshotSpecs(rules);
  return {
    trigger: mergeTriggers(sources),
    message,
    required:
      sources.length > 0 && sources.every((rule) => rule.required === true),
    validate: async (value): Promise<ValidateResult> => {
      for (const rule of sources) {
        const r = await runSpec(rule, value);
        if (r.ok) return true;
      }
      return false;
    },
  };
};

/**
 * 规则 AND 组合（RuleSpec）
 */
export const everySpec = (rules: readonly RuleSpec[]): RuleSpec => {
  const sources = snapshotSpecs(rules);
  return {
    trigger: mergeTriggers(sources),
    message: sources[0]?.message ?? "校验不通过",
    required: sources.some((rule) => rule.required === true),
    validate: async (value): Promise<ValidateResult> => {
      for (const rule of sources) {
        const r = await runSpec(rule, value);
        if (!r.ok) return r.message;
      }
      return true;
    },
  };
};

// ==================== naive 版（向后兼容，返回 NaiveRule） ====================

export const when = (
  getDependencyValue: () => any,
  condition: (value: any) => boolean,
  thenRules: readonly NaiveComposableRule[],
  elseRules: readonly NaiveComposableRule[] = [],
): NaiveRule =>
  toNaiveRule(
    whenSpec(
      getDependencyValue,
      condition,
      thenRules.map(toNaiveSpec),
      elseRules.map(toNaiveSpec),
    ),
  );

export const compareWith = (
  field: string,
  getCompareValue: () => any,
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "ne",
  message?: string,
): NaiveRule =>
  toNaiveRule(compareWithSpec(field, getCompareValue, operator, message));

export const debouncedAsyncCheck = (
  field: string,
  asyncFn: (v: any) => Promise<ValidateResult>,
  delay: number = 500,
  message?: string,
): NaiveRule =>
  toNaiveRule(debouncedAsyncCheckSpec(field, asyncFn, delay, message));

export const some = (
  rules: readonly NaiveComposableRule[],
  message: string = "至少满足一个条件",
): NaiveRule => toNaiveRule(someSpec(rules.map(toNaiveSpec), message));

export const every = (rules: readonly NaiveComposableRule[]): NaiveRule =>
  toNaiveRule(everySpec(rules.map(toNaiveSpec)));

// ==================== element 版（返回 ElementRule） ====================

export const whenElement = (
  getDependencyValue: () => any,
  condition: (value: any) => boolean,
  thenRules: readonly ElementComposableRule[],
  elseRules: readonly ElementComposableRule[] = [],
): ElementRule =>
  toElementRule(
    whenSpec(
      getDependencyValue,
      condition,
      thenRules.map(toElementSpec),
      elseRules.map(toElementSpec),
    ),
  );

export const compareWithElement = (
  field: string,
  getCompareValue: () => any,
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "ne",
  message?: string,
): ElementRule =>
  toElementRule(compareWithSpec(field, getCompareValue, operator, message));

export const debouncedAsyncCheckElement = (
  field: string,
  asyncFn: (v: any) => Promise<ValidateResult>,
  delay: number = 500,
  message?: string,
): ElementRule =>
  toElementRule(debouncedAsyncCheckSpec(field, asyncFn, delay, message));

export const someElement = (
  rules: readonly ElementComposableRule[],
  message: string = "至少满足一个条件",
): ElementRule => toElementRule(someSpec(rules.map(toElementSpec), message));

export const everyElement = (
  rules: readonly ElementComposableRule[],
): ElementRule => toElementRule(everySpec(rules.map(toElementSpec)));

export type { Trigger };

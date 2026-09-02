/**
 * 工具函数模块
 *
 * 框架无关核心：createSpec / optional / transform / mergeRules / mergeTriggers / isBlank / debounce
 * 向后兼容：createRule / createAsyncRule / customRule / customAsyncRule（返回 NaiveRule）
 */

import type { NaiveRule, RuleSpec, Trigger, ValidateResult } from "./types";
import { toNaiveRule } from "./adapter";

const cloneTrigger = (trigger: Trigger | Trigger[]): Trigger | Trigger[] =>
  Array.isArray(trigger) ? [...trigger] : trigger;

const snapshotSpec = (spec: RuleSpec): RuleSpec => ({
  trigger: cloneTrigger(spec.trigger),
  validate: spec.validate,
  message: spec.message,
  ...(spec.required === undefined ? {} : { required: spec.required }),
});

type DebouncePending<TResult> = {
  resolve: (value: TResult) => void;
  reject: (reason?: unknown) => void;
};

/**
 * Promise 防抖函数。
 *
 * 同一等待窗口内的调用会合并为最后一次执行，所有调用方都会收到该次执行的
 * 结果或异常，避免被取消调用的 Promise 永久处于 pending 状态。
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let latestArgs: Parameters<T> | null = null;
  let pending: DebouncePending<Awaited<ReturnType<T>>>[] = [];
  const normalizedDelay = Number.isFinite(delay) ? Math.max(0, delay) : 0;

  return (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    latestArgs = args;

    return new Promise((resolve, reject) => {
      pending.push({ resolve, reject });
      if (timeoutId !== null) clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        timeoutId = null;
        const batch = pending;
        const callArgs = latestArgs;
        pending = [];
        latestArgs = null;

        if (!callArgs) return;

        void Promise.resolve()
          .then(() => func(...callArgs))
          .then(
            (result) => batch.forEach(({ resolve }) => resolve(result)),
            (error) => batch.forEach(({ reject }) => reject(error)),
          );
      }, normalizedDelay);
    });
  };
}

/**
 * 错误消息模板引擎
 * @example
 * createMessageTemplate('{field}长度需在{min}-{max}位之间', { field: '用户名', min: 3, max: 20 })
 */
export const createMessageTemplate = (
  template: string,
  params: Record<string, any>,
): string => {
  return template.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? "");
};

/**
 * 值为空判断（null / undefined / 空字符串 / 纯空格）
 */
export const isBlank = (v: any): boolean => {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  return false;
};

/**
 * 创建框架无关的同步验证规则（RuleSpec）
 */
export function createSpec(
  trigger: Trigger | Trigger[] = "blur",
  validateFn: (v: any) => ValidateResult,
  message: string,
): RuleSpec {
  return { trigger: cloneTrigger(trigger), validate: validateFn, message };
}

/**
 * 创建框架无关的异步验证规则（RuleSpec）
 */
export function createAsyncSpec(
  trigger: Trigger | Trigger[] = "blur",
  validateFn: (v: any) => Promise<ValidateResult>,
  message: string,
): RuleSpec {
  return { trigger: cloneTrigger(trigger), validate: validateFn, message };
}

/**
 * 合并多条规则的 trigger 并集
 */
export const mergeTriggers = (
  specs: readonly RuleSpec[],
): Trigger | Trigger[] => {
  if (!specs.length) return ["blur", "input"];
  const set = new Set<Trigger>();
  for (const spec of specs) {
    const t = spec.trigger;
    if (Array.isArray(t)) t.forEach((x) => set.add(x));
    else set.add(t);
  }
  const arr = [...set];
  return arr.length === 1 ? arr[0] : arr;
};

const mergeNaiveTriggers = (
  rules: readonly NaiveRule[],
): NaiveRule["trigger"] => {
  const triggers = new Set<Trigger>();

  for (const rule of rules) {
    const ruleTriggers = rule.trigger;
    if (Array.isArray(ruleTriggers)) {
      ruleTriggers.forEach((trigger) => triggers.add(trigger));
    } else if (ruleTriggers) {
      triggers.add(ruleTriggers);
    }
  }

  if (triggers.size === 0) return ["blur", "input"];
  const merged = [...triggers];
  return merged.length === 1 ? merged[0] : merged;
};

/**
 * 把一条规则包装为「非必填」语义：值为空时直接放行，不执行内部校验。
 * @example optional(PRESET_RULES.mobile('手机号'))
 */
export function optional(spec: RuleSpec): RuleSpec {
  const source = snapshotSpec(spec);
  return {
    trigger: source.trigger,
    message: source.message,
    required: false,
    validate: (value): ValidateResult | Promise<ValidateResult> => {
      if (isBlank(value)) return true;
      return source.validate(value);
    },
  };
}

/**
 * 验证前转换值（如 trim / 大小写）
 * @example transform(v => v?.trim(), createSpec(...))
 */
export const transform = (
  transformFn: (v: any) => any,
  spec: RuleSpec,
): RuleSpec => {
  const source = snapshotSpec(spec);
  return {
    trigger: source.trigger,
    message: source.message,
    ...(source.required === undefined ? {} : { required: source.required }),
    validate: (value) => source.validate(transformFn(value)),
  };
};

/**
 * 合并多条规则为串行验证，只显示第一个未通过的提示（RuleSpec 层）。
 */
export function mergeSpecs(specs: readonly RuleSpec[]): RuleSpec[] {
  const sources = specs.map(snapshotSpec);
  if (sources.length <= 1) return sources;
  return [
    {
      trigger: mergeTriggers(sources),
      message: sources[0]?.message ?? "校验不通过",
      required: sources.some((spec) => spec.required === true),
      validate: async (value): Promise<ValidateResult> => {
        for (const spec of sources) {
          const result = await spec.validate(value);
          if (result !== true) {
            return typeof result === "string" ? result : spec.message;
          }
        }
        return true;
      },
    },
  ];
}

// ==================== 向后兼容：返回 NaiveRule 的生成器 ====================

/**
 * 创建同步验证规则（返回 NaiveRule，向后兼容）。
 * 内部基于 createSpec + toNaiveRule，行为与历史版本完全一致。
 */
export function createRule(
  trigger: NaiveRule["trigger"] = "blur",
  validateFn: (v: any) => ValidateResult,
  message: string,
): NaiveRule {
  return toNaiveRule(createSpec(trigger, validateFn, message));
}

/**
 * 创建异步验证规则（返回 NaiveRule，向后兼容）
 */
export function createAsyncRule(
  trigger: NaiveRule["trigger"] = "blur",
  validateFn: (v: any) => Promise<ValidateResult>,
  message: string,
): NaiveRule {
  return toNaiveRule(createAsyncSpec(trigger, validateFn, message));
}

/**
 * 自定义同步规则构造器（返回 NaiveRule）
 */
export const customRule = (
  validateFn: (v: any) => ValidateResult,
  message: string,
  trigger: NaiveRule["trigger"] = "blur",
) => createRule(trigger, validateFn, message);

/**
 * 自定义异步规则构造器（返回 NaiveRule）
 */
export const customAsyncRule = (
  validateFn: (v: any) => Promise<ValidateResult>,
  message: string,
  trigger: NaiveRule["trigger"] = "blur",
) => createAsyncRule(trigger, validateFn, message);

/**
 * 合并多条 NaiveRule 为串行验证（向后兼容，操作 NaiveRule）。
 */
export function mergeRules(rules: readonly NaiveRule[]): NaiveRule[] {
  const sources = rules.map((rule) => ({
    ...rule,
    trigger: Array.isArray(rule.trigger) ? [...rule.trigger] : rule.trigger,
  }));
  if (sources.length <= 1) return sources;
  return [
    {
      trigger: mergeNaiveTriggers(sources),
      required: sources.some((rule) => rule.required === true),
      validator: async (_, value) => {
        for (const rule of sources) {
          if (!rule.validator) continue;
          // eslint-disable-next-line no-await-in-loop
          await rule.validator(rule, value);
        }
      },
    },
  ];
}

/**
 * @deprecated 请使用 mergeRules 代替
 */
export const _mergeRules = mergeRules;

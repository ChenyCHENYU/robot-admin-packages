/**
 * 工具函数模块
 *
 * 框架无关核心：createSpec / optional / transform / mergeRules / mergeTriggers / isBlank / debounce
 * 向后兼容：createRule / createAsyncRule / customRule / customAsyncRule（返回 NaiveRule）
 */

import type { NaiveRule, RuleSpec, Trigger, ValidateResult } from "./types";
import { toNaiveRule } from "./adapter";

/**
 * 简易防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return new Promise((resolve) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        resolve(func(...args));
      }, delay);
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
  validateFn: (v: any) => boolean,
  message: string,
): RuleSpec {
  return { trigger, validate: validateFn, message };
}

/**
 * 创建框架无关的异步验证规则（RuleSpec）
 */
export function createAsyncSpec(
  trigger: Trigger | Trigger[] = "blur",
  validateFn: (v: any) => Promise<boolean>,
  message: string,
): RuleSpec {
  return { trigger, validate: validateFn, message };
}

/**
 * 合并多条规则的 trigger 并集
 */
export const mergeTriggers = (specs: RuleSpec[]): Trigger | Trigger[] => {
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

/**
 * 把一条规则包装为「非必填」语义：值为空时直接放行，不执行内部校验。
 * @example optional(PRESET_RULES.mobile('手机号'))
 */
export function optional(spec: RuleSpec): RuleSpec {
  const inner = spec.validate;
  return {
    trigger: spec.trigger,
    message: spec.message,
    validate: (value): ValidateResult | Promise<ValidateResult> => {
      if (isBlank(value)) return true;
      return inner(value);
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
  return {
    trigger: spec.trigger,
    message: spec.message,
    validate: (value) => spec.validate(transformFn(value)),
  };
};

/**
 * 合并多条规则为串行验证，只显示第一个未通过的提示（RuleSpec 层）。
 */
export function mergeSpecs(specs: RuleSpec[]): RuleSpec[] {
  if (specs.length <= 1) return specs;
  return [
    {
      trigger: mergeTriggers(specs),
      message: specs[0]?.message ?? "校验不通过",
      validate: async (value): Promise<ValidateResult> => {
        for (const spec of specs) {
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
  validateFn: (v: any) => boolean,
  message: string,
): NaiveRule {
  return toNaiveRule(createSpec(trigger as any, validateFn, message));
}

/**
 * 创建异步验证规则（返回 NaiveRule，向后兼容）
 */
export function createAsyncRule(
  trigger: NaiveRule["trigger"] = "blur",
  validateFn: (v: any) => Promise<boolean>,
  message: string,
): NaiveRule {
  return toNaiveRule(createAsyncSpec(trigger as any, validateFn, message));
}

/**
 * 自定义同步规则构造器（返回 NaiveRule）
 */
export const customRule = (
  validateFn: (v: any) => boolean,
  message: string,
  trigger: NaiveRule["trigger"] = "blur",
) => createRule(trigger, validateFn, message);

/**
 * 自定义异步规则构造器（返回 NaiveRule）
 */
export const customAsyncRule = (
  validateFn: (v: any) => Promise<boolean>,
  message: string,
  trigger: NaiveRule["trigger"] = "blur",
) => createAsyncRule(trigger, validateFn, message);

/**
 * 合并多条 NaiveRule 为串行验证（向后兼容，操作 NaiveRule）。
 */
export function mergeRules(rules: NaiveRule[]): NaiveRule[] {
  if (rules.length <= 1) return rules;
  return [
    {
      trigger: ["blur", "input"],
      validator: async (_, value) => {
        for (const rule of rules) {
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

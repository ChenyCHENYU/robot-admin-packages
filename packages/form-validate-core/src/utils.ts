/**
 * 工具函数模块
 * 提供核心生成器和辅助工具（框架无关，产出 RuleSpec）
 */

import type { RuleSpec, Trigger, ValidateResult } from "./types";

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
 * @param template 模板字符串，使用 {key} 作为占位符
 * @param params 参数对象
 *
 * @example
 * createMessageTemplate('{field}长度需在{min}-{max}位之间', { field: '用户名', min: 3, max: 20 })
 * // => '用户名长度需在3-20位之间'
 */
export const createMessageTemplate = (
  template: string,
  params: Record<string, any>,
): string => {
  return template.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? "");
};

/**
 * 创建同步验证规则（产出框架无关的 RuleSpec）
 * @param trigger 触发方式
 * @param validateFn 验证函数，返回 true 表示通过
 * @param message 错误消息
 */
export function createRule(
  trigger: Trigger | Trigger[] = "blur",
  validateFn: (v: any) => boolean,
  message: string,
): RuleSpec {
  return {
    trigger,
    validate: validateFn,
    message,
  };
}

/**
 * 创建异步验证规则（产出框架无关的 RuleSpec）
 * @param trigger 触发方式
 * @param validateFn 异步验证函数，返回 Promise<boolean>
 * @param message 错误消息
 */
export function createAsyncRule(
  trigger: Trigger | Trigger[] = "blur",
  validateFn: (v: any) => Promise<boolean>,
  message: string,
): RuleSpec {
  return {
    trigger,
    validate: validateFn,
    message,
  };
}

/**
 * 自定义同步规则构造器
 * @param validateFn 验证函数
 * @param message 错误消息
 * @param trigger 触发方式
 */
export const customRule = (
  validateFn: (v: any) => boolean,
  message: string,
  trigger: Trigger | Trigger[] = "blur",
) => createRule(trigger, validateFn, message);

/**
 * 自定义异步规则构造器
 * @param validateFn 异步验证函数
 * @param message 错误消息
 * @param trigger 触发方式
 */
export const customAsyncRule = (
  validateFn: (v: any) => Promise<boolean>,
  message: string,
  trigger: Trigger | Trigger[] = "blur",
) => createAsyncRule(trigger, validateFn, message);

/**
 * 值为空判断（null / undefined / 空字符串 / 纯空格）
 */
export const isBlank = (v: any): boolean => {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  return false;
};

/**
 * 把一条规则包装为「非必填」语义：值为空时直接放行，不执行内部校验。
 *
 * 适用场景：手机号、邮箱、固定位数等格式校验，但字段本身可不填。
 *
 * @example
 * optional(PRESET_RULES.mobile('手机号'))
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
 * 验证前转换值（如 trim / 大小写转换）
 * @param transformFn 转换函数
 * @param spec 原始规则
 *
 * @example
 * transform(v => v?.trim(), PRESET_RULES.username('用户名'))
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
 * 合并多条规则为串行验证，只显示第一个未通过的提示。
 * 返回单条 RuleSpec，其 trigger 取所有规则的并集。
 */
export function mergeRules(specs: RuleSpec[]): RuleSpec[] {
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

export const mergeTriggers = (specs: RuleSpec[]): Trigger | Trigger[] => {
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
 * @deprecated 请使用 mergeRules 代替
 */
export const _mergeRules = mergeRules;

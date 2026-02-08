/**
 * 工具函数模块
 * 提供核心生成器和辅助工具
 */

import type { FormItemRule } from "naive-ui/es/form";

/**
 * 扩展的表单验证规则类型
 */
export type FieldRule = Omit<FormItemRule, "validator"> & {
  validator: NonNullable<FormItemRule["validator"]>;
};

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
 * 创建同步验证规则
 * @param trigger 触发方式
 * @param validateFn 验证函数，返回 true 表示通过
 * @param message 错误消息
 */
export function createRule(
  trigger: FieldRule["trigger"] = "blur",
  validateFn: (v: any) => boolean,
  message: string,
): FieldRule {
  return {
    trigger,
    validator: async (_: any, value: any) => {
      if (!validateFn(value)) throw new Error(message);
    },
    message,
  };
}

/**
 * 创建异步验证规则
 * @param trigger 触发方式
 * @param validateFn 异步验证函数，返回 Promise<boolean>
 * @param message 错误消息
 */
export function createAsyncRule(
  trigger: FieldRule["trigger"] = "blur",
  validateFn: (v: any) => Promise<boolean>,
  message: string,
): FieldRule {
  return {
    trigger,
    validator: async (_: any, value: any) => {
      const isValid = await validateFn(value);
      if (!isValid) throw new Error(message);
    },
    message,
  };
}

/**
 * 验证前转换值
 * @param transformFn 转换函数
 * @param rule 原始规则
 *
 * @example
 * transform(v => v?.trim(), PRESET_RULES.required('姓名'))
 */
export const transform = (
  transformFn: (v: any) => any,
  rule: FormItemRule,
): FormItemRule => {
  return {
    ...rule,
    validator: async (r, value) => {
      const transformed = transformFn(value);
      await rule.validator?.(r, transformed, () => {}, {}, {});
    },
  };
};

/**
 * 自定义同步规则构造器
 * @param validateFn 验证函数
 * @param message 错误消息
 * @param trigger 触发方式
 */
export const customRule = (
  validateFn: (v: any) => boolean,
  message: string,
  trigger: FieldRule["trigger"] = "blur",
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
  trigger: FieldRule["trigger"] = "blur",
) => createAsyncRule(trigger, validateFn, message);

/**
 * 合并多条规则为串行验证，只显示第一个未通过的提示
 * @param rules 规则数组
 */
export function mergeRules(rules: FormItemRule[]): FormItemRule[] {
  if (rules.length <= 1) return rules;

  return [
    {
      trigger: ["blur", "input"],
      validator: async (_, value) => {
        for (const rule of rules) {
          try {
            // eslint-disable-next-line no-await-in-loop
            await rule.validator?.(rule, value, () => {}, {}, {});
          } catch (error) {
            throw error;
          }
        }
      },
    },
  ];
}

/**
 * @deprecated 请使用 mergeRules 代替
 */
export const _mergeRules = mergeRules;

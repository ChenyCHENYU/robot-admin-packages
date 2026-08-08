/**
 * 工具函数模块（element-plus 版）
 *
 * createRule/createAsyncRule 委托 core 的 RuleSpec，经 toElementRule 产出 FormItemRule。
 * transform/mergeRules 在 FormItemRule 层操作（callback 风格）。
 * debounce/createMessageTemplate 为纯函数，直接 re-export core。
 */

import type { FormItemRule } from "element-plus";
import {
  debounce as _debounce,
  createMessageTemplate as _createMessageTemplate,
  createRule as createRuleCore,
  createAsyncRule as createAsyncRuleCore,
} from "@robot-admin/form-validate-core";
import { toElementRule } from "./adapter";

/**
 * 扩展的表单验证规则类型（与 naive 版 API 对齐）
 */
export type FieldRule = Omit<FormItemRule, "validator"> & {
  validator: NonNullable<FormItemRule["validator"]>;
};
export type { FormItemRule };

// ==================== 纯函数（直接复用 core） ====================
export const debounce = _debounce;
export const createMessageTemplate = _createMessageTemplate;

// ==================== 规则生成器（委托 core + adapter） ====================

/**
 * 创建同步验证规则（产出 FormItemRule）
 */
export function createRule(
  trigger: FieldRule["trigger"] = "blur",
  validateFn: (v: any) => boolean,
  message: string,
): FieldRule {
  return toElementRule(
    createRuleCore(trigger as any, validateFn, message),
  ) as FieldRule;
}

/**
 * 创建异步验证规则（产出 FormItemRule）
 */
export function createAsyncRule(
  trigger: FieldRule["trigger"] = "blur",
  validateFn: (v: any) => Promise<boolean>,
  message: string,
): FieldRule {
  return toElementRule(
    createAsyncRuleCore(trigger as any, validateFn, message),
  ) as FieldRule;
}

/**
 * 自定义同步规则构造器
 */
export const customRule = (
  validateFn: (v: any) => boolean,
  message: string,
  trigger: FieldRule["trigger"] = "blur",
) => createRule(trigger, validateFn, message);

/**
 * 自定义异步规则构造器
 */
export const customAsyncRule = (
  validateFn: (v: any) => Promise<boolean>,
  message: string,
  trigger: FieldRule["trigger"] = "blur",
) => createAsyncRule(trigger, validateFn, message);

/**
 * 把一条 FormItemRule 的 validator 执行封装为 Promise
 */
const runRule = (
  rule: FormItemRule,
  value: any,
): Promise<void> =>
  new Promise((resolve, reject) => {
    let settled = false;
    rule.validator?.(
      rule as any,
      value,
      (err?: string | Error) => {
        if (settled) return;
        settled = true;
        err ? reject(err) : resolve();
      },
      {},
      {},
    );
  });

/**
 * 验证前转换值（操作 FormItemRule）
 */
export const transform = (
  transformFn: (v: any) => any,
  rule: FormItemRule,
): FormItemRule => {
  return {
    ...rule,
    validator: (r, value, callback, source, options) => {
      const transformed = transformFn(value);
      rule.validator?.(r, transformed, callback, source, options);
    },
  };
};

/**
 * 合并多条规则为串行验证（操作 FormItemRule）
 */
export function mergeRules(rules: FormItemRule[]): FormItemRule[] {
  if (rules.length <= 1) return rules;

  return [
    {
      trigger: ["blur", "change"],
      validator: (_rule, value, callback) => {
        const run = async () => {
          for (const rule of rules) {
            // eslint-disable-next-line no-await-in-loop
            await runRule(rule, value);
          }
        };
        run().then(() => callback(), (err: Error) => callback(err));
      },
    },
  ];
}

/**
 * @deprecated 请使用 mergeRules 代替
 */
export const _mergeRules = mergeRules;

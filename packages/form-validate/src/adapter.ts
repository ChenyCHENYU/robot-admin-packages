/**
 * naive-ui adapter
 * 把框架无关的 RuleSpec 转换为 naive-ui 的 FormItemRule。
 *
 * 这是 naive 版的全部"框架知识"——其余逻辑都来自 form-validate-core。
 * 转换语义与重构前 createRule 直接产出 FieldRule 完全等价。
 */

import type { FormItemRule } from "naive-ui/es/form";
import type { RuleSpec } from "@robot-admin/form-validate-core";

export function toNaiveRule(spec: RuleSpec): FormItemRule {
  return {
    trigger: spec.trigger as FormItemRule["trigger"],
    validator: async (_rule: any, value: any) => {
      const result = await spec.validate(value);
      if (result === true) return;
      throw new Error(typeof result === "string" ? result : spec.message);
    },
    message: spec.message,
  };
}

export function toNaiveRules(specs: RuleSpec[]): FormItemRule[] {
  return specs.map(toNaiveRule);
}

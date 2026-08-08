/**
 * element-plus adapter
 * 把框架无关的 RuleSpec 转换为 element-plus 的 FormItemRule。
 *
 * 关键映射：
 * - validator 用 callback 风格（EP 原生 async-validator 惯例）
 * - naive 的 "input" 触发映射为 EP 的 "change"（EP 无 input 触发）
 *
 * 产出的规则可直接用于：
 * - <el-form-item :rules>（BaseForm / 原生 el-form）
 * - 表格内嵌编辑（advance-table 的 column.meta.rules / jh-grid 的 column.rules）
 */

import type { FormItemRule } from "element-plus";
import type { RuleSpec, Trigger } from "@robot-admin/form-validate-core";

/**
 * naive 的 "input" 在 EP 中映射为 "change"（EP 仅支持 blur / change）。
 */
const mapTrigger = (trigger: Trigger | Trigger[]): FormItemRule["trigger"] => {
  const arr = Array.isArray(trigger) ? trigger : [trigger];
  const mapped = arr.map((t) => (t === "input" ? "change" : t));
  return (mapped.length === 1 ? mapped[0] : mapped) as FormItemRule["trigger"];
};

export function toElementRule(spec: RuleSpec): FormItemRule {
  return {
    trigger: mapTrigger(spec.trigger),
    validator: (
      _rule: any,
      value: any,
      callback: (error?: Error) => void,
    ) => {
      Promise.resolve(spec.validate(value)).then((result) => {
        if (result === true) {
          callback();
          return;
        }
        callback(
          new Error(typeof result === "string" ? result : spec.message),
        );
      });
    },
  };
}

export function toElementRules(specs: RuleSpec[]): FormItemRule[] {
  return specs.map(toElementRule);
}

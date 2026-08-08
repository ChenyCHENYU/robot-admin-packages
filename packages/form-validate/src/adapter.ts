/**
 * 框架适配器
 *
 * 把框架无关的 RuleSpec 转换为各 UI 框架的规则对象。
 * - toNaiveRule：naive-ui 风格（validator 通过 throw 报错）
 * - toElementRule：element-plus 风格（validator 为 callback / asyncValidator）
 */

import type {
  ElementRule,
  NaiveRule,
  RuleSpec,
  Trigger,
} from "./types";

/**
 * 运行单条 RuleSpec，返回结构化结果。
 */
export const runSpec = async (
  spec: RuleSpec,
  value: any,
): Promise<{ ok: true } | { ok: false; message: string }> => {
  const result = await spec.validate(value);
  if (result === true) return { ok: true };
  return {
    ok: false,
    message: typeof result === "string" ? result : spec.message,
  };
};

/**
 * RuleSpec → naive-ui 规则（throw 风格 validator）
 */
export function toNaiveRule(spec: RuleSpec): NaiveRule {
  return {
    trigger: spec.trigger,
    validator: async (_rule, value) => {
      const result = await spec.validate(value);
      if (result === true) return;
      throw new Error(typeof result === "string" ? result : spec.message);
    },
    message: spec.message,
  };
}

export function toNaiveRules(specs: RuleSpec[]): NaiveRule[] {
  return specs.map(toNaiveRule);
}

/**
 * naive 的 "input" 在 EP 中映射为 "change"（EP 仅支持 blur / change）。
 */
const mapElementTrigger = (
  trigger: Trigger | Trigger[],
): ElementRule["trigger"] => {
  const arr = Array.isArray(trigger) ? trigger : [trigger];
  const mapped = arr.map((t) => (t === "input" ? ("change" as const) : t));
  return (mapped.length === 1 ? mapped[0] : mapped) as ElementRule["trigger"];
};

/**
 * RuleSpec → element-plus 规则（callback 风格 validator）
 */
export function toElementRule(spec: RuleSpec): ElementRule {
  return {
    trigger: mapElementTrigger(spec.trigger),
    validator: (_rule, value, callback) => {
      Promise.resolve(spec.validate(value)).then((result) => {
        if (result === true) {
          callback();
          return;
        }
        callback(new Error(typeof result === "string" ? result : spec.message));
      });
    },
  };
}

export function toElementRules(specs: RuleSpec[]): ElementRule[] {
  return specs.map(toElementRule);
}

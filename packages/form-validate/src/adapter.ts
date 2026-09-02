/**
 * 框架适配器
 *
 * 把框架无关的 RuleSpec 转换为各 UI 框架的规则对象。
 * - toNaiveRule：naive-ui 风格（validator 通过 throw 报错）
 * - toElementRule：element-plus 风格（validator 为 callback / asyncValidator）
 */

import type { ElementRule, NaiveRule, RuleSpec, Trigger } from "./types";

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
  const validate = spec.validate;
  const message = spec.message;
  return {
    trigger: Array.isArray(spec.trigger) ? [...spec.trigger] : spec.trigger,
    ...(spec.required === undefined ? {} : { required: spec.required }),
    validator: async (_rule, value) => {
      const result = await validate(value);
      if (result === true) return;
      throw new Error(typeof result === "string" ? result : message);
    },
    message,
  };
}

export function toNaiveRules(specs: readonly RuleSpec[]): NaiveRule[] {
  return specs.map(toNaiveRule);
}

/**
 * naive 的 "input" 在 EP 中映射为 "change"（EP 仅支持 blur / change）。
 */
const mapElementTrigger = (
  trigger: Trigger | Trigger[],
): ElementRule["trigger"] => {
  const arr = Array.isArray(trigger) ? trigger : [trigger];
  const mapped = [
    ...new Set(arr.map((t) => (t === "input" ? ("change" as const) : t))),
  ];
  return (mapped.length === 1 ? mapped[0] : mapped) as ElementRule["trigger"];
};

const normalizeError = (error: unknown, fallback: string): Error => {
  if (error instanceof Error) return error;
  if (typeof error === "string" && error) return new Error(error);
  return new Error(fallback);
};

/**
 * RuleSpec → element-plus 规则（callback 风格 validator）
 */
export function toElementRule(spec: RuleSpec): ElementRule {
  const source: RuleSpec = {
    trigger: Array.isArray(spec.trigger) ? [...spec.trigger] : spec.trigger,
    validate: spec.validate,
    message: spec.message,
    ...(spec.required === undefined ? {} : { required: spec.required }),
  };
  return {
    trigger: mapElementTrigger(source.trigger),
    ...(source.required === undefined ? {} : { required: source.required }),
    message: source.message,
    validator: (_rule, value, callback) => {
      void Promise.resolve()
        .then(() => runSpec(source, value))
        .then(
          (result) =>
            callback(result.ok ? undefined : new Error(result.message)),
          (error) => callback(normalizeError(error, source.message)),
        );
    },
  };
}

export function toElementRules(specs: readonly RuleSpec[]): ElementRule[] {
  return specs.map(toElementRule);
}

/**
 * 整合的预设规则命名空间
 *
 * - PRESET_RULES：naive-ui 版（返回 NaiveRule），向后兼容
 * - ELEMENT_RULES：element-plus 版（返回 ElementRule）
 * - SPEC_RULES：框架无关版（返回 RuleSpec）
 *
 * 三者共享同一份 rules 工厂，仅末尾适配器不同，零逻辑重复。
 */

import * as BasicSpecs from "./rules/basic";
import * as ValueSpecs from "./rules/value";
import * as FormatSpecs from "./rules/format";
import * as ChinaSpecs from "./rules/china";
import { numeric } from "./numeric";
import { toElementRule, toNaiveRule } from "./adapter";
import { isBlank } from "./utils";
import type { ElementRule, NaiveRule, RuleSpec } from "./types";

type RuleFactory = (...args: any[]) => RuleSpec;
type AdaptedPresets<TFactories extends Record<string, RuleFactory>, TRule> = {
  readonly [TKey in keyof TFactories]: (
    ...args: Parameters<TFactories[TKey]>
  ) => TRule;
};

const isRuleSpec = (
  rule: RuleSpec | NaiveRule | ElementRule,
): rule is RuleSpec => typeof (rule as RuleSpec).validate === "function";

const cloneTrigger = <TRule extends NaiveRule | ElementRule>(
  rule: TRule,
): TRule => ({
  ...rule,
  trigger: Array.isArray(rule.trigger) ? [...rule.trigger] : rule.trigger,
});

const optionalNaive = (rule: RuleSpec | NaiveRule): NaiveRule => {
  if (isRuleSpec(rule)) return toNaiveRule(BasicSpecs.optional(rule));

  const source = cloneTrigger(rule);
  const validator = source.validator;
  const output: NaiveRule = { ...source, required: false };
  if (validator) {
    output.validator = async (_rule, value) => {
      if (isBlank(value)) return;
      await validator(output, value);
    };
  }
  return output;
};

const optionalElement = (rule: RuleSpec | ElementRule): ElementRule => {
  if (isRuleSpec(rule)) return toElementRule(BasicSpecs.optional(rule));

  const source = cloneTrigger(rule);
  const validator = source.validator;
  const asyncValidator = source.asyncValidator;
  const output: ElementRule = { ...source, required: false };

  if (validator) {
    output.validator = (_rule, value, callback, record, options) => {
      if (isBlank(value)) {
        callback();
        return;
      }
      validator(output, value, callback, record, options);
    };
  }
  if (asyncValidator) {
    output.asyncValidator = async (_rule, value) => {
      if (isBlank(value)) return;
      await asyncValidator(output, value);
    };
  }
  return output;
};

/**
 * 通用包装：把一批 RuleSpec 工厂转换为指定框架格式
 */
const buildPresets = <TFactories extends Record<string, RuleFactory>, TRule>(
  factories: TFactories,
  adapt: (spec: RuleSpec) => TRule,
): AdaptedPresets<TFactories, TRule> => {
  const output: Record<string, (...args: any[]) => TRule> = {};

  for (const [key, factory] of Object.entries(factories)) {
    output[key] = (...args) => adapt(factory(...args));
  }

  return Object.freeze(output) as AdaptedPresets<TFactories, TRule>;
};

/**
 * SPEC_RULES - 框架无关预设（返回 RuleSpec）
 */
export const SPEC_RULES = Object.freeze({
  ...BasicSpecs,
  ...ValueSpecs,
  ...FormatSpecs,
  ...ChinaSpecs,
  numeric,
});

type NaivePresets = Omit<
  AdaptedPresets<typeof SPEC_RULES, NaiveRule>,
  "optional"
> & {
  /** 将 Naive UI 或 RuleSpec 规则包装为非必填，保持原对象不变。 */
  readonly optional: (rule: RuleSpec | NaiveRule) => NaiveRule;
};

type ElementPresets = Omit<
  AdaptedPresets<typeof SPEC_RULES, ElementRule>,
  "optional"
> & {
  /** 将 Element Plus 或 RuleSpec 规则包装为非必填，保持原对象不变。 */
  readonly optional: (rule: RuleSpec | ElementRule) => ElementRule;
};

/**
 * PRESET_RULES - naive-ui 版预设（返回 NaiveRule，向后兼容）
 */
export const PRESET_RULES: NaivePresets = Object.freeze({
  ...buildPresets(SPEC_RULES, toNaiveRule),
  optional: optionalNaive,
});

/**
 * ELEMENT_RULES - element-plus 版预设（返回 ElementRule）
 */
export const ELEMENT_RULES: ElementPresets = Object.freeze({
  ...buildPresets(SPEC_RULES, toElementRule),
  optional: optionalElement,
});

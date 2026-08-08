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
import { numeric, type NumericContract } from "./numeric";
import { toElementRule, toNaiveRule } from "./adapter";
import type { ElementRule, NaiveRule, RuleSpec } from "./types";

/**
 * 通用包装：把一批 RuleSpec 工厂转换为指定框架格式
 */
const buildPresets = (
  adapt: (s: RuleSpec) => NaiveRule | ElementRule,
) => {
  const wrap = <F extends (...a: any[]) => RuleSpec>(f: F) =>
    ((...args: any[]) => adapt(f(...args))) as F;
  const groups = [BasicSpecs, ValueSpecs, FormatSpecs, ChinaSpecs] as const;
  const out: Record<string, (...a: any[]) => any> = {};
  for (const group of groups) {
    for (const key of Object.keys(group)) {
      out[key] = wrap((group as any)[key]);
    }
  }
  out.numeric = (contract: NumericContract, field?: string) =>
    adapt(numeric(contract, field));
  return out;
};

/**
 * SPEC_RULES - 框架无关预设（返回 RuleSpec）
 */
export const SPEC_RULES = {
  ...BasicSpecs,
  ...ValueSpecs,
  ...FormatSpecs,
  ...ChinaSpecs,
  numeric,
};

/**
 * PRESET_RULES - naive-ui 版预设（返回 NaiveRule，向后兼容）
 */
export const PRESET_RULES = buildPresets(toNaiveRule);

/**
 * ELEMENT_RULES - element-plus 版预设（返回 ElementRule）
 */
export const ELEMENT_RULES = buildPresets(toElementRule);

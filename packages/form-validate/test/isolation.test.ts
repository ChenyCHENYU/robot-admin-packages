import { describe, expect, it } from "vitest";
import {
  ELEMENT_COMBOS,
  ELEMENT_RULES,
  NAIVE_COMBOS,
  PRESET_RULES,
  REGEX_PATTERNS,
  SPEC_RULES,
  createRule,
  createSpec,
  mergeRules,
  someSpec,
  toElementRule,
  toNaiveRule,
} from "../src";
import type { ElementRule, Trigger } from "../src";

const runElement = (rule: ElementRule, value: unknown) =>
  new Promise<Error | string | undefined>((resolve) => {
    if (!rule.validator) {
      resolve(undefined);
      return;
    }
    rule.validator(rule, value, resolve);
  });

describe("配置隔离", () => {
  it("创建规则时快照 trigger，适配后也不与 RuleSpec 共享数组", () => {
    const triggers: Trigger[] = ["blur"];
    const spec = createSpec(triggers, () => true, "原始消息");
    const naive = toNaiveRule(spec);

    triggers.push("input");
    (naive.trigger as Trigger[]).push("change");

    expect(spec.trigger).toEqual(["blur"]);
    expect(naive.trigger).toEqual(["blur", "change"]);
  });

  it("UI 适配器快照 RuleSpec 的行为与消息", async () => {
    const spec = createSpec("blur", () => false, "原始消息");
    const naive = toNaiveRule(spec);
    const element = toElementRule(spec);

    spec.validate = () => true;
    spec.message = "修改后的消息";

    await expect(naive.validator?.(naive, "value")).rejects.toThrow("原始消息");
    await expect(runElement(element, "value")).resolves.toMatchObject({
      message: "原始消息",
    });
  });

  it("组合规则不受来源数组和来源规则后续修改影响", async () => {
    const source = createSpec("blur", () => false, "失败");
    const sources = [source];
    const combined = someSpec(sources, "组合失败");

    source.validate = () => true;
    sources.push(createSpec("blur", () => true, "通过"));

    await expect(combined.validate("value")).resolves.toBe(false);
  });

  it("单条 mergeRules 也返回独立规则对象和数组", () => {
    const source = createRule(["blur"], () => true, "");
    const input = [source];
    const merged = mergeRules(input);

    expect(merged).not.toBe(input);
    expect(merged[0]).not.toBe(source);
    (merged[0].trigger as Trigger[]).push("change");
    expect(source.trigger).toEqual(["blur"]);
  });
});

describe("框架接入语义", () => {
  it("required 元数据会透传给 Naive UI 与 Element Plus", () => {
    const spec = SPEC_RULES.required("名称");
    expect(spec.required).toBe(true);
    expect(toNaiveRule(spec).required).toBe(true);
    expect(toElementRule(spec).required).toBe(true);
  });

  it("同一命名空间内即可创建 Naive UI 可选规则", async () => {
    const rule = PRESET_RULES.optional(PRESET_RULES.email("邮箱"));

    expect(rule.required).toBe(false);
    await expect(rule.validator?.(rule, "")).resolves.toBeUndefined();
    await expect(rule.validator?.(rule, "invalid")).rejects.toThrow(
      "邮箱格式错误",
    );
  });

  it("同一命名空间内即可创建 Element Plus 可选规则", async () => {
    const rule = ELEMENT_RULES.optional(ELEMENT_RULES.email("邮箱"));

    expect(rule.required).toBe(false);
    await expect(runElement(rule, "")).resolves.toBeUndefined();
    await expect(runElement(rule, "invalid")).resolves.toMatchObject({
      message: "邮箱格式错误",
    });
  });
});

describe("公共命名空间保护", () => {
  it.each([
    SPEC_RULES,
    PRESET_RULES,
    ELEMENT_RULES,
    NAIVE_COMBOS,
    ELEMENT_COMBOS,
    REGEX_PATTERNS,
  ])("导出对象不可被消费侧改写", (namespace) => {
    expect(Object.isFrozen(namespace)).toBe(true);
  });

  it("导出的正则实例不可被改写", () => {
    expect(Object.isFrozen(REGEX_PATTERNS.EMAIL)).toBe(true);
  });
});

import { describe, expectTypeOf, it } from "vitest";
import {
  ELEMENT_RULES,
  PRESET_RULES,
  RULE_COMBOS,
  SPEC_RULES,
  some,
  someElement,
  validateRecord,
  validateValue,
} from "../src";
import type { ElementRule, NaiveRule, RuleSpec } from "../src";

describe("公共类型契约", () => {
  it("预设命名空间保留参数与返回类型", () => {
    expectTypeOf(PRESET_RULES.required("字段")).toEqualTypeOf<NaiveRule>();
    expectTypeOf(
      ELEMENT_RULES.numeric({ totalDigits: 5 }),
    ).toEqualTypeOf<ElementRule>();
    expectTypeOf(SPEC_RULES.email("邮箱")).toEqualTypeOf<RuleSpec>();
    expectTypeOf(some([PRESET_RULES.email("邮箱")])).toEqualTypeOf<NaiveRule>();
    expectTypeOf(
      someElement([ELEMENT_RULES.email("邮箱")]),
    ).toEqualTypeOf<ElementRule>();
    expectTypeOf(
      PRESET_RULES.optional(PRESET_RULES.email("邮箱")),
    ).toEqualTypeOf<NaiveRule>();
    expectTypeOf(
      ELEMENT_RULES.optional(ELEMENT_RULES.email("邮箱")),
    ).toEqualTypeOf<ElementRule>();
    expectTypeOf(
      PRESET_RULES.required("状态", ["blur", "change"]),
    ).toEqualTypeOf<NaiveRule>();
    expectTypeOf(PRESET_RULES.range("年龄", 18, 65)).toEqualTypeOf<NaiveRule>();
    expectTypeOf(RULE_COMBOS.username("用户名")).toEqualTypeOf<NaiveRule[]>();
  });

  it("批量校验接受只读规则集合", () => {
    const rules = [SPEC_RULES.required("名称")] as const;
    const ruleMap = { name: rules } as const;

    expectTypeOf(validateValue("Robot", rules)).toEqualTypeOf<
      Promise<string | null>
    >();
    expectTypeOf(validateRecord({ name: "Robot" }, ruleMap)).toEqualTypeOf<
      Promise<{ field: string; message: string } | null>
    >();
  });

  const assertInvalidPresetUsage = () => {
    // @ts-expect-error 未声明的预设规则必须在编译期报错
    PRESET_RULES.notExists("字段");
    // @ts-expect-error required 的字段名不可省略
    PRESET_RULES.required();
    // @ts-expect-error 数值契约不接受字符串位数
    ELEMENT_RULES.numeric({ totalDigits: "5" });
    // @ts-expect-error 公共规则命名空间不可被消费侧覆盖
    PRESET_RULES.required = () => ({}) as NaiveRule;
  };
  void assertInvalidPresetUsage;
});

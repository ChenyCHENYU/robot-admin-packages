import { describe, expectTypeOf, it } from "vitest";
import {
  ELEMENT_RULES,
  PRESET_RULES,
  RULE_COMBOS,
  SPEC_RULES,
  some,
  every,
  toNaiveRule,
  someElement,
  validateRecord,
  validateValue,
} from "../src";
import type { ElementRule, NaiveRule, NativeNaiveRule, RuleSpec } from "../src";

// Mirrors Naive UI's callback boundary without adding its runtime as a dependency.
interface NativeFormItemRule {
  trigger?: string | string[];
  message?: string | (() => string);
  validator?: (
    rule: NativeFormItemRule,
    value: any,
    callback: (error?: string | Error) => void,
    source: Record<string, any>,
    options: { first?: boolean },
  ) => boolean | Error | Error[] | Promise<void> | undefined;
  asyncValidator?: (
    rule: NativeFormItemRule,
    value: any,
    callback: (error?: string | Error) => void,
    source: Record<string, any>,
    options: { first?: boolean },
  ) => Promise<void> | undefined;
}

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

  it("Naive 输出可直接赋给框架边界，原生自定义规则可交给组合器", () => {
    const preset: NativeFormItemRule = PRESET_RULES.required("字段");
    const adapter: NativeFormItemRule = toNaiveRule(
      SPEC_RULES.required("字段"),
    );
    const combos: NativeFormItemRule[] = RULE_COMBOS.username("用户名");
    const handWritten: NativeFormItemRule = {
      validator: () => new Error("失败"),
    };
    const asyncNative: NativeFormItemRule = {
      asyncValidator: async () => undefined,
    };
    const nativeInput: NativeNaiveRule = asyncNative;
    const combined: NativeFormItemRule = every([
      handWritten,
      PRESET_RULES.required("字段"),
    ]);
    every([nativeInput]);
    expectTypeOf(preset).toEqualTypeOf<NativeFormItemRule>();
    void [adapter, combos, combined];
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
    // @ts-expect-error RuleSpec remains a framework independent validate contract
    SPEC_RULES.optional({ validator: () => undefined });
    // @ts-expect-error native Naive rules cannot be passed to the pure core
    SPEC_RULES.optional(PRESET_RULES.required("字段"));
    // @ts-expect-error async native validators must reject, not resolve false
    every([{ validator: async () => false }]);
    // @ts-expect-error resolving an Error is not a rejected Promise<void>
    every([{ validator: async () => new Error("失败") }]);
    // @ts-expect-error asyncValidator must return Promise<void>
    every([{ asyncValidator: async () => false }]);
    // @ts-expect-error asyncValidator must reject instead of resolving an Error
    every([{ asyncValidator: async () => new Error("失败") }]);
  };
  void assertInvalidPresetUsage;
});

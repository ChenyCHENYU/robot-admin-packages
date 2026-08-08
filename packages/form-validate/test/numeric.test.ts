import { describe, it, expect } from "vitest";
import { numeric, type NumericContract } from "../src/numeric";
import type { RuleSpec } from "../src/types";

const run = async (spec: RuleSpec, value: unknown) => {
  const r = await spec.validate(value);
  if (r === true) return { ok: true, message: null };
  return { ok: false, message: typeof r === "string" ? r : spec.message };
};

describe("numeric", () => {
  describe("空值放行（非必填语义）", () => {
    const rule = numeric({ kind: "decimal" }, "数值");
    it.each([null, undefined, "", "   "])("空值 %p 放行", async (v) => {
      expect((await run(rule, v)).ok).toBe(true);
    });
  });

  describe("格式校验", () => {
    const integerRule = numeric({ kind: "integer" }, "次数");
    it("合法整数通过", async () => {
      expect((await run(integerRule, "123")).ok).toBe(true);
      expect((await run(integerRule, "-456")).ok).toBe(true);
      expect((await run(integerRule, 789)).ok).toBe(true);
    });
    it("小数在 integer 模式下失败", async () => {
      expect((await run(integerRule, "12.5")).ok).toBe(false);
    });
    it("非数字字符串失败", async () => {
      expect((await run(integerRule, "abc")).ok).toBe(false);
    });
    it("科学计数法不被接受", async () => {
      expect((await run(integerRule, "1e3")).ok).toBe(false);
    });
  });

  describe("小数模式", () => {
    const rule = numeric({ kind: "decimal" }, "温度");
    it("合法小数通过", async () => {
      expect((await run(rule, "123.456")).ok).toBe(true);
      expect((await run(rule, ".5")).ok).toBe(true);
      expect((await run(rule, "-.25")).ok).toBe(true);
      expect((await run(rule, 3.14)).ok).toBe(true);
    });
    it("Infinity 失败", async () => {
      expect((await run(rule, "Infinity")).ok).toBe(false);
    });
  });

  describe("总位数 totalDigits", () => {
    const rule = numeric({ kind: "decimal", totalDigits: 5 }, "数值");
    it("恰好 5 位通过", async () => {
      expect((await run(rule, "12345")).ok).toBe(true);
      expect((await run(rule, "123.45")).ok).toBe(true);
    });
    it("前导零不计入总位数", async () => {
      expect((await run(rule, "00123")).ok).toBe(true);
    });
    it("超位数失败", async () => {
      expect((await run(rule, "123456")).ok).toBe(false);
    });
  });

  describe("小数位数 fractionDigits", () => {
    const rule = numeric({ kind: "decimal", fractionDigits: 2 }, "金额");
    it("小数位不超限通过", async () => {
      expect((await run(rule, "100.5")).ok).toBe(true);
      expect((await run(rule, "100.55")).ok).toBe(true);
    });
    it("小数位超限失败", async () => {
      const r = await run(rule, "100.555");
      expect(r.ok).toBe(false);
      expect(r.message).toContain("小数位数");
    });
  });

  describe("范围校验", () => {
    const closedRule = numeric({ kind: "decimal", min: 0, max: 100 }, "值");
    it("边界值通过（闭区间）", async () => {
      expect((await run(closedRule, 0)).ok).toBe(true);
      expect((await run(closedRule, 100)).ok).toBe(true);
    });
    it("越界失败", async () => {
      expect((await run(closedRule, -1)).ok).toBe(false);
      expect((await run(closedRule, 101)).ok).toBe(false);
    });
    it("开区间 minExclusive/maxExclusive", async () => {
      const openRule = numeric(
        { kind: "decimal", min: 0, max: 100, minExclusive: true, maxExclusive: true },
        "值",
      );
      expect((await run(openRule, 0)).ok).toBe(false);
      expect((await run(openRule, 100)).ok).toBe(false);
      expect((await run(openRule, 50)).ok).toBe(true);
    });
  });

  describe("消息可读性", () => {
    it("范围失败消息含字段名", async () => {
      const rule = numeric({ kind: "decimal", min: 10 }, "温度");
      const r = await run(rule, "5");
      expect(r.ok).toBe(false);
      expect(r.message).toContain("温度");
      expect(r.message).toContain("10");
    });
  });

  describe("组合契约（对标 SQL DECIMAL(11,3)）", () => {
    const decimalContract: NumericContract = {
      kind: "decimal", totalDigits: 11, fractionDigits: 3, min: 0,
    };
    const rule = numeric(decimalContract, "温度");
    it("合法值通过", async () => {
      expect((await run(rule, "1234.567")).ok).toBe(true);
    });
    it("小数位超 3 位失败", async () => {
      expect((await run(rule, "1.2345")).ok).toBe(false);
    });
    it("负数失败", async () => {
      expect((await run(rule, "-1")).ok).toBe(false);
    });
  });
});

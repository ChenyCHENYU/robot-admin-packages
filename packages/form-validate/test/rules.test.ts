import { describe, expect, it } from "vitest";
import { runSpec } from "../src/adapter";
import {
  enumValue,
  number,
  pattern,
  positiveInteger,
  required,
} from "../src/rules/basic";
import { email } from "../src/rules/format";
import { arrayUnique, date, dateAfter, length } from "../src/rules/value";

describe("基础规则边界", () => {
  it.each([0, false])("required 将已填写的 %p 视为有效值", async (value) => {
    expect((await runSpec(required("字段"), value)).ok).toBe(true);
  });

  it("required 正确处理普通对象、集合与日期对象", async () => {
    expect((await runSpec(required("字段"), {})).ok).toBe(false);
    expect((await runSpec(required("字段"), new Set())).ok).toBe(false);
    expect((await runSpec(required("字段"), new Set([1]))).ok).toBe(true);
    expect((await runSpec(required("字段"), new Date(0))).ok).toBe(true);
  });

  it.each([null, undefined, "", "   "])(
    "required 拒绝空白值 %p",
    async (value) => {
      expect((await runSpec(required("字段"), value)).ok).toBe(false);
    },
  );

  it("enumValue 不会把 0 和 false 无条件当作空值放行", async () => {
    const rule = enumValue("状态", [1, true] as const);
    expect((await runSpec(rule, 0)).ok).toBe(false);
    expect((await runSpec(rule, false)).ok).toBe(false);
    expect((await runSpec(rule, true)).ok).toBe(true);
  });

  it("enumValue 不受来源数组后续修改影响", async () => {
    const values = ["enabled"];
    const rule = enumValue("状态", values);
    values.push("disabled");

    expect((await runSpec(rule, "disabled")).ok).toBe(false);
  });

  it("格式规则只放行真正的空白值", async () => {
    const rule = email("邮箱");
    expect((await runSpec(rule, "")).ok).toBe(true);
    expect((await runSpec(rule, 0)).ok).toBe(false);
    expect((await runSpec(rule, false)).ok).toBe(false);
  });

  it("positiveInteger 严格拒绝 0", async () => {
    const rule = positiveInteger("数量");
    expect((await runSpec(rule, 0)).ok).toBe(false);
    expect((await runSpec(rule, 1)).ok).toBe(true);
  });

  it.each([Infinity, -Infinity, Number.NaN, [], {}])(
    "number 拒绝非有限或非标量输入 %p",
    async (value) => {
      expect((await runSpec(number("数值"), value)).ok).toBe(false);
    },
  );

  it("pattern 对带全局标志的正则可重复得到稳定结果", async () => {
    const rule = pattern("编码", /^A\d+$/g);
    expect((await runSpec(rule, "A1")).ok).toBe(true);
    expect((await runSpec(rule, "A1")).ok).toBe(true);
  });
});

describe("值规则边界", () => {
  it("length 在 max 为 0 时仍生成区间消息", () => {
    expect(length("编码", 0, 0).message).toBe("编码长度需在0-0位之间");
  });

  it("arrayUnique 对非空的非数组值返回失败", async () => {
    expect((await runSpec(arrayUnique("标签"), {})).ok).toBe(false);
    expect((await runSpec(arrayUnique("标签"), ["a", "a"])).ok).toBe(false);
    expect((await runSpec(arrayUnique("标签"), ["a", "b"])).ok).toBe(true);
  });

  it("date 拒绝会被 Date 隐式转换的非日期类型", async () => {
    const rule = date("日期");
    expect((await runSpec(rule, false)).ok).toBe(false);
    expect((await runSpec(rule, [])).ok).toBe(false);
    expect((await runSpec(rule, 0)).ok).toBe(true);
  });

  it("静态日期边界在创建规则时完成快照", async () => {
    const boundary = new Date("2024-01-01T00:00:00Z");
    const rule = dateAfter("日期", boundary);
    boundary.setUTCFullYear(2030);

    expect((await runSpec(rule, "2025-01-01T00:00:00Z")).ok).toBe(true);
  });
});

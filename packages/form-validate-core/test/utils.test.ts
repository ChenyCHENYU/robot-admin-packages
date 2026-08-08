import { describe, it, expect } from "vitest";
import {
  createRule,
  createAsyncRule,
  optional,
  mergeRules,
  mergeTriggers,
  transform,
  isBlank,
} from "../src/utils";
import type { RuleSpec } from "../src/types";

const run = async (spec: RuleSpec, value: unknown) => {
  const r = await spec.validate(value);
  if (r === true) return { ok: true, message: null };
  return { ok: false, message: typeof r === "string" ? r : spec.message };
};

describe("isBlank", () => {
  it.each([null, undefined, "", "   ", "\t\n"])("空白值 %j 判空", (v) => {
    expect(isBlank(v)).toBe(true);
  });

  it.each([0, false, "0", [], {}])("非空白值 %j 不判空", (v) => {
    expect(isBlank(v)).toBe(false);
  });
});

describe("createRule", () => {
  it("validateFn 返回 true 通过", async () => {
    const rule = createRule("blur", (v) => v === "ok", "失败");
    expect((await run(rule, "ok")).ok).toBe(true);
  });

  it("validateFn 返回 false 用 message", async () => {
    const rule = createRule("blur", (v) => v === "ok", "失败消息");
    const r = await run(rule, "no");
    expect(r.ok).toBe(false);
    expect(r.message).toBe("失败消息");
  });

  it("保留 trigger", () => {
    const rule = createRule(["blur", "input"], () => true, "");
    expect(rule.trigger).toEqual(["blur", "input"]);
  });
});

describe("createAsyncRule", () => {
  it("异步校验通过", async () => {
    const rule = createAsyncRule("blur", async (v) => v === 1, "失败");
    expect((await run(rule, 1)).ok).toBe(true);
    expect((await run(rule, 2)).ok).toBe(false);
  });
});

describe("optional", () => {
  const inner = createRule("blur", (v) => v === "valid", "格式错误");

  it.each([null, undefined, "", "   "])("空值 %p 放行，不触发内部校验", async (v) => {
    expect((await run(optional(inner), v)).ok).toBe(true);
  });

  it("非空值正常执行内部校验", async () => {
    expect((await run(optional(inner), "valid")).ok).toBe(true);
    expect((await run(optional(inner), "invalid")).ok).toBe(false);
  });

  it("保留内部规则的 message", async () => {
    const r = await run(optional(inner), "invalid");
    expect(r.message).toBe("格式错误");
  });
});

describe("transform", () => {
  it("校验前转换值", async () => {
    const rule = transform((v: string) => v.trim(), createRule("blur", (v) => v === "abc", "失败"));
    expect((await run(rule, "  abc  ")).ok).toBe(true);
  });
});

describe("mergeTriggers", () => {
  it("空数组返回默认", () => {
    expect(mergeTriggers([])).toEqual(["blur", "input"]);
  });

  it("单元素数组返回单个 trigger", () => {
    expect(mergeTriggers([{ trigger: "blur", validate: () => true, message: "" }])).toBe("blur");
  });

  it("多元素去重取并集", () => {
    const specs = [
      { trigger: ["blur", "input"], validate: () => true, message: "" },
      { trigger: "change", validate: () => true, message: "" },
    ] as RuleSpec[];
    const result = mergeTriggers(specs);
    expect(result).toEqual(["blur", "input", "change"]);
  });
});

describe("mergeRules", () => {
  it("单规则原样返回", () => {
    const only = createRule("blur", () => true, "");
    expect(mergeRules([only])).toHaveLength(1);
  });

  it("串行校验，第一个失败即返回其消息", async () => {
    const first = createRule("blur", () => false, "第一条失败");
    const second = createRule("blur", () => false, "第二条失败");
    const merged = mergeRules([first, second])[0];
    const r = await run(merged, "x");
    expect(r.ok).toBe(false);
    expect(r.message).toBe("第一条失败");
  });

  it("全部通过", async () => {
    const merged = mergeRules([
      createRule("blur", () => true, ""),
      createRule("blur", () => true, ""),
    ])[0];
    expect((await run(merged, "x")).ok).toBe(true);
  });
});

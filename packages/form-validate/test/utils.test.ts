import { describe, it, expect } from "vitest";
import {
  createSpec,
  createAsyncSpec,
  optional,
  mergeSpecs,
  mergeTriggers,
  transform,
  isBlank,
  createRule,
} from "../src/utils";
import { runSpec, toNaiveRule, toElementRule } from "../src/adapter";
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

describe("createSpec", () => {
  it("返回 true 通过", async () => {
    const rule = createSpec("blur", (v) => v === "ok", "失败");
    expect((await run(rule, "ok")).ok).toBe(true);
  });
  it("返回 false 用 message", async () => {
    const rule = createSpec("blur", (v) => v === "ok", "失败消息");
    const r = await run(rule, "no");
    expect(r.ok).toBe(false);
    expect(r.message).toBe("失败消息");
  });
  it("保留 trigger", () => {
    const rule = createSpec(["blur", "input"], () => true, "");
    expect(rule.trigger).toEqual(["blur", "input"]);
  });
});

describe("createAsyncSpec", () => {
  it("异步校验", async () => {
    const rule = createAsyncSpec("blur", async (v) => v === 1, "失败");
    expect((await run(rule, 1)).ok).toBe(true);
    expect((await run(rule, 2)).ok).toBe(false);
  });
});

describe("optional", () => {
  const inner = createSpec("blur", (v) => v === "valid", "格式错误");
  it.each([null, undefined, "", "   "])("空值 %p 放行", async (v) => {
    expect((await run(optional(inner), v)).ok).toBe(true);
  });
  it("非空值正常校验", async () => {
    expect((await run(optional(inner), "valid")).ok).toBe(true);
    expect((await run(optional(inner), "invalid")).ok).toBe(false);
  });
});

describe("transform", () => {
  it("校验前转换值", async () => {
    const rule = transform((v: string) => v.trim(), createSpec("blur", (v) => v === "abc", "失败"));
    expect((await run(rule, "  abc  ")).ok).toBe(true);
  });
});

describe("mergeTriggers", () => {
  it("空数组返回默认", () => {
    expect(mergeTriggers([])).toEqual(["blur", "input"]);
  });
  it("单元素返回单个", () => {
    expect(mergeTriggers([{ trigger: "blur", validate: () => true, message: "" }])).toBe("blur");
  });
  it("多元素去重取并集", () => {
    const specs = [
      { trigger: ["blur", "input"], validate: () => true, message: "" },
      { trigger: "change", validate: () => true, message: "" },
    ] as RuleSpec[];
    expect(mergeTriggers(specs)).toEqual(["blur", "input", "change"]);
  });
});

describe("mergeSpecs", () => {
  it("单规则原样返回", () => {
    const only = createSpec("blur", () => true, "");
    expect(mergeSpecs([only])).toHaveLength(1);
  });
  it("串行校验返回第一个失败消息", async () => {
    const merged = mergeSpecs([
      createSpec("blur", () => false, "第一条失败"),
      createSpec("blur", () => false, "第二条失败"),
    ])[0];
    const r = await run(merged, "x");
    expect(r.ok).toBe(false);
    expect(r.message).toBe("第一条失败");
  });
  it("全部通过", async () => {
    const merged = mergeSpecs([
      createSpec("blur", () => true, ""),
      createSpec("blur", () => true, ""),
    ])[0];
    expect((await run(merged, "x")).ok).toBe(true);
  });
});

describe("createRule（向后兼容，返回 NaiveRule）", () => {
  it("validator 为 throw 风格", async () => {
    const rule = createRule("blur", (v) => v === "ok", "失败");
    expect(rule.trigger).toBe("blur");
    await expect(async () => {
      await rule.validator?.(rule, "no");
    }).rejects.toThrow("失败");
  });
});

describe("适配器 toNaiveRule / toElementRule", () => {
  const spec = createSpec("blur", (v) => v === "ok", "失败");

  it("toNaiveRule 失败时 throw", async () => {
    const naive = toNaiveRule(spec);
    await expect(naive.validator?.(naive, "ok")).resolves.toBeUndefined();
    await expect(naive.validator?.(naive, "no")).rejects.toThrow("失败");
  });

  it("toElementRule 失败时 callback(new Error)，input→change", () => {
    const el = toElementRule(spec);
    expect(el.trigger).toBe("blur");
    const fn = el.validator!;
    el.trigger = "change";
    // input 映射测试
    const inputSpec = createSpec("input", () => true, "");
    expect(toElementRule(inputSpec).trigger).toBe("change");

    return new Promise<void>((resolve) => {
      fn(el, "no", (err) => {
        expect(err).toBeInstanceOf(Error);
        resolve();
      });
    });
  });
});

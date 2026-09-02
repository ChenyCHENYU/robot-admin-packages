import { afterEach, describe, it, expect, vi } from "vitest";
import {
  createSpec,
  createAsyncSpec,
  debounce,
  optional,
  mergeSpecs,
  mergeRules,
  mergeTriggers,
  transform,
  isBlank,
  createRule,
} from "../src/utils";
import { toNaiveRule, toElementRule } from "../src/adapter";
import type { RuleSpec } from "../src/types";

const run = async (spec: RuleSpec, value: unknown) => {
  const r = await spec.validate(value);
  if (r === true) return { ok: true, message: null };
  return { ok: false, message: typeof r === "string" ? r : spec.message };
};

afterEach(() => {
  vi.useRealTimers();
});

describe("isBlank", () => {
  it.each([null, undefined, "", "   ", "\t\n"])("空白值 %j 判空", (v) => {
    expect(isBlank(v)).toBe(true);
  });
  it.each([0, false, "0", [], {}])("非空白值 %j 不判空", (v) => {
    expect(isBlank(v)).toBe(false);
  });
});

describe("debounce", () => {
  it("合并等待窗口内的调用，并让所有 Promise 收到最后一次结果", async () => {
    vi.useFakeTimers();
    const fn = vi.fn((value: string) => `checked:${value}`);
    const debounced = debounce(fn, 50);

    const first = debounced("first");
    const second = debounced("second");
    await vi.advanceTimersByTimeAsync(50);

    await expect(Promise.all([first, second])).resolves.toEqual([
      "checked:second",
      "checked:second",
    ]);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("second");
  });

  it("同步异常会拒绝同一批次的全部 Promise", async () => {
    vi.useFakeTimers();
    const debounced = debounce(() => {
      throw new Error("服务异常");
    }, 10);

    const first = expect(debounced()).rejects.toThrow("服务异常");
    const second = expect(debounced()).rejects.toThrow("服务异常");
    await vi.advanceTimersByTimeAsync(10);

    await Promise.all([first, second]);
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
  it("支持返回动态失败消息", async () => {
    const rule = createSpec("blur", () => "动态消息", "默认消息");
    expect((await run(rule, "x")).message).toBe("动态消息");
  });
});

describe("createAsyncSpec", () => {
  it("异步校验", async () => {
    const rule = createAsyncSpec("blur", async (v) => v === 1, "失败");
    expect((await run(rule, 1)).ok).toBe(true);
    expect((await run(rule, 2)).ok).toBe(false);
  });
  it("支持异步返回动态失败消息", async () => {
    const rule = createAsyncSpec(
      "blur",
      async () => "异步动态消息",
      "默认消息",
    );
    expect((await run(rule, "x")).message).toBe("异步动态消息");
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
    const rule = transform(
      (v: string) => v.trim(),
      createSpec("blur", (v) => v === "abc", "失败"),
    );
    expect((await run(rule, "  abc  ")).ok).toBe(true);
  });
});

describe("mergeTriggers", () => {
  it("空数组返回默认", () => {
    expect(mergeTriggers([])).toEqual(["blur", "input"]);
  });
  it("单元素返回单个", () => {
    expect(
      mergeTriggers([{ trigger: "blur", validate: () => true, message: "" }]),
    ).toBe("blur");
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

describe("mergeRules", () => {
  it("保留被合并规则的实际 trigger", () => {
    const merged = mergeRules([
      createRule("change", () => true, ""),
      createRule("blur", () => true, ""),
    ]);
    expect(merged[0].trigger).toEqual(["change", "blur"]);
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

  it("toElementRule 对映射后的重复 trigger 去重", () => {
    const inputAndChange = createSpec(["input", "change"], () => true, "");
    expect(toElementRule(inputAndChange).trigger).toBe("change");
  });

  it.each([
    [
      "同步异常",
      createSpec(
        "blur",
        () => {
          throw new Error("同步异常");
        },
        "默认消息",
      ),
    ],
    [
      "异步异常",
      createAsyncSpec(
        "blur",
        async () => Promise.reject("异步异常"),
        "默认消息",
      ),
    ],
  ])("toElementRule 将%s交给 callback", (message, errorSpec) => {
    const elementRule = toElementRule(errorSpec);

    return new Promise<void>((resolve) => {
      elementRule.validator?.(elementRule, "value", (error) => {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe(message);
        resolve();
      });
    });
  });
});

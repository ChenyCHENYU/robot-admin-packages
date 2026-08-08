import { describe, it, expect, vi } from "vitest";
import {
  when,
  compareWith,
  debouncedAsyncCheck,
  some,
  every,
} from "../src/advanced";
import { createRule, customRule } from "../src/utils";
import type { RuleSpec } from "../src/types";

const run = async (spec: RuleSpec, value: unknown) => {
  const r = await spec.validate(value);
  if (r === true) return { ok: true, message: null };
  return { ok: false, message: typeof r === "string" ? r : spec.message };
};

describe("when", () => {
  const thenRules = [createRule("blur", (v) => v === "A", "必须是A")];

  it("条件为真时执行 thenRules", async () => {
    const rule = when(() => true, () => true, thenRules, []);
    expect((await run(rule, "A")).ok).toBe(true);
    const r = await run(rule, "B");
    expect(r.ok).toBe(false);
    expect(r.message).toBe("必须是A"); // 子规则消息透传
  });

  it("条件为假时执行 elseRules", async () => {
    const elseRules = [createRule("blur", () => false, "else失败")];
    const rule = when(() => true, () => false, thenRules, elseRules);
    const r = await run(rule, "x");
    expect(r.ok).toBe(false);
    expect(r.message).toBe("else失败");
  });

  it("依赖值动态读取", async () => {
    let flag = "on";
    const rule = when(() => flag, (v) => v === "on", thenRules, []);
    expect((await run(rule, "A")).ok).toBe(true);
    flag = "off";
    expect((await run(rule, "A")).ok).toBe(true); // 条件为假，不校验
  });
});

describe("compareWith", () => {
  it("gte 大于等于", async () => {
    const rule = compareWith("结束", () => 10, "gte");
    expect((await run(rule, 10)).ok).toBe(true);
    expect((await run(rule, 11)).ok).toBe(true);
    expect((await run(rule, 9)).ok).toBe(false);
  });

  it("空值放行", async () => {
    const rule = compareWith("结束", () => 10, "gte");
    expect((await run(rule, null)).ok).toBe(true);
    expect((await run(rule, "")).ok).toBe(true);
  });

  it("自定义消息", async () => {
    const rule = compareWith("结束", () => 10, "gte", "不能早于开始");
    const r = await run(rule, 5);
    expect(r.message).toBe("不能早于开始");
  });

  it("eq/ne 操作符", async () => {
    expect((await run(compareWith("x", () => 5, "eq"), 5)).ok).toBe(true);
    expect((await run(compareWith("x", () => 5, "ne"), 6)).ok).toBe(true);
  });
});

describe("debouncedAsyncCheck", () => {
  it("空值放行", async () => {
    const rule = debouncedAsyncCheck("用户名", async () => true, 0);
    expect((await run(rule, "")).ok).toBe(true);
  });

  it("asyncFn 返回 false 校验失败", async () => {
    const fn = vi.fn(async () => false);
    const rule = debouncedAsyncCheck("用户名", fn, 0, "已被占用");
    const r = await run(rule, "test");
    expect(r.ok).toBe(false);
    expect(r.message).toBe("已被占用");
  });

  it("asyncFn 返回 true 通过", async () => {
    const rule = debouncedAsyncCheck("用户名", async () => true, 0);
    expect((await run(rule, "test")).ok).toBe(true);
  });
});

describe("some (OR 组合)", () => {
  it("任一通过即成功", async () => {
    const rule = some(
      [
        createRule("blur", (v) => v === "a", ""),
        createRule("blur", (v) => v === "b", ""),
      ],
      "请输入 a 或 b",
    );
    expect((await run(rule, "a")).ok).toBe(true);
    expect((await run(rule, "b")).ok).toBe(true);
    expect((await run(rule, "c")).ok).toBe(false);
  });

  it("全部失败返回自定义消息", async () => {
    const rule = some(
      [createRule("blur", () => false, "")],
      "都不满足",
    );
    const r = await run(rule, "x");
    expect(r.ok).toBe(false);
    expect(r.message).toBe("都不满足");
  });
});

describe("every (AND 组合)", () => {
  it("全部通过才成功", async () => {
    const rule = every([
      createRule("blur", (v) => typeof v === "string", ""),
      createRule("blur", (v) => (v as string).length >= 3, ""),
    ]);
    expect((await run(rule, "abc")).ok).toBe(true);
    expect((await run(rule, "ab")).ok).toBe(false);
  });

  it("串行校验返回第一个失败消息", async () => {
    const rule = every([
      customRule((v) => typeof v === "string", "必须是字符串"),
      customRule((v) => (v as string).length >= 3, "至少3位"),
    ]);
    const r = await run(rule, 123 as unknown);
    expect(r.ok).toBe(false);
    expect(r.message).toBe("必须是字符串"); // 第一条失败
  });
});

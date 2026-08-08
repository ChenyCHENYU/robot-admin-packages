import { describe, it, expect, vi } from "vitest";
import {
  whenSpec,
  compareWithSpec,
  debouncedAsyncCheckSpec,
  someSpec,
  everySpec,
  when,
  whenElement,
} from "../src/advanced";
import { createSpec } from "../src/utils";
import type { RuleSpec } from "../src/types";

const run = async (spec: RuleSpec, value: unknown) => {
  const r = await spec.validate(value);
  if (r === true) return { ok: true, message: null };
  return { ok: false, message: typeof r === "string" ? r : spec.message };
};

describe("whenSpec", () => {
  const thenRules = [createSpec("blur", (v) => v === "A", "必须是A")];
  it("条件为真时执行 thenRules", async () => {
    const rule = whenSpec(() => true, () => true, thenRules, []);
    expect((await run(rule, "A")).ok).toBe(true);
    const r = await run(rule, "B");
    expect(r.ok).toBe(false);
    expect(r.message).toBe("必须是A");
  });
  it("条件为假时执行 elseRules", async () => {
    const elseRules = [createSpec("blur", () => false, "else失败")];
    const rule = whenSpec(() => true, () => false, thenRules, elseRules);
    const r = await run(rule, "x");
    expect(r.ok).toBe(false);
    expect(r.message).toBe("else失败");
  });
  it("依赖值动态读取", async () => {
    let flag = "on";
    const rule = whenSpec(() => flag, (v) => v === "on", thenRules, []);
    expect((await run(rule, "A")).ok).toBe(true);
    flag = "off";
    expect((await run(rule, "A")).ok).toBe(true);
  });
});

describe("compareWithSpec", () => {
  it("gte", async () => {
    const rule = compareWithSpec("结束", () => 10, "gte");
    expect((await run(rule, 10)).ok).toBe(true);
    expect((await run(rule, 11)).ok).toBe(true);
    expect((await run(rule, 9)).ok).toBe(false);
  });
  it("空值放行", async () => {
    const rule = compareWithSpec("结束", () => 10, "gte");
    expect((await run(rule, null)).ok).toBe(true);
  });
  it("自定义消息", async () => {
    const rule = compareWithSpec("结束", () => 10, "gte", "不能早于开始");
    const r = await run(rule, 5);
    expect(r.message).toBe("不能早于开始");
  });
});

describe("debouncedAsyncCheckSpec", () => {
  it("空值放行", async () => {
    const rule = debouncedAsyncCheckSpec("用户名", async () => true, 0);
    expect((await run(rule, "")).ok).toBe(true);
  });
  it("返回 false 失败", async () => {
    const fn = vi.fn(async () => false);
    const rule = debouncedAsyncCheckSpec("用户名", fn, 0, "已被占用");
    const r = await run(rule, "test");
    expect(r.ok).toBe(false);
    expect(r.message).toBe("已被占用");
  });
});

describe("someSpec (OR)", () => {
  it("任一通过即成功", async () => {
    const rule = someSpec(
      [
        createSpec("blur", (v) => v === "a", ""),
        createSpec("blur", (v) => v === "b", ""),
      ],
      "请输入 a 或 b",
    );
    expect((await run(rule, "a")).ok).toBe(true);
    expect((await run(rule, "c")).ok).toBe(false);
  });
});

describe("everySpec (AND)", () => {
  it("串行返回第一个失败消息", async () => {
    const rule = everySpec([
      createSpec("blur", (v) => typeof v === "string", "必须是字符串"),
      createSpec("blur", (v) => (v as string).length >= 3, "至少3位"),
    ]);
    const r = await run(rule, 123 as unknown);
    expect(r.ok).toBe(false);
    expect(r.message).toBe("必须是字符串");
  });
});

describe("naive / element 包装一致性", () => {
  const thenRules = [createSpec("blur", (v) => v === "A", "必须是A")];
  it("when（naive）与 whenSpec 行为一致", async () => {
    const naive = when(() => true, () => true, thenRules, []);
    await expect(naive.validator?.(naive, "A")).resolves.toBeUndefined();
    await expect(naive.validator?.(naive, "B")).rejects.toThrow("必须是A");
  });
  it("whenElement（ele）通过 callback 报错", async () => {
    const el = whenElement(() => true, () => true, thenRules, []);
    return new Promise<void>((resolve) => {
      el.validator?.(el, "B", (err) => {
        expect(err).toBeInstanceOf(Error);
        resolve();
      });
    });
  });
});

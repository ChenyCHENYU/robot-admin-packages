import { describe, expect, it, vi } from "vitest";
import { every, some, when, PRESET_RULES } from "../src";
import type { NativeNaiveRule, NaiveRule } from "../src";

const run = (rule: NaiveRule, value: unknown) => rule.validator?.(rule, value);

describe("Naive native custom rule composition", () => {
  it.each([
    ["Error", () => new Error("native error"), "native error"],
    ["Error[]", () => [new Error("first"), new Error("second")], "first"],
    ["false", () => false, "fallback"],
    ["sync undefined", () => undefined, "不支持 callback 或同步 undefined"],
    [
      "throw",
      () => {
        throw new Error("thrown");
      },
      "thrown",
    ],
    [
      "Promise rejection",
      async () => {
        throw new Error("async error");
      },
      "async error",
    ],
  ])("does not silently accept %s", async (_name, validator, message) => {
    const rule = every([{ message: "fallback", validator }]);
    await expect(run(rule, "value")).rejects.toThrow(message);
  });

  it.each([
    ["true", () => true],
    ["empty Error[]", (): Error[] => []],
    ["Promise<void>", async () => undefined],
  ])("accepts %s as success", async (_name, validator) => {
    await expect(run(every([{ validator }]), "value")).resolves.toBeUndefined();
  });

  it("keeps asyncValidator and generated Promise<void> rules composable", async () => {
    await expect(
      run(
        every([
          {
            asyncValidator: async () => {
              throw new Error("asyncValidator error");
            },
          },
        ]),
        "bad",
      ),
    ).rejects.toThrow("asyncValidator error");
    const generated = every([PRESET_RULES.required("字段")]);
    await expect(
      run(every([generated, PRESET_RULES.minLength("字段", 2)]), "ok"),
    ).resolves.toBeUndefined();
    await expect(run(every([generated]), "")).rejects.toThrow("字段不能为空");
  });

  it("rejects ordinary callback signatures before invoking them", () => {
    const callback = vi.fn((_rule, _value, done) => {
      queueMicrotask(() => done(new Error("late failure")));
      return undefined;
    });
    expect(() => every([{ validator: callback }])).toThrow("不支持 callback");
    expect(callback).not.toHaveBeenCalled();
  });

  it.each(["default", "rest"] as const)(
    "rejects %s callback completion without early success or an uncaught late error",
    async (kind) => {
      const late = vi.fn();
      const validator =
        kind === "default"
          ? (
              _rule: unknown,
              _value: unknown,
              done = (_error?: Error) => {},
            ) => {
              queueMicrotask(() => {
                late();
                done(new Error("late failure"));
              });
              return undefined;
            }
          : (
              _rule: unknown,
              _value: unknown,
              ...args: Array<(error?: Error) => void>
            ) => {
              queueMicrotask(() => {
                late();
                args[0](new Error("late failure"));
              });
              return undefined;
            };
      expect(validator.length).toBe(2);
      await expect(run(every([{ validator }]), "value")).rejects.toThrow(
        "不支持 callback 或同步 undefined",
      );
      await Promise.resolve();
      expect(late).toHaveBeenCalledOnce();
    },
  );

  it.each(["default", "rest"] as const)(
    "rejects a synchronous %s callback even when it returns true",
    async (kind) => {
      const validator =
        kind === "default"
          ? (
              _rule: unknown,
              _value: unknown,
              done = (_error?: Error) => {},
            ) => {
              done(new Error("callback failure"));
              return true;
            }
          : (
              _rule: unknown,
              _value: unknown,
              ...args: Array<(error?: Error) => void>
            ) => {
              args[0](new Error("callback failure"));
              return true;
            };
      await expect(run(every([{ validator }]), "value")).rejects.toThrow(
        "不支持 callback",
      );
    },
  );

  it("rejects hidden callback use while a returned Promise is pending", async () => {
    const validator = (
      _rule: unknown,
      _value: unknown,
      done = (_error?: Error) => {},
    ) =>
      new Promise<void>((resolve) => {
        queueMicrotask(() => {
          done(new Error("callback failure"));
          resolve();
        });
      });
    await expect(run(every([{ validator }]), "value")).rejects.toThrow(
      "不支持 callback",
    );
  });

  it("keeps native failures in OR / conditional composition and short circuits AND", async () => {
    const later = vi.fn(() => true);
    const failure = { validator: () => new Error("native failure") };
    await expect(
      run(every([failure, { validator: later }]), "bad"),
    ).rejects.toThrow("native failure");
    expect(later).not.toHaveBeenCalled();
    await expect(
      run(some([failure, PRESET_RULES.required("字段")]), "ok"),
    ).resolves.toBeUndefined();
    await expect(
      run(
        when(() => true, Boolean, [failure]),
        "bad",
      ),
    ).rejects.toThrow("native failure");
  });

  it("does not silently accept an unsupported native return value", async () => {
    await expect(
      // @ts-expect-error exercise the runtime boundary for untyped JavaScript callers
      run(every([{ validator: () => "unexpected" }]), "value"),
    ).rejects.toThrow("不支持的结果");
  });

  it("rejects native constraints and contexts that cannot be faithfully composed", () => {
    expect(() => every([{ required: true }])).toThrow("自定义 validator");
    expect(() => every([{ min: 2, validator: () => true }])).toThrow(
      "声明式约束",
    );
    expect(() =>
      every([{ validator: (_rule, _value, _done, _source) => true }]),
    ).toThrow("source");
    expect(() => every([{ trigger: "focus", validator: () => true }])).toThrow(
      "trigger",
    );
  });

  it("rejects warning rules instead of turning a warning into a blocking error", async () => {
    const validator = vi.fn(() => new Error("warning message"));
    expect(() => every([{ level: "warning", validator }])).toThrow(
      "仅支持 error 级别",
    );
    expect(validator).not.toHaveBeenCalled();
    await expect(
      run(every([{ level: "error", validator: () => true }]), "value"),
    ).resolves.toBeUndefined();
  });

  it("snapshots native validators and messages", async () => {
    const source: NativeNaiveRule = {
      trigger: ["blur"],
      message: () => "original",
      validator: () => false,
    };
    const composed = every([source]);
    source.validator = () => true;
    source.message = "changed";
    (source.trigger as string[]).push("input");
    expect(composed.trigger).toBe("blur");
    await expect(run(composed, "value")).rejects.toThrow("original");
  });
});

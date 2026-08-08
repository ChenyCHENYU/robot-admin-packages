import { describe, it, expect } from "vitest";
import { validateValue, validateRecord, validateRows } from "../src/validate";
import {
  createSpec,
  createAsyncSpec,
  optional,
} from "../src/utils";
import { numeric, SPEC_RULES } from "../src/index";

describe("validateValue", () => {
  it("空规则数组返回 null", async () => {
    expect(await validateValue("any", [])).toBeNull();
  });

  it("全部通过返回 null", async () => {
    const rules = [createSpec("blur", (v) => !!v, "必填"), createSpec("blur", (v) => v === "ok", "必须ok")];
    expect(await validateValue("ok", rules)).toBeNull();
  });

  it("返回第一条失败消息", async () => {
    const rules = [
      createSpec("blur", () => false, "第一条失败"),
      createSpec("blur", () => false, "第二条失败"),
    ];
    expect(await validateValue("x", rules)).toBe("第一条失败");
  });

  it("validate 返回 string 时直接透传该消息", async () => {
    const rules = [createSpec("blur", () => "自定义消息", "默认")];
    expect(await validateValue("x", rules)).toBe("自定义消息");
  });

  it("支持异步规则", async () => {
    const rules = [createAsyncSpec("blur", async (v) => v === "valid", "异步失败")];
    expect(await validateValue("valid", rules)).toBeNull();
    expect(await validateValue("invalid", rules)).toBe("异步失败");
  });

  it("optional 包装的规则空值放行", async () => {
    const rules = [optional(createSpec("blur", (v) => v === "x", "格式错"))];
    expect(await validateValue("", rules)).toBeNull();
    expect(await validateValue(null, rules)).toBeNull();
    expect(await validateValue("y", rules)).toBe("格式错");
  });

  it("numeric 规则集成", async () => {
    const rules = [numeric({ kind: "integer", min: 1 }, "次数")];
    expect(await validateValue("5", rules)).toBeNull();
    expect(await validateValue("0", rules)).toBe("次数不能小于 1");
  });
});

describe("validateRecord", () => {
  const ruleMap = {
    name: [SPEC_RULES.required("姓名")],
    age: [numeric({ kind: "integer", min: 0 }, "年龄")],
  };

  it("全部通过返回 null", async () => {
    expect(await validateRecord({ name: "张三", age: 18 }, ruleMap)).toBeNull();
  });

  it("返回第一个失败字段", async () => {
    const err = await validateRecord({ name: "", age: 18 }, ruleMap);
    expect(err).toEqual({ field: "name", message: "姓名不能为空" });
  });

  it("第一个字段通过后校验第二个", async () => {
    const err = await validateRecord({ name: "张三", age: -1 }, ruleMap);
    expect(err?.field).toBe("age");
    expect(err?.message).toContain("年龄");
  });

  it("ruleMap 中缺失的字段为 undefined 时，非必填规则放行", async () => {
    // age 是 numeric（非必填），缺失 = undefined，应放行
    expect(await validateRecord({ name: "张三" }, ruleMap)).toBeNull();
  });

  it("ruleMap 中缺失的字段，若规则含 required 则报错", async () => {
    const err = await validateRecord({}, { name: [SPEC_RULES.required("姓名")] });
    expect(err?.field).toBe("name");
    expect(err?.message).toBe("姓名不能为空");
  });

  it("空 ruleMap 返回 null", async () => {
    expect(await validateRecord({ a: 1 }, {})).toBeNull();
  });
});

describe("validateRows", () => {
  const ruleMap = {
    qty: [numeric({ kind: "integer", min: 1 }, "数量")],
  };

  it("全部通过返回 null", async () => {
    expect(await validateRows([{ qty: 1 }, { qty: 2 }], ruleMap)).toBeNull();
  });

  it("返回第一失败行号与字段", async () => {
    const err = await validateRows([{ qty: 1 }, { qty: 0 }], ruleMap);
    expect(err?.rowIndex).toBe(1);
    expect(err?.field).toBe("qty");
  });

  it("startIndex 偏移行号（展示「第N行」）", async () => {
    const err = await validateRows([{ qty: 0 }], ruleMap, { startIndex: 1 });
    expect(err?.rowIndex).toBe(1);
  });

  it("空行数组返回 null", async () => {
    expect(await validateRows([], ruleMap)).toBeNull();
  });
});

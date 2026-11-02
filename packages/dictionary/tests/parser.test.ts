import { describe, expect, it, vi } from "vitest";
import { createDictionaryParser } from "../src";

describe("独立字典输入解析", () => {
  it("严格原码保留类型，字符串编码优先于同名标签，前导零不推断为数字", () => {
    const parse = createDictionaryParser([
      { value: 0, label: "零" },
      { value: "0", label: "字符串零" },
      { value: false, label: "停用", disabled: true },
      { value: "false", label: "字符串假" },
      { value: 1, label: "一" },
      { value: 2, label: "1" },
      { value: "001", label: "前导零" },
      { value: 3, label: "001" },
    ]);
    expect(parse(0)).toBe(0);
    expect(parse("0")).toBe("0");
    expect(parse(false)).toBe(false);
    expect(parse("false")).toBe("false");
    expect(parse("1")).toBe(1);
    expect(parse("001")).toBe("001");
    expect(parse("0001")).toBe("0001");
    expect(parse("前导零")).toBe("001");
  });

  it("标签还原原始值，空值与未知值保留，字符串不裁剪或隐式拆分", () => {
    const object = { unknown: true };
    const parse = createDictionaryParser([
      { value: 0, label: "零" },
      { value: false, label: "停用" },
      { value: "", label: "空码" },
      { value: "space", label: " 带空格 " },
      { value: "empty-label", label: "" },
    ]);
    expect(parse("零")).toBe(0);
    expect(parse("停用")).toBe(false);
    expect(parse("空码")).toBe("");
    expect(parse(" 带空格 ")).toBe("space");
    expect(parse("带空格")).toBe("带空格");
    expect(parse("零,停用")).toBe("零,停用");
    for (const value of ["", null, undefined, true, 42, NaN, object])
      expect(parse(value)).toBe(value);
  });

  it("重复标签拒绝反向解析，但有效原码不受标签歧义影响", () => {
    const parse = createDictionaryParser([
      { value: 0, label: "重复" },
      { value: false, label: "重复" },
      { value: 1, label: "0" },
      { value: 2, label: "0" },
    ]);
    expect(() => parse("重复")).toThrow(TypeError);
    expect(() => parse("重复")).toThrow("歧义");
    expect(parse("0")).toBe(0);
    expect(parse(0)).toBe(0);
    expect(parse(false)).toBe(false);
  });

  it("数组逐项解析、不改原数组，包含歧义时拒绝整次输入", () => {
    const parse = createDictionaryParser([
      { value: 0, label: "零" },
      { value: false, label: "否" },
      { value: 1, label: "歧义" },
      { value: 2, label: "歧义" },
    ]);
    const input = Object.freeze(["零", false, "未知", ["否", ""]]);
    const output = parse(input);
    expect(output).toEqual([0, false, "未知", [false, ""]]);
    expect(output).not.toBe(input);
    expect(input[0]).toBe("零");
    const invalid = ["零", "歧义"];
    expect(() => parse(invalid)).toThrow("歧义");
    expect(invalid).toEqual(["零", "歧义"]);
  });

  it("首次字符串解析才建索引，同一快照的多次输入不重复读取选项", () => {
    const label = vi.fn(() => "零");
    const options = [
      {
        value: 0,
        get label() {
          return label();
        },
      },
    ];
    const getOptions = vi.fn(() => options);
    const parse = createDictionaryParser(getOptions);
    expect(getOptions).not.toHaveBeenCalled();
    expect(parse([0, false, "", null])).toEqual([0, false, "", null]);
    expect(getOptions).not.toHaveBeenCalled();
    expect(parse("零")).toBe(0);
    const reads = label.mock.calls.length;
    for (let i = 0; i < 1_000; i++) expect(parse("零")).toBe(0);
    expect(label).toHaveBeenCalledTimes(reads);
    expect(getOptions).toHaveBeenCalledTimes(1_001);
  });

  it("替换快照才更新索引，更新失败不使用半成品，修正后可恢复", () => {
    let options = [{ value: 0, label: "旧值" }];
    const parse = createDictionaryParser(() => options);
    expect(parse("旧值")).toBe(0);
    options[0].label = "未替换快照";
    expect(parse("旧值")).toBe(0);
    expect(parse("未替换快照")).toBe("未替换快照");
    options = [{ value: 1, label: "新值" }];
    expect(parse("旧值")).toBe("旧值");
    expect(parse("新值")).toBe(1);
    options = [
      { value: 1, label: "半成品" },
      { value: 1, label: "重复编码" },
    ];
    expect(() => parse("半成品")).toThrow("value 不得重复");
    options = [{ value: 2, label: "恢复" }];
    expect(parse("恢复")).toBe(2);
    expect(parse("半成品")).toBe("半成品");
  });

  it("空快照保持原输入，非法选项或 getter 失败不会静默吞掉", () => {
    const empty = createDictionaryParser([]);
    expect(empty("未知")).toBe("未知");
    const invalid = createDictionaryParser([
      { value: Infinity, label: "非法" },
    ]);
    expect(() => invalid("非法")).toThrow("有效的原始 value");
    const badShape = createDictionaryParser(null as never);
    expect(() => badShape("非法")).toThrow("选项必须是数组");
    const failure = new Error("snapshot unavailable");
    const denied = createDictionaryParser(() => {
      throw failure;
    });
    expect(() => denied("未知")).toThrow(failure);
  });
});

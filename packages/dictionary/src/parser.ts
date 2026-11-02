import type { DictionaryOption, DictionaryValue } from "./types";
import { defineEnum } from "./values";

type Options = readonly Pick<
  DictionaryOption,
  "value" | "label" | "disabled"
>[];
const ambiguous = Symbol("ambiguous dictionary input");
type Match = DictionaryValue | typeof ambiguous;

function addMatch(
  index: Map<string, Match>,
  text: string,
  value: DictionaryValue,
): void {
  const previous = index.get(text);
  index.set(
    text,
    previous !== undefined && previous !== value ? ambiguous : value,
  );
}

/** 将导入的标签或字符串编码解析为原码；选项须为不可变快照，变化时替换数组。 */
export function createDictionaryParser(
  options: Options | (() => Options),
): (input: unknown) => unknown {
  let snapshot: Options | undefined;
  let keys = new Set<DictionaryValue>();
  let codes = new Map<string, Match>();
  let labels = new Map<string, Match>();

  const indexes = () => {
    const next = typeof options === "function" ? options() : options;
    if (next === snapshot) return;
    const nextKeys = new Set<DictionaryValue>();
    const nextCodes = new Map<string, Match>();
    const nextLabels = new Map<string, Match>();
    // 复用标准选项校验；索引只保存原始值与标签，不引用调用方可变对象。
    for (const option of defineEnum(next)) {
      nextKeys.add(option.value);
      addMatch(nextCodes, String(option.value), option.value);
      addMatch(nextLabels, option.label, option.value);
    }
    // 完整构建成功才移交快照，异常不能把半成品或旧结果标记为当前数据。
    snapshot = next;
    keys = nextKeys;
    codes = nextCodes;
    labels = nextLabels;
  };
  const parse = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(parse);
    if (typeof input !== "string" || input === "") return input;
    indexes();
    // 严格原码优先；其后才接受字符串化编码，最后尝试标签，不隐式转数字或拆分。
    if (keys.has(input)) return input;
    const match = codes.get(input) ?? labels.get(input);
    if (match === ambiguous)
      throw new TypeError(`[dictionary] 字典输入存在歧义：${input}`);
    return match ?? input;
  };
  return parse;
}

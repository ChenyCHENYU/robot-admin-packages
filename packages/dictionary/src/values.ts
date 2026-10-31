/**
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-11-01
 * @Description: 不可变选项快照及保留原值类型的字典翻译。
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import type {
  DictionaryLabelOptions,
  DictionaryOption,
  DictionaryValue,
} from "./types";

export const EMPTY_OPTIONS: readonly DictionaryOption[] = Object.freeze([]);

export function isDictionaryValue(value: unknown): value is DictionaryValue {
  return (
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

/** 验证并复制顶层选项，不改写调用方数据或推断编码类型。 */
export function defineEnum<T extends DictionaryOption>(
  options: readonly T[],
): readonly Readonly<T>[] {
  if (!Array.isArray(options))
    throw new TypeError("[dictionary] 选项必须是数组。");
  const seen = new Set<DictionaryValue>();
  return Object.freeze(
    options.map((option) => {
      if (
        !option ||
        !isDictionaryValue(option.value) ||
        typeof option.label !== "string"
      ) {
        throw new TypeError(
          "[dictionary] 选项必须包含有效的原始 value 和字符串 label。",
        );
      }
      if (
        option.disabled !== undefined &&
        typeof option.disabled !== "boolean"
      ) {
        throw new TypeError("[dictionary] disabled 必须是 boolean。");
      }
      if (seen.has(option.value))
        throw new TypeError("[dictionary] 选项 value 不得重复。");
      seen.add(option.value);
      return Object.freeze({ ...option });
    }),
  );
}

export function formatLabels(
  value: unknown,
  resolve: (key: DictionaryValue) => string | undefined,
  options: DictionaryLabelOptions = {},
): string {
  const empty = options.empty ?? "—";
  const one = (item: unknown): string => {
    if (isDictionaryValue(item)) {
      const label = resolve(item);
      if (label !== undefined) return label;
    }
    if (item == null || item === "") return empty;
    return typeof options.unknown === "function"
      ? options.unknown(item)
      : (options.unknown ?? String(item));
  };
  let values: readonly unknown[] | undefined;
  if (Array.isArray(value)) values = value;
  else if (typeof value === "string" && options.split !== undefined) {
    values = value
      .split(options.split)
      .map((item) => item.trim())
      .filter((item) => item !== "");
  }
  return values
    ? values.length
      ? values.map(one).join(options.separator ?? "、")
      : empty
    : one(value);
}

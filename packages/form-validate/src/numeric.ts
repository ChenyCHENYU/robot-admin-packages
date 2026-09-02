/**
 * 数据库数值契约验证
 *
 * 对标 SQL DECIMAL(p, s) 字段契约，校验整数/小数格式、有限性、总位数、
 * 小数位数、取值范围。语义为「非必填」：值为空时直接放行。
 */

import type { RuleSpec, ValidateResult } from "./types";
import { isBlank } from "./utils";

/**
 * 数值契约，对标数据库 DECIMAL(p, s) 字段定义。
 */
export interface NumericContract {
  /** integer 只接受整数；decimal 接受普通十进制数。默认 decimal。 */
  kind?: "integer" | "decimal";
  /** 数据库 DECIMAL(p, s) 中的 p（数字总位数，不含符号）。 */
  totalDigits?: number;
  /** 数据库 DECIMAL(p, s) 中的 s（小数位数）。 */
  fractionDigits?: number;
  /** 最小值 */
  min?: number;
  /** 最大值 */
  max?: number;
  /** 是否为开区间下界（true 表示必须严格大于 min） */
  minExclusive?: boolean;
  /** 是否为开区间上界（true 表示必须严格小于 max） */
  maxExclusive?: boolean;
}

const INTEGER_PATTERN = /^[+-]?\d+$/;
const DECIMAL_PATTERN = /^[+-]?(?:\d+|\d+\.\d+|\.\d+)$/;

const normalizedText = (value: unknown) =>
  typeof value === "number" ? String(value) : String(value).trim();

const digitCounts = (text: string) => {
  const unsigned = text.replace(/^[+-]/, "");
  const [rawInteger = "", fraction = ""] = unsigned.split(".");
  const integerDigits = rawInteger.replace(/^0+/, "").length;
  return {
    total: Math.max(integerDigits + fraction.length, 1),
    fraction: fraction.length,
  };
};

const assertNumericContract = (contract: NumericContract): void => {
  if (
    contract.kind !== undefined &&
    contract.kind !== "integer" &&
    contract.kind !== "decimal"
  ) {
    throw new TypeError("numeric.kind 必须是 integer 或 decimal");
  }

  if (
    contract.totalDigits !== undefined &&
    (!Number.isInteger(contract.totalDigits) || contract.totalDigits < 1)
  ) {
    throw new RangeError("numeric.totalDigits 必须是大于 0 的整数");
  }

  if (
    contract.fractionDigits !== undefined &&
    (!Number.isInteger(contract.fractionDigits) || contract.fractionDigits < 0)
  ) {
    throw new RangeError("numeric.fractionDigits 必须是非负整数");
  }

  if (
    contract.totalDigits !== undefined &&
    contract.fractionDigits !== undefined &&
    contract.fractionDigits > contract.totalDigits
  ) {
    throw new RangeError("numeric.fractionDigits 不能大于 totalDigits");
  }

  if (contract.min !== undefined && !Number.isFinite(contract.min)) {
    throw new RangeError("numeric.min 必须是有限数值");
  }

  if (contract.max !== undefined && !Number.isFinite(contract.max)) {
    throw new RangeError("numeric.max 必须是有限数值");
  }

  if (
    contract.min !== undefined &&
    contract.max !== undefined &&
    contract.min > contract.max
  ) {
    throw new RangeError("numeric.min 不能大于 max");
  }
};

/**
 * 创建数据库数值契约验证规则（RuleSpec）。
 *
 * @example
 * numeric({ kind: 'decimal', totalDigits: 11, fractionDigits: 3, min: 0 }, '温度')
 */
export function numeric(
  contract: NumericContract,
  field: string = "数值",
): RuleSpec {
  assertNumericContract(contract);
  const {
    kind = "decimal",
    totalDigits,
    fractionDigits,
    min,
    max,
    minExclusive,
    maxExclusive,
  } = contract;

  return {
    trigger: "blur",
    message: `${field}格式不正确`,
    validate: (value): ValidateResult => {
      if (isBlank(value)) return true;
      if (typeof value !== "number" && typeof value !== "string") {
        return `${field}必须是数字`;
      }

      const text = normalizedText(value);
      const pattern = kind === "integer" ? INTEGER_PATTERN : DECIMAL_PATTERN;

      if (!pattern.test(text)) {
        return kind === "integer"
          ? `${field}请输入合法整数`
          : `${field}请输入合法数字`;
      }

      const num = Number(text);
      if (!Number.isFinite(num)) {
        return `${field}请输入有限的合法数字`;
      }

      const counts = digitCounts(text);
      if (totalDigits !== undefined && counts.total > totalDigits) {
        return `${field}数字总位数不能超过 ${totalDigits} 位`;
      }
      if (fractionDigits !== undefined && counts.fraction > fractionDigits) {
        return `${field}小数位数不能超过 ${fractionDigits} 位`;
      }

      if (min !== undefined && (minExclusive ? num <= min : num < min)) {
        return `${field}${minExclusive ? "必须大于" : "不能小于"} ${min}`;
      }

      if (max !== undefined && (maxExclusive ? num >= max : num > max)) {
        return `${field}${maxExclusive ? "必须小于" : "不能大于"} ${max}`;
      }

      return true;
    },
  };
}

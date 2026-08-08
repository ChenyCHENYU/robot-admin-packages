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
  const integer = rawInteger.replace(/^0+(?=\d)/, "") || "0";
  return {
    total: integer.length + fraction.length,
    fraction: fraction.length,
  };
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
  const kind = contract.kind ?? "decimal";

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
      if (
        contract.totalDigits !== undefined &&
        counts.total > contract.totalDigits
      ) {
        return `${field}数字总位数不能超过 ${contract.totalDigits} 位`;
      }
      if (
        contract.fractionDigits !== undefined &&
        counts.fraction > contract.fractionDigits
      ) {
        return `${field}小数位数不能超过 ${contract.fractionDigits} 位`;
      }

      if (
        contract.min !== undefined &&
        (contract.minExclusive ? num <= contract.min : num < contract.min)
      ) {
        return `${field}${contract.minExclusive ? "必须大于" : "不能小于"} ${contract.min}`;
      }

      if (
        contract.max !== undefined &&
        (contract.maxExclusive ? num >= contract.max : num > contract.max)
      ) {
        return `${field}${contract.maxExclusive ? "必须小于" : "不能大于"} ${contract.max}`;
      }

      return true;
    },
  };
}

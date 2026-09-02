/**
 * @description CSV 解析和生成工具
 * 支持 CSV 文件读取、生成、下载，兼容 Excel 的 UTF-8 BOM
 */

import {
  getFileUtilsContext,
  type FileUtilsContext,
} from "../config";
import {
  assertWithinLimit,
  downloadBlob,
  FileUtilsError,
  throwIfAborted,
} from "../types";

// ==================== 类型定义 ====================

export interface CSVOptions {
  /** 分隔符，默认逗号 */
  delimiter?: string;
  /** 自定义表头 */
  headers?: string[];
  /** 跳过空行，默认 true */
  skipEmptyLines?: boolean;
  /** 是否添加 BOM（Excel 兼容），默认 true */
  withBOM?: boolean;
  /** Spreadsheet formula injection policy. Default: escape. */
  formulaPolicy?: "escape" | "preserve" | "reject";
  strictColumnCount?: boolean;
  allowEmptyHeaders?: boolean;
  dangerousHeaders?: "reject" | "allow";
  maxRows?: number;
  maxColumns?: number;
  maxFieldLength?: number;
  maxOutputSize?: number;
  maxFileSize?: number;
  signal?: AbortSignal;
}

export interface UseCSVOptions {
  context?: FileUtilsContext;
}

// ==================== 内部工具函数 ====================

function validateDelimiter(delimiter: string): void {
  if (!delimiter || /["\r\n]/.test(delimiter)) {
    throw new RangeError("CSV 分隔符不能为空，且不能包含引号或换行符");
  }
}

/**
 * @description 按 RFC 4180 解析完整 CSV 文档（支持引号字段内换行）
 */
function parseCSVRecords(
  content: string,
  delimiter: string,
  options: CSVOptions,
): string[][] {
  validateDelimiter(delimiter);
  if (content.length === 0) return [];

  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let inQuotes = false;
  let afterQuote = false;
  let recordStarted = false;
  const maxRows = options.maxRows!;
  const maxColumns = options.maxColumns!;
  const maxFieldLength = options.maxFieldLength!;

  const finishField = () => {
    assertWithinLimit(field.length, maxFieldLength, "CSV 字段长度");
    record.push(field);
    assertWithinLimit(record.length, maxColumns, "CSV 列数");
    field = "";
    afterQuote = false;
  };
  const finishRecord = () => {
    finishField();
    records.push(record);
    assertWithinLimit(records.length, maxRows + 1, "CSV 行数");
    record = [];
    recordStarted = false;
  };

  for (let i = 0; i < content.length; i++) {
    if ((i & 4095) === 0) throwIfAborted(options.signal);
    const char = content[i];

    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
          afterQuote = true;
        }
      } else {
        field += char;
        assertWithinLimit(field.length, maxFieldLength, "CSV 字段长度");
      }
      continue;
    }

    if (content.startsWith(delimiter, i)) {
      finishField();
      recordStarted = true;
      i += delimiter.length - 1;
      continue;
    }

    if (char === "\r" || char === "\n") {
      finishRecord();
      if (char === "\r" && content[i + 1] === "\n") i++;
      continue;
    }

    if (afterQuote) {
      // 兼容常见导出器在闭合引号后、分隔符前插入的空白。
      if (char === " " || char === "\t") continue;
      throw new SyntaxError(`CSV 第 ${i + 1} 个字符处存在非法的引号后内容`);
    }

    if (char === '"') {
      if (field.length > 0) {
        throw new SyntaxError(`CSV 第 ${i + 1} 个字符处存在未转义的引号`);
      }
      inQuotes = true;
      recordStarted = true;
      continue;
    }

    field += char;
    assertWithinLimit(field.length, maxFieldLength, "CSV 字段长度");
    recordStarted = true;
  }

  if (inQuotes) throw new SyntaxError("CSV 存在未闭合的引号字段");
  if (recordStarted || record.length > 0 || field.length > 0 || afterQuote) {
    finishRecord();
  }

  return records;
}

/**
 * @description 转义 CSV 字段
 */
function escapeCSVField(field: string, delimiter: string): string {
  if (
    field.includes(delimiter) ||
    field.includes('"') ||
    field.includes("\n") ||
    field.includes("\r")
  ) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

const DANGEROUS_HEADERS = new Set(["__proto__", "prototype", "constructor"]);
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function protectFormula(
  value: string,
  policy: NonNullable<CSVOptions["formulaPolicy"]>,
): string {
  if (!FORMULA_PREFIX.test(value)) return value;
  if (policy === "reject") {
    throw new FileUtilsError(
      "INVALID_CONTENT",
      "CSV 字段可能触发电子表格公式执行",
      { details: { value: value.slice(0, 100) } },
    );
  }
  return policy === "escape" ? `'${value}` : value;
}

// ==================== 主 Hook ====================

/**
 * @description CSV 处理工具
 * @example
 * ```ts
 * import { useCSV } from '@robot-admin/file-utils'
 *
 * const csv = useCSV()
 *
 * // 解析 CSV 字符串
 * const data = csv.parse(csvString)
 *
 * // 生成 CSV 并下载
 * csv.download(data, '导出.csv')
 *
 * // 读取 CSV 文件
 * const fileData = await csv.readFile(file)
 * ```
 */
export function useCSV(factoryOptions: UseCSVOptions = {}) {
  const context = () => getFileUtilsContext(factoryOptions.context);
  const withLimits = (options: CSVOptions): CSVOptions => ({
    maxRows: context().limits.maxRows,
    maxColumns: context().limits.maxColumns,
    maxFieldLength: context().limits.maxFieldLength,
    maxOutputSize: context().limits.maxOutputSize,
    maxFileSize: context().limits.maxFileSize,
    ...options,
  });
  /**
   * @description 解析 CSV 字符串为对象数组
   */
  const parse = (
    content: string,
    options: CSVOptions = {},
  ): Record<string, any>[] => {
    const effective = withLimits(options);
    throwIfAborted(effective.signal);
    const { delimiter = ",", skipEmptyLines = true } = effective;

    validateDelimiter(delimiter);

    // 只移除文档开头的 UTF-8 BOM
    const cleanContent = content.replace(/^\uFEFF/, "");
    let records = parseCSVRecords(cleanContent, delimiter, effective);

    if (skipEmptyLines) {
      records = records.filter(
        (record) => !(record.length === 1 && record[0].trim() === ""),
      );
    }

    if (records.length === 0) return [];

    const headers =
      effective.headers ||
      records[0].map((header) => header.trim());
    const duplicateHeader = headers.find(
      (header, index) => headers.indexOf(header) !== index,
    );
    if (duplicateHeader !== undefined) {
      throw new SyntaxError(`CSV 存在重复表头: ${duplicateHeader}`);
    }
    if (!effective.allowEmptyHeaders && headers.some((header) => !header)) {
      throw new SyntaxError("CSV 表头不能为空");
    }
    if (
      effective.dangerousHeaders !== "allow" &&
      headers.some((header) => DANGEROUS_HEADERS.has(header))
    ) {
      throw new SyntaxError("CSV 表头包含危险对象属性名");
    }
    const startIndex = effective.headers ? 0 : 1;

    return records
      .slice(startIndex)
      .map((values) => {
        if ((effective.strictColumnCount ?? true) && values.length !== headers.length) {
          throw new SyntaxError(
            `CSV 列数不一致：期望 ${headers.length} 列，实际 ${values.length} 列`,
          );
        }
        const obj = Object.create(null) as Record<string, any>;
        headers.forEach((h, i) => {
          obj[h] = values[i] !== undefined ? values[i] : "";
        });
        return obj;
      });
  };

  /**
   * @description 将对象数组生成为 CSV 字符串
   */
  const generate = (
    data: Record<string, any>[],
    options: CSVOptions = {},
  ): string => {
    const effective = withLimits(options);
    throwIfAborted(effective.signal);
    if (!data.length) return "";

    const { delimiter = "," } = effective;
    validateDelimiter(delimiter);
    const headers = effective.headers || Object.keys(data[0]);
    assertWithinLimit(
      data.length,
      effective.maxRows!,
      "CSV 行数",
    );
    assertWithinLimit(
      headers.length,
      effective.maxColumns!,
      "CSV 列数",
    );
    const policy = effective.formulaPolicy ?? "escape";

    const rows = [
      headers
        .map((h) => escapeCSVField(protectFormula(h, policy), delimiter))
        .join(delimiter),
      ...data.map((row, index) => {
        if ((index & 255) === 0) throwIfAborted(effective.signal);
        return headers
          .map((h) =>
            escapeCSVField(
              protectFormula(String(row[h] ?? ""), policy),
              delimiter,
            ),
          )
          .join(delimiter);
      }),
    ];
    const output = rows.join("\r\n");
    assertWithinLimit(
      new Blob([output]).size,
      effective.maxOutputSize!,
      "CSV 输出",
    );
    return output;
  };

  /**
   * @description 生成 CSV 并下载
   */
  const download = (
    data: Record<string, any>[],
    fileName = "export.csv",
    options: CSVOptions = {},
  ): void => {
    const { withBOM = true } = options;
    const csv = generate(data, options);
    const content = withBOM ? "\uFEFF" + csv : csv;
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, fileName);
  };

  /**
   * @description 读取 CSV 文件并解析
   */
  const readFile = async (
    file: File,
    options?: CSVOptions,
  ): Promise<Record<string, any>[]> => {
    const effective = withLimits(options ?? {});
    throwIfAborted(effective.signal);
    assertWithinLimit(file.size, effective.maxFileSize!, "CSV 文件大小");
    const text = await file.text();
    throwIfAborted(effective.signal);
    return parse(text, effective);
  };

  return { parse, generate, download, readFile };
}

/**
 * @description CSV 解析和生成工具
 * 支持 CSV 文件读取、生成、下载，兼容 Excel 的 UTF-8 BOM
 */

import { downloadBlob } from "../types";

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
function parseCSVRecords(content: string, delimiter: string): string[][] {
  validateDelimiter(delimiter);
  if (content.length === 0) return [];

  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let inQuotes = false;
  let afterQuote = false;
  let recordStarted = false;

  const finishField = () => {
    record.push(field);
    field = "";
    afterQuote = false;
  };
  const finishRecord = () => {
    finishField();
    records.push(record);
    record = [];
    recordStarted = false;
  };

  for (let i = 0; i < content.length; i++) {
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
export function useCSV() {
  /**
   * @description 解析 CSV 字符串为对象数组
   */
  const parse = (
    content: string,
    options: CSVOptions = {},
  ): Record<string, any>[] => {
    const { delimiter = ",", skipEmptyLines = true } = options;

    validateDelimiter(delimiter);

    // 只移除文档开头的 UTF-8 BOM
    const cleanContent = content.replace(/^\uFEFF/, "");
    let records = parseCSVRecords(cleanContent, delimiter);

    if (skipEmptyLines) {
      records = records.filter(
        (record) => !(record.length === 1 && record[0].trim() === ""),
      );
    }

    if (records.length === 0) return [];

    const headers =
      options.headers ||
      records[0].map((header) => header.trim());
    const duplicateHeader = headers.find(
      (header, index) => headers.indexOf(header) !== index,
    );
    if (duplicateHeader !== undefined) {
      throw new SyntaxError(`CSV 存在重复表头: ${duplicateHeader}`);
    }
    const startIndex = options.headers ? 0 : 1;

    return records
      .slice(startIndex)
      .map((values) => {
        const obj: Record<string, any> = {};
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
    if (!data.length) return "";

    const { delimiter = "," } = options;
    validateDelimiter(delimiter);
    const headers = options.headers || Object.keys(data[0]);

    const rows = [
      headers.map((h) => escapeCSVField(h, delimiter)).join(delimiter),
      ...data.map((row) =>
        headers
          .map((h) => escapeCSVField(String(row[h] ?? ""), delimiter))
          .join(delimiter),
      ),
    ];
    return rows.join("\r\n");
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
    const text = await file.text();
    return parse(text, options);
  };

  return { parse, generate, download, readFile };
}

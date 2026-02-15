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

/**
 * @description 解析 CSV 行（处理引号字段）
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
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

    // 移除 BOM
    const cleanContent = content.replace(/^\uFEFF/, "");
    let lines = cleanContent.split(/\r?\n/);

    if (skipEmptyLines) {
      lines = lines.filter((line) => line.trim() !== "");
    }

    if (lines.length === 0) return [];

    const headers =
      options.headers ||
      parseCSVLine(lines[0], delimiter).map((h) =>
        h.replace(/^"|"$/g, "").trim(),
      );
    const startIndex = options.headers ? 0 : 1;

    return lines
      .slice(startIndex)
      .filter((line) => line.trim())
      .map((line) => {
        const values = parseCSVLine(line, delimiter);
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
    const headers = options.headers || Object.keys(data[0]);

    const rows = [
      headers.map((h) => escapeCSVField(h, delimiter)).join(delimiter),
      ...data.map((row) =>
        headers
          .map((h) => escapeCSVField(String(row[h] ?? ""), delimiter))
          .join(delimiter),
      ),
    ];
    return rows.join("\n");
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

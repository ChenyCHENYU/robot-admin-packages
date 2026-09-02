import { computed, ref, type ComputedRef, type Ref } from "vue";
import * as XLSX from "xlsx";
import type { WorkBook } from "xlsx";
import { getFileUtilsContext, type FileUtilsContext } from "../config";
import {
  assertWithinLimit,
  downloadBlob,
  FileUtilsError,
  sanitizeFileName,
  throwIfAborted,
} from "../types";

export type ExcelRow = Record<string, unknown>;
export interface ExcelData {
  [sheetName: string]: ExcelRow[];
}

export type SpreadsheetFormulaPolicy = "escape" | "preserve" | "reject";

export interface ExcelReadOptions {
  signal?: AbortSignal;
  maxFileSize?: number;
  maxSheets?: number;
  maxRows?: number;
  maxColumns?: number;
  allowEmptyHeaders?: boolean;
  dangerousHeaders?: "reject" | "allow";
}

export interface ExcelConfig {
  fileName?: string;
  sheetName?: string;
  autoFitColumns?: boolean;
  formulaPolicy?: SpreadsheetFormulaPolicy;
  signal?: AbortSignal;
  maxRows?: number;
  maxColumns?: number;
  maxOutputSize?: number;
}

export interface ExcelTemplate {
  name: string;
  headers: string[];
  description?: string;
}

export interface UseExcelOptions {
  context?: FileUtilsContext;
}

export interface UseExcelReturn {
  loading: Ref<boolean>;
  error: Ref<string | null>;
  workbook: Ref<WorkBook | null>;
  sheets: ComputedRef<string[]>;
  data: Ref<ExcelData>;
  readFile: (file: File | Blob, options?: ExcelReadOptions) => Promise<ExcelData>;
  exportToExcel: (data: ExcelRow[], config?: ExcelConfig) => Promise<void>;
  exportMultipleSheets: (
    sheetsData: Record<string, ExcelRow[]>,
    fileName?: string,
    config?: Omit<ExcelConfig, "fileName" | "sheetName">,
  ) => Promise<void>;
  generateTemplate: (
    template: ExcelTemplate,
    config?: Omit<ExcelConfig, "sheetName">,
  ) => Promise<void>;
  getPresetTemplates: () => ExcelTemplate[];
  clearData: () => void;
  clearError: () => void;
}

const DANGEROUS_HEADERS = new Set(["__proto__", "prototype", "constructor"]);
const FORMULA_PREFIX = /^[=+\-@\t\r]/;
const INVALID_SHEET_NAME = /[\\/?*\[\]:]/g;
const DEFAULT_MAX_SHEETS = 100;

function protectFormula(
  value: unknown,
  policy: SpreadsheetFormulaPolicy,
): unknown {
  if (typeof value !== "string" || !FORMULA_PREFIX.test(value)) return value;
  if (policy === "reject") {
    throw new FileUtilsError(
      "INVALID_CONTENT",
      "Excel 字段可能触发电子表格公式执行",
      { details: { value: value.slice(0, 100) } },
    );
  }
  return policy === "escape" ? `'${value}` : value;
}

function cleanExportData(
  rows: ExcelRow[],
  policy: SpreadsheetFormulaPolicy,
): ExcelRow[] {
  return rows.map((row) => {
    const cleanRow: ExcelRow = Object.create(null) as ExcelRow;
    for (const [key, value] of Object.entries(row)) {
      if (key === "__rowIndex") continue;
      cleanRow[key] = protectFormula(value, policy);
    }
    return cleanRow;
  });
}

function validateHeaders(
  rawHeaders: unknown[],
  options: ExcelReadOptions,
): string[] {
  const headers = rawHeaders.map((header) => String(header ?? "").trim());
  if (!options.allowEmptyHeaders && headers.some((header) => !header)) {
    throw new FileUtilsError("INVALID_CONTENT", "Excel 表头不能为空");
  }
  const duplicate = headers.find(
    (header, index) => headers.indexOf(header) !== index,
  );
  if (duplicate !== undefined) {
    throw new FileUtilsError("INVALID_CONTENT", `Excel 存在重复表头：${duplicate}`);
  }
  if (
    options.dangerousHeaders !== "allow" &&
    headers.some((header) => DANGEROUS_HEADERS.has(header))
  ) {
    throw new FileUtilsError("INVALID_CONTENT", "Excel 表头包含危险对象属性名");
  }
  return headers;
}

function getWorksheetDimensions(worksheet: XLSX.WorkSheet): {
  rows: number;
  columns: number;
} {
  const reference = worksheet["!ref"];
  if (!reference) return { rows: 0, columns: 0 };
  let range: XLSX.Range;
  try {
    range = XLSX.utils.decode_range(reference);
  } catch (cause) {
    throw new FileUtilsError("INVALID_CONTENT", "Excel 工作表范围无效", {
      cause,
      details: { reference },
    });
  }
  return {
    rows: Math.max(0, range.e.r - range.s.r + 1),
    columns: Math.max(0, range.e.c - range.s.c + 1),
  };
}

function processWorksheetData(
  worksheet: XLSX.WorkSheet,
  options: ExcelReadOptions,
  limits: { maxRows: number; maxColumns: number },
): ExcelRow[] {
  const dimensions = getWorksheetDimensions(worksheet);
  assertWithinLimit(dimensions.rows, limits.maxRows + 1, "Excel 行数");
  assertWithinLimit(dimensions.columns, limits.maxColumns, "Excel 列数");

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
    blankrows: false,
    raw: true,
  });
  if (matrix.length === 0) return [];

  const headers = validateHeaders(matrix[0], options);
  return matrix
    .slice(1)
    .filter((row) =>
      row.some((cell) => cell !== "" && cell !== null && cell !== undefined),
    )
    .map((row, index) => {
      const record: ExcelRow = Object.create(null) as ExcelRow;
      headers.forEach((header, column) => {
        record[header] = row[column] ?? "";
      });
      record.__rowIndex = index + 2;
      return record;
    });
}

function setColumnWidths(worksheet: XLSX.WorkSheet, rows: ExcelRow[]): void {
  if (rows.length === 0) return;
  worksheet["!cols"] = Object.keys(rows[0]).map((key) => {
    const maxLength = Math.max(
      key.length,
      ...rows.map((row) => String(row[key] ?? "").length),
    );
    return { wch: Math.min(Math.max(maxLength, 10), 50) };
  });
}

function sanitizeSheetName(name: string, fallback = "Sheet1"): string {
  const safe = String(name).replace(INVALID_SHEET_NAME, "_").trim();
  return (safe || fallback).slice(0, 31);
}

function appendUniqueSheet(
  workbook: WorkBook,
  worksheet: XLSX.WorkSheet,
  requestedName: string,
): void {
  const base = sanitizeSheetName(requestedName);
  let name = base;
  let counter = 2;
  while (workbook.SheetNames.includes(name)) {
    const suffix = `_${counter++}`;
    name = `${base.slice(0, 31 - suffix.length)}${suffix}`;
  }
  XLSX.utils.book_append_sheet(workbook, worksheet, name);
}

function workbookBlob(workbook: WorkBook, maxOutputSize: number): Blob {
  const bytes = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
    compression: true,
  }) as ArrayBuffer;
  assertWithinLimit(bytes.byteLength, maxOutputSize, "Excel 输出");
  return new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function useExcel(options: UseExcelOptions = {}): UseExcelReturn {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const workbook = ref<WorkBook | null>(null) as Ref<WorkBook | null>;
  const data = ref<ExcelData>({}) as Ref<ExcelData>;
  const sheets = computed(() => workbook.value?.SheetNames ?? []);
  const context = () => getFileUtilsContext(options.context);

  const clearError = () => {
    error.value = null;
  };
  const clearData = () => {
    workbook.value = null;
    data.value = {};
    clearError();
  };

  const run = async <T>(
    operation: () => Promise<T>,
    errorCode: "READ_FAILED" | "WRITE_FAILED",
  ): Promise<T> => {
    loading.value = true;
    clearError();
    try {
      return await operation();
    } catch (cause) {
      const failure =
        cause instanceof FileUtilsError
          ? cause
          : new FileUtilsError(errorCode, "Excel 操作失败", { cause });
      error.value = failure.message;
      context().message("error", failure.message);
      throw failure;
    } finally {
      loading.value = false;
    }
  };

  const readFile = (
    file: File | Blob,
    readOptions: ExcelReadOptions = {},
  ): Promise<ExcelData> =>
    run(async () => {
      const limits = context().limits;
      throwIfAborted(readOptions.signal);
      assertWithinLimit(
        file.size,
        readOptions.maxFileSize ?? limits.maxFileSize,
        "Excel 文件大小",
      );
      const buffer = await file.arrayBuffer();
      throwIfAborted(readOptions.signal);
      const parsed = XLSX.read(buffer, {
        type: "array",
        cellDates: true,
        cellFormula: false,
        cellHTML: false,
        cellNF: false,
        cellText: false,
      });
      assertWithinLimit(
        parsed.SheetNames.length,
        readOptions.maxSheets ?? DEFAULT_MAX_SHEETS,
        "Excel 工作表数量",
      );

      const result: ExcelData = Object.create(null) as ExcelData;
      for (const sheetName of parsed.SheetNames) {
        throwIfAborted(readOptions.signal);
        const worksheet = parsed.Sheets[sheetName];
        if (!worksheet) continue;
        result[sheetName] = processWorksheetData(worksheet, readOptions, {
          maxRows: readOptions.maxRows ?? limits.maxRows,
          maxColumns: readOptions.maxColumns ?? limits.maxColumns,
        });
      }
      workbook.value = parsed;
      data.value = result;
      context().message("success", `成功读取 ${parsed.SheetNames.length} 个工作表`);
      return result;
    }, "READ_FAILED");

  const exportToExcel = (
    rows: ExcelRow[],
    config: ExcelConfig = {},
  ): Promise<void> =>
    run(async () => {
      const limits = context().limits;
      throwIfAborted(config.signal);
      assertWithinLimit(rows.length, config.maxRows ?? limits.maxRows, "Excel 行数");
      const cleanRows = cleanExportData(rows, config.formulaPolicy ?? "escape");
      const columns = cleanRows.length ? Object.keys(cleanRows[0]).length : 0;
      assertWithinLimit(columns, config.maxColumns ?? limits.maxColumns, "Excel 列数");
      const output = XLSX.utils.json_to_sheet(cleanRows);
      if (config.autoFitColumns ?? true) setColumnWidths(output, cleanRows);
      const nextWorkbook = XLSX.utils.book_new();
      appendUniqueSheet(nextWorkbook, output, config.sheetName ?? "Sheet1");
      throwIfAborted(config.signal);
      const fileName = sanitizeFileName(
        config.fileName ?? `export_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      downloadBlob(
        workbookBlob(nextWorkbook, config.maxOutputSize ?? limits.maxOutputSize),
        fileName,
      );
      context().message("success", `${fileName} 导出成功`);
    }, "WRITE_FAILED");

  const exportMultipleSheets = (
    sheetsData: Record<string, ExcelRow[]>,
    fileName = `multi-sheet_${new Date().toISOString().slice(0, 10)}.xlsx`,
    config: Omit<ExcelConfig, "fileName" | "sheetName"> = {},
  ): Promise<void> =>
    run(async () => {
      const limits = context().limits;
      const entries = Object.entries(sheetsData);
      assertWithinLimit(entries.length, DEFAULT_MAX_SHEETS, "Excel 工作表数量");
      if (entries.length === 0) {
        throw new FileUtilsError("INVALID_ARGUMENT", "至少需要一个工作表");
      }
      const nextWorkbook = XLSX.utils.book_new();
      for (const [sheetName, rows] of entries) {
        throwIfAborted(config.signal);
        assertWithinLimit(rows.length, config.maxRows ?? limits.maxRows, "Excel 行数");
        const cleanRows = cleanExportData(rows, config.formulaPolicy ?? "escape");
        const columns = cleanRows.length ? Object.keys(cleanRows[0]).length : 0;
        assertWithinLimit(columns, config.maxColumns ?? limits.maxColumns, "Excel 列数");
        const output = XLSX.utils.json_to_sheet(cleanRows);
        if (config.autoFitColumns ?? true) setColumnWidths(output, cleanRows);
        appendUniqueSheet(nextWorkbook, output, sheetName);
      }
      const safeName = sanitizeFileName(fileName);
      downloadBlob(
        workbookBlob(nextWorkbook, config.maxOutputSize ?? limits.maxOutputSize),
        safeName,
      );
      context().message("success", `${safeName} 导出成功`);
    }, "WRITE_FAILED");

  const getPresetTemplates = (): ExcelTemplate[] => [
    {
      name: "员工信息",
      headers: ["姓名", "部门", "职位", "薪资", "入职日期", "联系电话", "邮箱"],
      description: "员工基本信息登记表",
    },
    {
      name: "商品清单",
      headers: ["商品名称", "规格型号", "单价", "数量", "总价", "供应商", "备注"],
      description: "商品库存管理表",
    },
    {
      name: "财务报表",
      headers: ["日期", "科目", "借方金额", "贷方金额", "摘要", "凭证号"],
      description: "财务记账凭证",
    },
  ];

  const generateTemplate = (
    template: ExcelTemplate,
    config: Omit<ExcelConfig, "sheetName"> = {},
  ): Promise<void> =>
    run(async () => {
      const limits = context().limits;
      throwIfAborted(config.signal);
      assertWithinLimit(
        template.headers.length,
        config.maxColumns ?? limits.maxColumns,
        "Excel 模板列数",
      );
      validateHeaders(template.headers, {});
      const nextWorkbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet([template.headers]);
      worksheet["!cols"] = template.headers.map(() => ({ wch: 15 }));
      appendUniqueSheet(nextWorkbook, worksheet, template.name);
      const safeName = sanitizeFileName(
        config.fileName ?? `${template.name}模板.xlsx`,
      );
      downloadBlob(
        workbookBlob(nextWorkbook, config.maxOutputSize ?? limits.maxOutputSize),
        safeName,
      );
      context().message("success", `${safeName} 导出成功`);
    }, "WRITE_FAILED");

  return {
    loading,
    error,
    workbook,
    sheets,
    data,
    readFile,
    exportToExcel,
    exportMultipleSheets,
    generateTemplate,
    getPresetTemplates,
    clearData,
    clearError,
  };
}

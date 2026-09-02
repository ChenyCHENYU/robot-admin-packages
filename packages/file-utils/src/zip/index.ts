import { computed, ref } from "vue";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { getFileUtilsContext, type FileUtilsContext } from "../config";
import { useCSV } from "../csv";
import {
  assertWithinLimit,
  downloadBlob,
  FileUtilsError,
  sanitizeFileName,
  throwIfAborted,
  type ExportResult,
} from "../types";

export interface ExportState {
  loading: boolean;
  progress: number;
  currentFile: string;
  lastResult: ExportResult | null;
}

export interface ZipOperationOptions {
  signal?: AbortSignal;
  compressionLevel?: number;
  maxArchiveFiles?: number;
  maxArchiveSize?: number;
}

export interface UseJSZipOptions {
  context?: FileUtilsContext;
}

export interface CodeProjectConfig {
  projectName: string;
  framework?: "vue" | "react" | "nodejs" | "vanilla";
  includeConfig?: boolean;
  includeReadme?: boolean;
  files: Array<{ path: string; content: string }>;
  operation?: ZipOperationOptions;
}

export interface ReportConfig {
  title: string;
  format: "excel" | "csv" | "json";
  data: Record<string, unknown>[];
  includeSummary?: boolean;
  operation?: ZipOperationOptions;
}

export interface MediaConfig {
  packageName: string;
  files: Array<{ name: string; file: File | Blob; category?: string }>;
  organizeByCategory?: boolean;
  includeMetadata?: boolean;
  operation?: ZipOperationOptions;
}

export interface TemplateConfig {
  libraryName: string;
  templates: Array<{
    id: string;
    name: string;
    files: Record<string, string>;
  }>;
  bundleMode?: "separate" | "combined";
  includeDocumentation?: boolean;
  operation?: ZipOperationOptions;
}

type ZipContent = string | Blob | Uint8Array | ArrayBuffer;
type MediaFolderType = "image" | "video" | "audio" | "other";

interface MediaFolders {
  image: JSZip;
  video: JSZip;
  audio: JSZip;
  other: JSZip;
}

interface ArchiveStats {
  files: number;
  bytes: number;
}

const archiveStats = new WeakMap<object, ArchiveStats>();
const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function sanitizeZipSegment(segment: string): string {
  let safe = segment
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "_")
    .replace(/[. ]+$/g, "")
    .trim();
  if (!safe) safe = "unnamed";
  if (WINDOWS_RESERVED_NAME.test(safe)) safe = `_${safe}`;
  return safe.slice(0, 255);
}

export function sanitizeZipPath(rawPath: string): string {
  const path = String(rawPath)
    .replace(/\\/g, "/")
    .replace(/^[A-Za-z]:/, "")
    .replace(/^\/+/, "");
  const segments: string[] = [];
  for (const rawSegment of path.split("/")) {
    if (!rawSegment || rawSegment === ".") continue;
    if (rawSegment === "..") {
      segments.pop();
      continue;
    }
    segments.push(sanitizeZipSegment(rawSegment));
  }
  return segments.join("/") || "unnamed";
}

function contentSize(content: ZipContent): number {
  if (typeof content === "string") return new TextEncoder().encode(content).byteLength;
  if (content instanceof Blob) return content.size;
  return content.byteLength;
}

function protectExcelValue(value: unknown): unknown {
  return typeof value === "string" && FORMULA_PREFIX.test(value)
    ? `'${value}`
    : value;
}

function createExcelReport(rows: Record<string, unknown>[]): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  const protectedRows = rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, protectExcelValue(value)]),
    ),
  );
  const worksheet = XLSX.utils.json_to_sheet(protectedRows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  return XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
    compression: true,
  }) as ArrayBuffer;
}

export function useJSZip(options: UseJSZipOptions = {}) {
  const context = () => getFileUtilsContext(options.context);
  const state = ref<ExportState>({
    loading: false,
    progress: 0,
    currentFile: "",
    lastResult: null,
  });

  const createZip = () => {
    const zip = new JSZip();
    archiveStats.set(zip.files, { files: 0, bytes: 0 });
    return zip;
  };

  const operationLimits = (operation: ZipOperationOptions = {}) => ({
    maxFiles: operation.maxArchiveFiles ?? context().limits.maxArchiveFiles,
    maxSize: operation.maxArchiveSize ?? context().limits.maxArchiveSize,
  });

  const addFile = (
    zip: JSZip,
    fileName: string,
    content: ZipContent,
    operation: ZipOperationOptions = {},
  ): void => {
    throwIfAborted(operation.signal);
    const safePath = sanitizeZipPath(fileName);
    if (zip.file(safePath)) {
      throw new FileUtilsError(
        "INVALID_ARGUMENT",
        `ZIP 内存在重复文件路径：${safePath}`,
      );
    }
    const stats = archiveStats.get(zip.files) ?? { files: 0, bytes: 0 };
    const next = {
      files: stats.files + 1,
      bytes: stats.bytes + contentSize(content),
    };
    const limits = operationLimits(operation);
    assertWithinLimit(next.files, limits.maxFiles, "ZIP 文件数量");
    assertWithinLimit(next.bytes, limits.maxSize, "ZIP 原始内容大小");
    archiveStats.set(zip.files, next);
    zip.file(safePath, content);
  };

  const createFolder = (zip: JSZip, folderName: string): JSZip =>
    zip.folder(sanitizeZipPath(folderName)) ?? zip;

  const updateProgress = (progress: number, fileName = "") => {
    state.value.progress = Math.max(0, Math.min(100, Math.round(progress)));
    state.value.currentFile = fileName;
  };

  const downloadZip = async (
    zip: JSZip,
    fileName: string,
    operation: ZipOperationOptions = {},
  ): Promise<Blob> => {
    const level = operation.compressionLevel ?? 6;
    if (!Number.isInteger(level) || level < 0 || level > 9) {
      throw new FileUtilsError(
        "INVALID_ARGUMENT",
        "compressionLevel 必须是 0 到 9 之间的整数",
      );
    }
    throwIfAborted(operation.signal);
    const blob = await zip.generateAsync(
      {
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level },
      },
      (metadata) => {
        throwIfAborted(operation.signal);
        updateProgress(90 + metadata.percent / 10, metadata.currentFile ?? "");
      },
    );
    assertWithinLimit(
      blob.size,
      operation.maxArchiveSize ?? context().limits.maxArchiveSize,
      "ZIP 输出大小",
    );
    throwIfAborted(operation.signal);
    downloadBlob(blob, sanitizeFileName(fileName));
    return blob;
  };

  const showResult = (result: ExportResult) => {
    state.value.lastResult = result;
    context().message(result.success ? "success" : "error", result.message);
  };

  const executeExport = async <T extends { operation?: ZipOperationOptions }>(
    config: T,
    executor: (
      zip: JSZip,
      config: T,
    ) => Promise<{ fileName: string; fileCount: number }>,
    successMessage: string,
  ): Promise<ExportResult> => {
    if (state.value.loading) {
      throw new FileUtilsError("INVALID_ARGUMENT", "已有 ZIP 导出任务正在执行");
    }
    state.value = {
      loading: true,
      progress: 0,
      currentFile: "准备中...",
      lastResult: state.value.lastResult,
    };
    try {
      throwIfAborted(config.operation?.signal);
      const zip = createZip();
      const execution = await executor(zip, config);
      updateProgress(90, "生成压缩文件...");
      await downloadZip(zip, execution.fileName, config.operation);
      updateProgress(100);
      const result: ExportResult = {
        success: true,
        fileName: sanitizeFileName(execution.fileName),
        fileCount: execution.fileCount,
        message: successMessage,
      };
      showResult(result);
      return result;
    } catch (cause) {
      const failure =
        cause instanceof FileUtilsError
          ? cause
          : new FileUtilsError("WRITE_FAILED", "ZIP 导出失败", { cause });
      const result: ExportResult = {
        success: false,
        fileName: "",
        fileCount: 0,
        message: `导出失败：${failure.message}`,
      };
      showResult(result);
      throw failure;
    } finally {
      state.value.loading = false;
    }
  };

  const exportCodeProject = (config: CodeProjectConfig) =>
    executeExport(
      config,
      async (zip, cfg) => {
        if (!cfg.projectName.trim()) {
          throw new FileUtilsError("INVALID_ARGUMENT", "projectName 不能为空");
        }
        const srcFolder = cfg.framework ? createFolder(zip, "src") : zip;
        cfg.files.forEach((file, index) => {
          addFile(srcFolder, file.path, file.content, cfg.operation);
          updateProgress(10 + ((index + 1) / Math.max(cfg.files.length, 1)) * 60, file.path);
        });
        let fileCount = cfg.files.length;
        if (cfg.includeConfig) {
          addFile(
            zip,
            "package.json",
            JSON.stringify(createPackageJson(cfg), null, 2),
            cfg.operation,
          );
          fileCount++;
          updateProgress(75, "package.json");
        }
        if (cfg.includeReadme) {
          addFile(zip, "README.md", createReadme(cfg), cfg.operation);
          fileCount++;
          updateProgress(85, "README.md");
        }
        return { fileName: `${cfg.projectName}.zip`, fileCount };
      },
      `项目 ${config.projectName} 导出成功`,
    );

  const exportReport = (config: ReportConfig) =>
    executeExport(
      config,
      async (zip, cfg) => {
        updateProgress(20, "处理数据...");
        const content =
          cfg.format === "csv"
            ? useCSV().generate(cfg.data)
            : cfg.format === "excel"
              ? createExcelReport(cfg.data)
              : JSON.stringify(cfg.data, null, 2);
        const extension = cfg.format === "excel" ? "xlsx" : cfg.format;
        addFile(zip, `${cfg.title}.${extension}`, content, cfg.operation);
        let fileCount = 1;
        updateProgress(65, `${cfg.title}.${extension}`);
        if (cfg.includeSummary) {
          addFile(
            zip,
            "summary.json",
            JSON.stringify(
              {
                title: cfg.title,
                totalRecords: cfg.data.length,
                exportTime: new Date().toISOString(),
              },
              null,
              2,
            ),
            cfg.operation,
          );
          fileCount++;
          updateProgress(80, "summary.json");
        }
        return { fileName: `${cfg.title}_report.zip`, fileCount };
      },
      `报表 ${config.title} 导出成功，共 ${config.data.length} 条数据`,
    );

  const exportMedia = (config: MediaConfig) =>
    executeExport(
      config,
      async (zip, cfg) => {
        const folders: MediaFolders | null = cfg.organizeByCategory
          ? {
              image: createFolder(zip, "images"),
              video: createFolder(zip, "videos"),
              audio: createFolder(zip, "audios"),
              other: createFolder(zip, "others"),
            }
          : null;
        const metadata: Array<Record<string, unknown>> = [];
        for (let index = 0; index < cfg.files.length; index++) {
          throwIfAborted(cfg.operation?.signal);
          const item = cfg.files[index];
          const category: MediaFolderType =
            item.category === "image" ||
            item.category === "video" ||
            item.category === "audio"
              ? item.category
              : "other";
          addFile(folders?.[category] ?? zip, item.name, item.file, cfg.operation);
          if (cfg.includeMetadata) {
            metadata.push({
              name: item.name,
              size: item.file.size,
              type: item.file.type,
              category,
            });
          }
          updateProgress(20 + ((index + 1) / Math.max(cfg.files.length, 1)) * 60, item.name);
        }
        let fileCount = cfg.files.length;
        if (cfg.includeMetadata && metadata.length > 0) {
          addFile(zip, "media-info.json", JSON.stringify(metadata, null, 2), cfg.operation);
          fileCount++;
        }
        return { fileName: `${cfg.packageName}.zip`, fileCount };
      },
      `媒体包 ${config.packageName} 导出成功`,
    );

  const exportTemplates = (config: TemplateConfig) =>
    executeExport(
      config,
      async (zip, cfg) => {
        let fileCount = 0;
        cfg.templates.forEach((template, index) => {
          throwIfAborted(cfg.operation?.signal);
          const prefix = cfg.bundleMode === "separate" ? template.name : template.name;
          Object.entries(template.files).forEach(([path, content]) => {
            addFile(zip, `${prefix}/${path}`, content, cfg.operation);
            fileCount++;
          });
          updateProgress(20 + ((index + 1) / Math.max(cfg.templates.length, 1)) * 60, template.name);
        });
        if (cfg.includeDocumentation) {
          addFile(zip, "README.md", createTemplateDoc(cfg), cfg.operation);
          fileCount++;
          updateProgress(85, "README.md");
        }
        return { fileName: `${cfg.libraryName}_templates.zip`, fileCount };
      },
      `模板库 ${config.libraryName} 导出成功`,
    );

  function createPackageJson(config: CodeProjectConfig) {
    const dependencies = {
      vue: { vue: "^3.5.0" },
      react: { react: "^19.0.0" },
      nodejs: { express: "^5.0.0" },
      vanilla: {},
    };
    return {
      name: sanitizeZipSegment(config.projectName).toLowerCase(),
      version: "1.0.0",
      private: true,
      dependencies: dependencies[config.framework ?? "vanilla"],
    };
  }

  function createReadme(config: CodeProjectConfig): string {
    return `# ${config.projectName}\n\n## 技术栈\n\n- ${config.framework ?? "Vanilla JavaScript"}\n\n## 安装\n\n\`\`\`bash\nnpm install\n\`\`\`\n`;
  }

  function createTemplateDoc(config: TemplateConfig): string {
    return `# ${config.libraryName}\n\n## 模板\n\n${config.templates.map((template) => `- ${template.name}`).join("\n")}\n`;
  }

  return {
    createZip,
    addFile,
    createFolder,
    downloadZip,
    state: computed(() => state.value),
    exportCodeProject,
    exportReport,
    exportMedia,
    exportTemplates,
  };
}

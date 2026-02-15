/**
 * @robot-admin/file-utils
 * 文件处理工具集 - 统一入口
 *
 * 📦 包含模块：
 * - useExcel     Excel 读写（基于 xlsx）
 * - useDownload  通用文件下载
 * - useJSZip     文件压缩导出（基于 jszip + file-saver）
 * - useCSV       CSV 解析/生成
 * - useFile      Base64/JSON/XML 处理
 * - useImage     图片压缩/裁剪/格式转换
 * - useChunkUpload/useChunkDownload  大文件分片传输
 */

// ==================== 全局配置 ====================
export { configureFileUtils } from "./config";
export type { FileUtilsConfig } from "./config";

// ==================== 公共类型 ====================
export type { ExportResult } from "./types";
export { downloadBlob } from "./types";

// ==================== Excel 模块 ====================
export { useExcel } from "./excel";
export type {
  ExcelData,
  ExcelConfig,
  ExcelTemplate,
  UseExcelReturn,
} from "./excel";

// ==================== 下载模块 ====================
export {
  useDownload,
  useDownloadExcel,
  useDownloadCSV,
  useDownloadPDF,
  useDownloadJSON,
  getSupportedFileTypes,
  FileType,
} from "./download";
export type { DownloadConfig, DownloadApiFunction } from "./download";

// ==================== 压缩模块 ====================
export { useJSZip } from "./zip";
export type {
  ExportState,
  CodeProjectConfig,
  ReportConfig,
  MediaConfig,
  TemplateConfig,
} from "./zip";

// ==================== CSV 模块 ====================
export { useCSV } from "./csv";
export type { CSVOptions } from "./csv";

// ==================== 文件工具模块 ====================
export { useFile } from "./file";
export type { XMLOptions } from "./file";

// ==================== 图片处理模块 ====================
export { useImage } from "./image";
export type {
  CompressOptions,
  CropOptions,
  ImageInfo,
  ImageFormat,
} from "./image";

// ==================== 大文件分片模块 ====================
export { useChunkUpload, useChunkDownload } from "./chunk";
export type {
  ChunkUploadOptions,
  ChunkUploadState,
  ChunkDownloadState,
  ChunkUploadFn,
  ChunkMergeFn,
} from "./chunk";

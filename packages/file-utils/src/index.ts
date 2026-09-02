import {
  createFileUtilsContext,
  type FileUtilsConfig,
} from "./config";
import { useChunkDownload, useChunkUpload } from "./chunk";
import { useCSV } from "./csv";
import { useDownload, type DownloadApiFunction, type DownloadConfig } from "./download";
import { useExcel } from "./excel";
import { useFile } from "./file";
import { useImage } from "./image";
import { useJSZip } from "./zip";

export {
  configureFileUtils,
  createFileUtilsContext,
  getFileUtilsContext,
  resetFileUtilsConfig,
  DEFAULT_FILE_UTILS_LIMITS,
} from "./config";
export type {
  FileUtilsConfig,
  FileUtilsContext,
  FileUtilsLimits,
  MessageType,
  NotificationType,
} from "./config";

export {
  assertWithinLimit,
  downloadBlob,
  FileUtilsError,
  sanitizeFileName,
  throwIfAborted,
} from "./types";
export type {
  DownloadBlobOptions,
  ExportResult,
  FileProgress,
  FileUtilsErrorCode,
} from "./types";

export { useExcel } from "./excel";
export type {
  ExcelConfig,
  ExcelData,
  ExcelReadOptions,
  ExcelRow,
  ExcelTemplate,
  SpreadsheetFormulaPolicy,
  UseExcelOptions,
  UseExcelReturn,
} from "./excel";

export {
  FileType,
  getSupportedFileTypes,
  useDownload,
  useDownloadCSV,
  useDownloadExcel,
  useDownloadJSON,
  useDownloadPDF,
} from "./download";
export type {
  DownloadApiFunction,
  DownloadConfig,
  DownloadPayload,
  DownloadRequestContext,
  DownloadResult,
  FileExtension,
} from "./download";

export { sanitizeZipPath, useJSZip } from "./zip";
export type {
  CodeProjectConfig,
  ExportState,
  MediaConfig,
  ReportConfig,
  TemplateConfig,
  UseJSZipOptions,
  ZipOperationOptions,
} from "./zip";

export { useCSV } from "./csv";
export type { CSVOptions, UseCSVOptions } from "./csv";

export { useFile } from "./file";
export type { JSONFileOptions, UseFileOptions, XMLOptions } from "./file";

export { useImage } from "./image";
export type {
  CompressOptions,
  CropOptions,
  ImageFormat,
  ImageInfo,
  UseImageOptions,
} from "./image";

export {
  calculateFileHash,
  createWritableStreamSink,
  useChunkDownload,
  useChunkUpload,
} from "./chunk";
export type {
  ChunkDownloadOptions,
  ChunkDownloadResult,
  ChunkDownloadSink,
  ChunkDownloadState,
  ChunkMergeFn,
  ChunkUploadFn,
  ChunkUploadOptions,
  ChunkUploadResult,
  ChunkUploadRunOptions,
  ChunkUploadState,
  UseChunkDownloadOptions,
} from "./chunk";

/**
 * Creates an isolated toolkit instance. Prefer this in multi-tenant apps, SSR,
 * tests and micro-frontends; `configureFileUtils` remains as a compatibility API.
 */
export function createFileUtils(config: FileUtilsConfig = {}) {
  const context = createFileUtilsContext(config);
  return Object.freeze({
    context,
    csv: useCSV({ context }),
    file: useFile({ context }),
    image: useImage({ context }),
    excel: useExcel({ context }),
    zip: useJSZip({ context }),
    download(
      api: DownloadApiFunction,
      downloadConfig: Omit<DownloadConfig, "context">,
    ) {
      return useDownload(api, { ...downloadConfig, context });
    },
    chunkUpload(options: Omit<import("./chunk").ChunkUploadOptions, "context"> = {}) {
      return useChunkUpload({ ...options, context });
    },
    chunkDownload(
      options: Omit<import("./chunk").UseChunkDownloadOptions, "context"> = {},
    ) {
      return useChunkDownload({ ...options, context });
    },
  });
}

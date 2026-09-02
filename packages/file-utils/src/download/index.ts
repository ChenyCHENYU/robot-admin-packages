import {
  getFileUtilsContext,
  type FileUtilsContext,
} from "../config";
import {
  assertWithinLimit,
  downloadBlob,
  FileUtilsError,
  sanitizeFileName,
  throwIfAborted,
  type FileProgress,
} from "../types";

export enum FileType {
  XLSX = ".xlsx",
  XLS = ".xls",
  CSV = ".csv",
  PDF = ".pdf",
  DOC = ".doc",
  DOCX = ".docx",
  PPT = ".ppt",
  PPTX = ".pptx",
  TXT = ".txt",
  JSON = ".json",
  XML = ".xml",
  ZIP = ".zip",
  RAR = ".rar",
  PNG = ".png",
  JPG = ".jpg",
  JPEG = ".jpeg",
  GIF = ".gif",
  SVG = ".svg",
  MP4 = ".mp4",
  MP3 = ".mp3",
  WAV = ".wav",
}

const MIME_TYPE_MAP: Readonly<Record<string, string>> = {
  [FileType.XLSX]:
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  [FileType.XLS]: "application/vnd.ms-excel",
  [FileType.CSV]: "text/csv;charset=utf-8",
  [FileType.PDF]: "application/pdf",
  [FileType.DOC]: "application/msword",
  [FileType.DOCX]:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  [FileType.PPT]: "application/vnd.ms-powerpoint",
  [FileType.PPTX]:
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  [FileType.TXT]: "text/plain;charset=utf-8",
  [FileType.JSON]: "application/json;charset=utf-8",
  [FileType.XML]: "application/xml;charset=utf-8",
  [FileType.ZIP]: "application/zip",
  [FileType.RAR]: "application/vnd.rar",
  [FileType.PNG]: "image/png",
  [FileType.JPG]: "image/jpeg",
  [FileType.JPEG]: "image/jpeg",
  [FileType.GIF]: "image/gif",
  [FileType.SVG]: "image/svg+xml",
  [FileType.MP4]: "video/mp4",
  [FileType.MP3]: "audio/mpeg",
  [FileType.WAV]: "audio/wav",
};

export type FileExtension = FileType | `.${string}`;

export interface DownloadRequestContext {
  signal?: AbortSignal;
  onProgress?: (progress: FileProgress) => void;
}

export type DownloadPayload =
  | Blob
  | ArrayBuffer
  | ArrayBufferView
  | Response
  | { data: Blob | ArrayBuffer | ArrayBufferView; headers?: unknown };

export type DownloadApiFunction = (
  params?: Record<string, unknown>,
  context?: DownloadRequestContext,
) => Promise<DownloadPayload>;

export interface DownloadConfig {
  fileName: string;
  fileType: FileExtension;
  params?: Record<string, unknown>;
  showNotification?: boolean;
  notificationConfig?: {
    loading?: string;
    success?: string;
    error?: string;
  };
  signal?: AbortSignal;
  onProgress?: (progress: FileProgress) => void;
  context?: FileUtilsContext;
  maxFileSize?: number;
  rejectUnexpectedJSON?: boolean;
  save?: (blob: Blob, fileName: string) => void | Promise<void>;
}

export interface DownloadResult {
  blob: Blob;
  fileName: string;
  size: number;
  mimeType: string;
}

const DEFAULT_NOTIFICATION_CONFIG = {
  loading: "文件下载中，请稍候...",
  success: "文件下载成功",
  error: "文件下载失败",
};

function getFullFileName(fileName: string, fileType: FileExtension): string {
  const normalized = fileName.toLowerCase();
  return sanitizeFileName(
    normalized.endsWith(fileType.toLowerCase())
      ? fileName
      : `${fileName}${fileType}`,
  );
}

function parseContentDisposition(value: string | null): string | undefined {
  if (!value) return undefined;
  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  }
  return value.match(/filename="?([^";]+)"?/i)?.[1];
}

async function responseToBlob(
  response: Response,
  config: DownloadConfig,
  context: FileUtilsContext,
): Promise<Blob> {
  if (!response.ok) {
    throw new FileUtilsError(
      "NETWORK_ERROR",
      `下载请求失败：HTTP ${response.status}`,
      { details: { status: response.status } },
    );
  }
  const maximum = config.maxFileSize ?? context.limits.maxFileSize;
  const total = Number(response.headers.get("content-length") || 0);
  if (total > 0) assertWithinLimit(total, maximum, "下载文件");
  if (!response.body) {
    const blob = await response.blob();
    assertWithinLimit(blob.size, maximum, "下载文件");
    return blob;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  const startedAt = performance.now();
  try {
    while (true) {
      throwIfAborted(config.signal);
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.byteLength;
      assertWithinLimit(loaded, maximum, "下载文件");
      const elapsed = Math.max((performance.now() - startedAt) / 1000, 0.001);
      const speed = loaded / elapsed;
      config.onProgress?.({
        phase: "download",
        loaded,
        total: total || undefined,
        percent: total ? Math.min(100, (loaded / total) * 100) : undefined,
        speed,
        eta: total && speed > 0 ? (total - loaded) / speed : undefined,
      });
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // The stream can already be closed or errored.
    }
  }
  return new Blob(chunks as BlobPart[], {
    type: response.headers.get("content-type") ?? "",
  });
}

async function normalizePayload(
  payload: DownloadPayload,
  config: DownloadConfig,
  context: FileUtilsContext,
): Promise<{ blob: Blob; serverFileName?: string }> {
  if (payload instanceof Response) {
    return {
      blob: await responseToBlob(payload, config, context),
      serverFileName: parseContentDisposition(
        payload.headers.get("content-disposition"),
      ),
    };
  }
  if (payload instanceof Blob) return { blob: payload };
  if (payload instanceof ArrayBuffer || ArrayBuffer.isView(payload)) {
    return { blob: new Blob([payload as BlobPart]) };
  }
  if (payload && typeof payload === "object" && "data" in payload) {
    const normalized = await normalizePayload(payload.data, config, context);
    const headers = payload.headers;
    const disposition =
      headers instanceof Headers
        ? headers.get("content-disposition")
        : headers && typeof headers === "object"
          ? String(
              (headers as Record<string, unknown>)["content-disposition"] ??
                (headers as Record<string, unknown>)["Content-Disposition"] ??
                "",
            )
          : null;
    return {
      ...normalized,
      serverFileName:
        normalized.serverFileName ?? parseContentDisposition(disposition),
    };
  }
  throw new FileUtilsError("INVALID_CONTENT", "下载接口返回了不支持的数据类型");
}

async function detectBackendError(blob: Blob): Promise<void> {
  if (!/[/+]json\b/i.test(blob.type) || blob.size > 1024 * 1024) return;
  try {
    const data = JSON.parse(await blob.text()) as Record<string, unknown>;
    const message = String(data.message ?? data.msg ?? data.error ?? "服务端返回错误");
    throw new FileUtilsError("NETWORK_ERROR", message, { details: data });
  } catch (error) {
    if (error instanceof FileUtilsError) throw error;
  }
}

export async function useDownload(
  api: DownloadApiFunction,
  config: DownloadConfig,
): Promise<DownloadResult> {
  const context = getFileUtilsContext(config.context);
  const messages = {
    ...DEFAULT_NOTIFICATION_CONFIG,
    ...config.notificationConfig,
  };
  const showNotification = config.showNotification ?? true;
  try {
    throwIfAborted(config.signal);
    if (showNotification) context.notify("info", messages.loading);
    const payload = await api(config.params ?? {}, {
      signal: config.signal,
      onProgress: config.onProgress,
    });
    throwIfAborted(config.signal);
    const normalized = await normalizePayload(payload, config, context);
    assertWithinLimit(
      normalized.blob.size,
      config.maxFileSize ?? context.limits.maxFileSize,
      "下载文件",
    );
    if (config.rejectUnexpectedJSON ?? (config.fileType !== FileType.JSON)) {
      await detectBackendError(normalized.blob);
    }

    const mimeType =
      normalized.blob.type || MIME_TYPE_MAP[config.fileType] || "application/octet-stream";
    const blob = normalized.blob.type
      ? normalized.blob
      : normalized.blob.slice(0, normalized.blob.size, mimeType);
    const fileName = normalized.serverFileName
      ? sanitizeFileName(normalized.serverFileName)
      : getFullFileName(config.fileName, config.fileType);
    await (config.save ?? downloadBlob)(blob, fileName);
    if (showNotification) context.notify("success", messages.success);
    return { blob, fileName, size: blob.size, mimeType };
  } catch (cause) {
    const error =
      cause instanceof FileUtilsError
        ? cause
        : config.signal?.aborted
          ? new FileUtilsError("ABORTED", "文件下载已取消", { cause })
          : new FileUtilsError(
              "NETWORK_ERROR",
              cause instanceof Error ? cause.message : "未知下载错误",
              { cause },
            );
    if (showNotification) {
      context.notify("error", `${messages.error}：${error.message}`, 3000);
    }
    throw error;
  }
}

function createQuickDownloadMethod(fileType: FileType) {
  return (
    api: DownloadApiFunction,
    fileName: string,
    params?: Record<string, unknown>,
  ): Promise<DownloadResult> => useDownload(api, { fileName, fileType, params });
}

export const useDownloadExcel = createQuickDownloadMethod(FileType.XLSX);
export const useDownloadCSV = createQuickDownloadMethod(FileType.CSV);
export const useDownloadPDF = createQuickDownloadMethod(FileType.PDF);
export const useDownloadJSON = createQuickDownloadMethod(FileType.JSON);

export function getSupportedFileTypes(): Array<{
  label: string;
  value: FileType;
}> {
  return Object.values(FileType).map((value) => ({
    label: value.slice(1).toUpperCase(),
    value,
  }));
}

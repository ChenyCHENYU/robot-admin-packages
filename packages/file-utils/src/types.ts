export type FileUtilsErrorCode =
  | "ABORTED"
  | "INVALID_ARGUMENT"
  | "INVALID_CONTENT"
  | "LIMIT_EXCEEDED"
  | "NETWORK_ERROR"
  | "NOT_SUPPORTED"
  | "READ_FAILED"
  | "WRITE_FAILED";

export class FileUtilsError extends Error {
  readonly code: FileUtilsErrorCode;
  readonly details?: Readonly<Record<string, unknown>>;
  declare readonly cause?: unknown;

  constructor(
    code: FileUtilsErrorCode,
    message: string,
    options: {
      cause?: unknown;
      details?: Readonly<Record<string, unknown>>;
    } = {},
  ) {
    super(message);
    this.name = "FileUtilsError";
    this.code = code;
    this.details = options.details
      ? Object.freeze({ ...options.details })
      : undefined;
    if (options.cause !== undefined) {
      Object.defineProperty(this, "cause", {
        value: options.cause,
        configurable: true,
      });
    }
  }
}

export interface FileProgress {
  phase: string;
  loaded: number;
  total?: number;
  percent?: number;
  speed?: number;
  eta?: number;
}

export interface ExportResult {
  success: boolean;
  fileName: string;
  fileCount: number;
  message: string;
}

export interface DownloadBlobOptions {
  document?: Document;
  revokeDelay?: number;
}

const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;

export function sanitizeFileName(fileName: string): string {
  let safe = String(fileName)
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, "_")
    .replace(/[. ]+$/g, "")
    .trim();
  if (!safe) safe = "download";
  if (WINDOWS_RESERVED_NAME.test(safe)) safe = `_${safe}`;
  return safe.slice(0, 255);
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new FileUtilsError("ABORTED", "操作已取消", {
      cause: signal.reason,
    });
  }
}

export function assertWithinLimit(
  value: number,
  maximum: number,
  label: string,
): void {
  if (value > maximum) {
    throw new FileUtilsError(
      "LIMIT_EXCEEDED",
      `${label}超过限制：${value} > ${maximum}`,
      { details: { value, maximum, label } },
    );
  }
}

export function downloadBlob(
  blob: Blob,
  fileName: string,
  options: DownloadBlobOptions = {},
): void {
  const doc = options.document ?? globalThis.document;
  if (!doc?.body || typeof URL?.createObjectURL !== "function") {
    throw new FileUtilsError("NOT_SUPPORTED", "当前环境不支持浏览器文件下载");
  }
  const url = URL.createObjectURL(blob);
  const link = doc.createElement("a");
  link.href = url;
  link.download = sanitizeFileName(fileName);
  link.style.display = "none";
  doc.body.appendChild(link);
  link.click();
  const revokeDelay = options.revokeDelay ?? 1000;
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, revokeDelay);
}

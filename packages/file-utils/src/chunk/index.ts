import { computed, ref } from "vue";
import { getFileUtilsContext, type FileUtilsContext } from "../config";
import {
  assertWithinLimit,
  downloadBlob,
  FileUtilsError,
  sanitizeFileName,
  throwIfAborted,
  type FileProgress,
} from "../types";

export interface ChunkUploadOptions {
  chunkSize?: number;
  concurrent?: number;
  /** Number of retries after the first attempt. Default: 3. */
  retries?: number;
  retryDelay?: number | ((attempt: number, error: unknown) => number);
  maxFileSize?: number;
  context?: FileUtilsContext;
}

export interface ChunkUploadRunOptions {
  signal?: AbortSignal;
  completedChunks?: Iterable<number>;
  onProgress?: (progress: FileProgress) => void;
}

export interface ChunkUploadState {
  progress: number;
  uploading: boolean;
  currentChunk: number;
  completedChunks: number[];
  totalChunks: number;
  uploadedBytes: number;
  speed: number;
  aborted: boolean;
  error: string | null;
}

export interface ChunkUploadResult {
  hash: string;
  totalChunks: number;
  completedChunks: number[];
}

export interface ChunkDownloadState {
  progress: number;
  downloading: boolean;
  loaded: number;
  total?: number;
  speed: number;
  aborted: boolean;
  error: string | null;
}

export interface ChunkDownloadSink {
  write(chunk: Uint8Array): void | Promise<void>;
  close(): void | Promise<void>;
  abort?(reason?: unknown): void | Promise<void>;
}

export interface ChunkDownloadOptions {
  onProgress?: (percent: number) => void;
  onProgressDetail?: (progress: FileProgress) => void;
  signal?: AbortSignal;
  requestInit?: Omit<RequestInit, "signal">;
  sink?: ChunkDownloadSink;
  expectedSize?: number;
  maxBufferedSize?: number;
  mimeType?: string;
}

export interface ChunkDownloadResult {
  bytes: number;
  fileName: string;
  blob?: Blob;
}

export interface UseChunkDownloadOptions {
  context?: FileUtilsContext;
  fetch?: typeof globalThis.fetch;
  save?: (blob: Blob, fileName: string) => void;
}

export type ChunkUploadFn = (
  chunk: Blob,
  index: number,
  total: number,
  hash: string,
  signal: AbortSignal,
) => Promise<unknown>;

export type ChunkMergeFn = (
  fileName: string,
  totalChunks: number,
  hash: string,
  signal?: AbortSignal,
) => Promise<unknown>;

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new FileUtilsError(
      "INVALID_ARGUMENT",
      `${name} 必须是大于 0 的安全整数`,
    );
  }
}

function assertNonNegativeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new FileUtilsError(
      "INVALID_ARGUMENT",
      `${name} 必须是大于等于 0 的安全整数`,
    );
  }
}

function abortedError(signal: AbortSignal): FileUtilsError {
  return new FileUtilsError("ABORTED", "操作已取消", { cause: signal.reason });
}

function linkAbortSignal(
  external: AbortSignal | undefined,
  controller: AbortController,
): () => void {
  if (!external) return () => undefined;
  const relay = () => controller.abort(external.reason);
  if (external.aborted) relay();
  else external.addEventListener("abort", relay, { once: true });
  return () => external.removeEventListener("abort", relay);
}

function waitForRetry(ms: number, signal: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, Math.max(0, ms));
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortedError(signal));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function chunkByteLength(fileSize: number, chunkSize: number, index: number): number {
  const start = index * chunkSize;
  return Math.max(0, Math.min(chunkSize, fileSize - start));
}

/** A stable sampled SHA-256 identifier. It is an upload identity, not a full-file integrity checksum. */
export async function calculateFileHash(
  file: Blob,
  signal?: AbortSignal,
): Promise<string> {
  throwIfAborted(signal);
  const sampleSize = 1024 * 1024;
  const samples = [
    await file.slice(0, Math.min(sampleSize, file.size)).arrayBuffer(),
  ];
  if (file.size > sampleSize) {
    samples.push(
      await file.slice(Math.max(0, file.size - sampleSize)).arrayBuffer(),
    );
  }
  throwIfAborted(signal);
  const contentLength = samples.reduce((total, sample) => total + sample.byteLength, 0);
  const combined = new Uint8Array(contentLength + 8);
  let offset = 0;
  for (const sample of samples) {
    combined.set(new Uint8Array(sample), offset);
    offset += sample.byteLength;
  }
  new DataView(combined.buffer).setBigUint64(contentLength, BigInt(file.size), false);
  if (!globalThis.crypto?.subtle?.digest) {
    throw new FileUtilsError(
      "NOT_SUPPORTED",
      "当前环境不支持 Web Crypto SHA-256（浏览器中需要 HTTPS 或 localhost）",
    );
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", combined);
  throwIfAborted(signal);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function useChunkUpload(options: ChunkUploadOptions = {}) {
  const chunkSize = options.chunkSize ?? 2 * 1024 * 1024;
  const concurrent = options.concurrent ?? 3;
  const retries = options.retries ?? 3;
  assertPositiveInteger(chunkSize, "chunkSize");
  assertPositiveInteger(concurrent, "concurrent");
  assertNonNegativeInteger(retries, "retries");

  let activeController: AbortController | null = null;
  const state = ref<ChunkUploadState>({
    progress: 0,
    uploading: false,
    currentChunk: 0,
    completedChunks: [],
    totalChunks: 0,
    uploadedBytes: 0,
    speed: 0,
    aborted: false,
    error: null,
  });

  const upload = async (
    file: File,
    uploadFn: ChunkUploadFn,
    mergeFn?: ChunkMergeFn,
    runOptions: ChunkUploadRunOptions = {},
  ): Promise<ChunkUploadResult> => {
    if (activeController) {
      throw new FileUtilsError("INVALID_ARGUMENT", "已有分片上传任务正在执行");
    }
    const context = getFileUtilsContext(options.context);
    assertWithinLimit(
      file.size,
      options.maxFileSize ?? context.limits.maxFileSize,
      "上传文件大小",
    );
    if (file.size === 0) {
      throw new FileUtilsError("INVALID_ARGUMENT", "不能分片上传空文件");
    }

    const controller = new AbortController();
    activeController = controller;
    const unlink = linkAbortSignal(runOptions.signal, controller);
    const { signal } = controller;
    const totalChunks = Math.ceil(file.size / chunkSize);
    const resumed = new Set<number>();
    for (const index of runOptions.completedChunks ?? []) {
      if (!Number.isSafeInteger(index) || index < 0 || index >= totalChunks) {
        activeController = null;
        unlink();
        throw new FileUtilsError(
          "INVALID_ARGUMENT",
          `已完成分片索引无效：${index}`,
        );
      }
      resumed.add(index);
    }
    let uploadedBytes = Array.from(resumed).reduce(
      (total, index) => total + chunkByteLength(file.size, chunkSize, index),
      0,
    );
    const completed = new Set(resumed);
    const startedAt = performance.now();

    const report = () => {
      const elapsed = Math.max((performance.now() - startedAt) / 1000, 0.001);
      const percent = Math.min(100, (uploadedBytes / file.size) * 100);
      const speed = Math.max(0, uploadedBytes / elapsed);
      state.value.progress = Math.round(percent);
      state.value.currentChunk = completed.size;
      state.value.completedChunks = Array.from(completed).sort((a, b) => a - b);
      state.value.uploadedBytes = uploadedBytes;
      state.value.speed = speed;
      runOptions.onProgress?.({
        phase: "upload",
        loaded: uploadedBytes,
        total: file.size,
        percent,
        speed,
        eta: speed > 0 ? (file.size - uploadedBytes) / speed : undefined,
      });
    };

    state.value = {
      progress: Math.round((uploadedBytes / file.size) * 100),
      uploading: true,
      currentChunk: completed.size,
      completedChunks: Array.from(completed).sort((a, b) => a - b),
      totalChunks,
      uploadedBytes,
      speed: 0,
      aborted: false,
      error: null,
    };

    try {
      throwIfAborted(signal);
      const hash = await calculateFileHash(file, signal);
      const pending = Array.from({ length: totalChunks }, (_, index) => index).filter(
        (index) => !completed.has(index),
      );
      let cursor = 0;
      let firstError: unknown;

      const uploadIndex = async (index: number) => {
        const start = index * chunkSize;
        const chunk = file.slice(start, Math.min(start + chunkSize, file.size));
        for (let attempt = 0; attempt <= retries; attempt++) {
          throwIfAborted(signal);
          try {
            await uploadFn(chunk, index, totalChunks, hash, signal);
            throwIfAborted(signal);
            completed.add(index);
            uploadedBytes += chunk.size;
            report();
            return;
          } catch (cause) {
            if (signal.aborted) throw abortedError(signal);
            if (attempt >= retries) throw cause;
            const retryDelay =
              typeof options.retryDelay === "function"
                ? options.retryDelay(attempt + 1, cause)
                : (options.retryDelay ?? 1000) * (attempt + 1);
            if (!Number.isFinite(retryDelay) || retryDelay < 0) {
              throw new FileUtilsError("INVALID_ARGUMENT", "retryDelay 返回值无效");
            }
            await waitForRetry(retryDelay, signal);
          }
        }
      };

      const worker = async () => {
        while (!signal.aborted) {
          const position = cursor++;
          if (position >= pending.length) return;
          try {
            await uploadIndex(pending[position]);
          } catch (cause) {
            if (firstError === undefined) {
              firstError = cause;
              controller.abort(cause);
            }
            return;
          }
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(concurrent, pending.length) }, () => worker()),
      );
      if (firstError !== undefined) throw firstError;
      throwIfAborted(signal);
      if (mergeFn) await mergeFn(file.name, totalChunks, hash, signal);
      throwIfAborted(signal);
      uploadedBytes = file.size;
      report();
      return {
        hash,
        totalChunks,
        completedChunks: Array.from(completed).sort((a, b) => a - b),
      };
    } catch (cause) {
      const failure =
        cause instanceof FileUtilsError
          ? cause
          : new FileUtilsError(
              signal.aborted ? "ABORTED" : "NETWORK_ERROR",
              signal.aborted ? "分片上传已取消" : "分片上传失败",
              { cause },
            );
      state.value.aborted = failure.code === "ABORTED";
      state.value.error = failure.message;
      throw failure;
    } finally {
      unlink();
      if (activeController === controller) activeController = null;
      state.value.uploading = false;
    }
  };

  const abort = (reason: unknown = new Error("用户取消分片上传")) => {
    activeController?.abort(reason);
  };

  return { state: computed(() => state.value), upload, abort };
}

export function createWritableStreamSink(
  stream: WritableStream<Uint8Array>,
): ChunkDownloadSink {
  const writer = stream.getWriter();
  return {
    write: (chunk) => writer.write(chunk),
    close: () => writer.close(),
    abort: (reason) => writer.abort(reason),
  };
}

export function useChunkDownload(defaults: UseChunkDownloadOptions = {}) {
  let activeController: AbortController | null = null;
  const state = ref<ChunkDownloadState>({
    progress: 0,
    downloading: false,
    loaded: 0,
    speed: 0,
    aborted: false,
    error: null,
  });

  const download = async (
    url: string,
    fileName: string,
    options: ChunkDownloadOptions = {},
  ): Promise<ChunkDownloadResult> => {
    if (activeController) {
      throw new FileUtilsError("INVALID_ARGUMENT", "已有分片下载任务正在执行");
    }
    const fetcher = defaults.fetch ?? globalThis.fetch;
    if (typeof fetcher !== "function") {
      throw new FileUtilsError("NOT_SUPPORTED", "当前环境不支持 fetch");
    }
    const context = getFileUtilsContext(defaults.context);
    const controller = new AbortController();
    activeController = controller;
    const unlink = linkAbortSignal(options.signal, controller);
    const { signal } = controller;
    const safeName = sanitizeFileName(fileName);
    const startedAt = performance.now();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

    state.value = {
      progress: 0,
      downloading: true,
      loaded: 0,
      speed: 0,
      aborted: false,
      error: null,
    };

    try {
      throwIfAborted(signal);
      const response = await fetcher(url, {
        ...options.requestInit,
        signal,
      });
      if (!response.ok) {
        throw new FileUtilsError(
          "NETWORK_ERROR",
          `下载请求失败：HTTP ${response.status}`,
          { details: { status: response.status, url } },
        );
      }
      const headerValue = response.headers.get("content-length");
      const headerLength = headerValue === null ? Number.NaN : Number(headerValue);
      const total =
        options.expectedSize ??
        (Number.isSafeInteger(headerLength) && headerLength >= 0
          ? headerLength
          : undefined);
      if (options.expectedSize !== undefined) {
        assertNonNegativeInteger(options.expectedSize, "expectedSize");
      }
      const maxBufferedSize =
        options.maxBufferedSize ?? context.limits.maxBufferedDownloadSize;
      assertPositiveInteger(maxBufferedSize, "maxBufferedSize");
      if (!options.sink && total !== undefined) {
        assertWithinLimit(total, maxBufferedSize, "缓冲下载大小");
      }
      reader = response.body?.getReader();
      if (!reader) {
        throw new FileUtilsError("NOT_SUPPORTED", "响应不支持 ReadableStream");
      }

      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        throwIfAborted(signal);
        const part = await reader.read();
        if (part.done) break;
        if (!part.value) continue;
        received += part.value.byteLength;
        if (!options.sink) {
          assertWithinLimit(received, maxBufferedSize, "缓冲下载大小");
          chunks.push(part.value);
        } else {
          await options.sink.write(part.value);
        }
        const elapsed = Math.max((performance.now() - startedAt) / 1000, 0.001);
        const speed = received / elapsed;
        const percent = total && total > 0 ? Math.min(100, (received / total) * 100) : undefined;
        state.value.loaded = received;
        state.value.total = total;
        state.value.speed = speed;
        state.value.progress = percent === undefined ? 0 : Math.round(percent);
        options.onProgress?.(state.value.progress);
        options.onProgressDetail?.({
          phase: "download",
          loaded: received,
          total,
          percent,
          speed,
          eta: total && speed > 0 ? (total - received) / speed : undefined,
        });
      }
      if (options.expectedSize !== undefined && received !== options.expectedSize) {
        throw new FileUtilsError(
          "INVALID_CONTENT",
          `下载大小不匹配：${received} !== ${options.expectedSize}`,
          { details: { received, expected: options.expectedSize } },
        );
      }
      throwIfAborted(signal);
      let blob: Blob | undefined;
      if (options.sink) {
        await options.sink.close();
      } else {
        blob = new Blob(chunks as BlobPart[], {
          type: options.mimeType ?? response.headers.get("content-type") ?? "",
        });
        (defaults.save ?? downloadBlob)(blob, safeName);
      }
      state.value.progress = 100;
      state.value.loaded = received;
      return { bytes: received, fileName: safeName, blob };
    } catch (cause) {
      if (options.sink) {
        try {
          await options.sink.abort?.(cause);
        } catch {
          // Preserve the primary download failure.
        }
      }
      const failure =
        cause instanceof FileUtilsError
          ? cause
          : new FileUtilsError(
              signal.aborted ? "ABORTED" : "NETWORK_ERROR",
              signal.aborted ? "分片下载已取消" : "分片下载失败",
              { cause },
            );
      state.value.aborted = failure.code === "ABORTED";
      state.value.error = failure.message;
      throw failure;
    } finally {
      try {
        await reader?.cancel();
      } catch {
        // The stream may already be closed or errored.
      }
      unlink();
      if (activeController === controller) activeController = null;
      state.value.downloading = false;
    }
  };

  const abort = (reason: unknown = new Error("用户取消分片下载")) => {
    activeController?.abort(reason);
  };

  return { state: computed(() => state.value), download, abort };
}

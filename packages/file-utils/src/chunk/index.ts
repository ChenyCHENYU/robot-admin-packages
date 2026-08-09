/**
 * @description 大文件分片上传/下载工具
 * 支持并发控制、断点续传、进度追踪、失败重试
 * 基于浏览器原生 API，零外部依赖
 */

import { ref, computed } from "vue";
import { downloadBlob } from "../types";

// ==================== 类型定义 ====================

export interface ChunkUploadOptions {
  /** 分片大小（字节），默认 2MB */
  chunkSize?: number;
  /** 并发上传数，默认 3 */
  concurrent?: number;
  /** 失败重试次数，默认 3 */
  retries?: number;
}

export interface ChunkUploadState {
  /** 上传进度 0-100 */
  progress: number;
  /** 是否正在上传 */
  uploading: boolean;
  /** 当前已完成的分片索引 */
  currentChunk: number;
  /** 总分片数 */
  totalChunks: number;
  /** 上传速度（字节/秒） */
  speed: number;
  /** 是否已中止 */
  aborted: boolean;
}

export interface ChunkDownloadState {
  /** 下载进度 0-100 */
  progress: number;
  /** 是否正在下载 */
  downloading: boolean;
  /** 是否已中止 */
  aborted: boolean;
}

/** 分片上传回调函数 */
export type ChunkUploadFn = (
  chunk: Blob,
  index: number,
  total: number,
  hash: string,
  signal: AbortSignal,
) => Promise<any>;

/** 分片合并回调函数 */
export type ChunkMergeFn = (
  fileName: string,
  totalChunks: number,
  hash: string,
) => Promise<any>;

// ==================== 内部工具函数 ====================

/**
 * @description 计算文件哈希（使用首尾块 + 文件大小）
 */
async function calculateFileHash(file: File): Promise<string> {
  const chunkSize = 1024 * 1024; // 取首尾各 1MB 用于计算
  const chunks: ArrayBuffer[] = [];

  // 首块
  chunks.push(
    await file.slice(0, Math.min(chunkSize, file.size)).arrayBuffer(),
  );

  // 尾块（如果文件大于 1MB）
  if (file.size > chunkSize) {
    chunks.push(
      await file.slice(Math.max(0, file.size - chunkSize)).arrayBuffer(),
    );
  }

  // 合并首尾块，并预留 8 字节将文件大小真正纳入 SHA-256 输入
  const contentLength = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
  const combined = new Uint8Array(contentLength + 8);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  }

  new DataView(combined.buffer).setBigUint64(
    contentLength,
    BigInt(file.size),
    false,
  );

  // 使用 SubtleCrypto 计算 SHA-256；非安全上下文（http 非 localhost）需调用方降级处理
  if (typeof crypto === "undefined" || !crypto.subtle?.digest) {
    throw new Error("当前环境不支持 crypto.subtle（需 HTTPS 或 localhost）");
  }
  // 文件大小已写入 combined 尾部，因此返回值仍保持标准 64 位十六进制 SHA-256 格式
  const hashBuffer = await crypto.subtle.digest("SHA-256", combined);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * @description 并发控制执行器
 */
async function executeWithConcurrency(
  tasks: Array<() => Promise<void>>,
  concurrent: number,
  onError?: (error: unknown) => void,
): Promise<void> {
  let nextTaskIndex = 0;
  let hasError = false;
  let firstError: unknown;

  const worker = async () => {
    while (!hasError) {
      const taskIndex = nextTaskIndex++;
      if (taskIndex >= tasks.length) return;

      try {
        await tasks[taskIndex]();
      } catch (error) {
        if (!hasError) {
          hasError = true;
          firstError = error;
          onError?.(error);
        }
      }
    }
  };

  const workerCount = Math.min(concurrent, tasks.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  if (hasError) throw firstError;
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${name} 必须是大于 0 的整数`);
  }
}

function waitForRetry(ms: number, signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) return Promise.resolve(false);

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve(true);
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve(false);
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

// ==================== 分片上传 ====================

/**
 * @description 大文件分片上传 Hook
 * @example
 * ```ts
 * import { useChunkUpload } from '@robot-admin/file-utils'
 *
 * const { state, upload, abort } = useChunkUpload({ chunkSize: 5 * 1024 * 1024 })
 *
 * await upload(
 *   file,
 *   async (chunk, index, total, hash) => {
 *     // 上传单个分片到服务器
 *     await api.uploadChunk({ chunk, index, total, hash })
 *   },
 *   async (fileName, totalChunks, hash) => {
 *     // 通知服务器合并分片
 *     await api.mergeChunks({ fileName, totalChunks, hash })
 *   }
 * )
 *
 * // 中止上传
 * abort()
 * ```
 */
export function useChunkUpload(options: ChunkUploadOptions = {}) {
  const {
    chunkSize = 2 * 1024 * 1024, // 2MB
    concurrent = 3,
    retries = 3,
  } = options;

  assertPositiveInteger(chunkSize, "chunkSize");
  assertPositiveInteger(concurrent, "concurrent");
  assertPositiveInteger(retries, "retries");

  let activeController: AbortController | null = null;
  let uploadInProgress = false;

  const state = ref<ChunkUploadState>({
    progress: 0,
    uploading: false,
    currentChunk: 0,
    totalChunks: 0,
    speed: 0,
    aborted: false,
  });

  const upload = async (
    file: File,
    uploadFn: ChunkUploadFn,
    mergeFn?: ChunkMergeFn,
  ): Promise<void> => {
    if (uploadInProgress) {
      throw new Error("已有分片上传任务正在执行");
    }

    uploadInProgress = true;
    const controller = new AbortController();
    activeController = controller;
    const { signal } = controller;
    const totalChunks = Math.ceil(file.size / chunkSize);

    state.value = {
      progress: 0,
      uploading: true,
      currentChunk: 0,
      totalChunks,
      speed: 0,
      aborted: false,
    };

    try {
      const hash = await calculateFileHash(file);
      if (signal.aborted) return;

      const startTime = Date.now();
      let completedChunks = 0;
      let uploadedBytes = 0;

      // 创建分片任务
      const tasks: Array<() => Promise<void>> = [];
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        tasks.push(async () => {
          if (signal.aborted) return;

          let attempt = 0;
          while (attempt < retries && !signal.aborted) {
            try {
              await uploadFn(chunk, i, totalChunks, hash, signal);
              if (signal.aborted) return;

              completedChunks++;
              uploadedBytes += chunk.size;
              state.value.currentChunk = completedChunks;
              state.value.progress = Math.round(
                (completedChunks / totalChunks) * 100,
              );

              const elapsed = (Date.now() - startTime) / 1000;
              state.value.speed = elapsed > 0 ? uploadedBytes / elapsed : 0;
              return;
            } catch (err) {
              if (signal.aborted) return;
              attempt++;
              if (attempt >= retries) throw err;
              if (!(await waitForRetry(1000 * attempt, signal))) return;
            }
          }
        });
      }

      // 并发上传
      await executeWithConcurrency(tasks, concurrent, (error) => {
        controller.abort(error);
      });

      // 合并分片
      if (mergeFn && !signal.aborted) {
        await mergeFn(file.name, totalChunks, hash);
      }

      if (!signal.aborted) state.value.progress = 100;
    } catch (err) {
      if (!state.value.aborted) {
        throw err;
      }
    } finally {
      if (activeController === controller) activeController = null;
      uploadInProgress = false;
      state.value.uploading = false;
    }
  };

  const abort = () => {
    state.value.aborted = true;
    state.value.uploading = false;
    activeController?.abort(new Error("分片上传已中止"));
  };

  return {
    state: computed(() => state.value),
    upload,
    abort,
  };
}

// ==================== 分片下载 ====================

/**
 * @description 大文件分片下载 Hook（流式读取 + 进度追踪）
 * @example
 * ```ts
 * import { useChunkDownload } from '@robot-admin/file-utils'
 *
 * const { state, download, abort } = useChunkDownload()
 *
 * await download('https://example.com/large-file.zip', 'large-file.zip')
 *
 * // 中止下载
 * abort()
 * ```
 */
export function useChunkDownload() {
  let abortController: AbortController | null = null;

  const state = ref<ChunkDownloadState>({
    progress: 0,
    downloading: false,
    aborted: false,
  });

  const download = async (
    url: string,
    fileName: string,
    options: { onProgress?: (progress: number) => void } = {},
  ): Promise<void> => {
    abortController = new AbortController();
    state.value = { progress: 0, downloading: true, aborted: false };

    try {
      const response = await fetch(url, { signal: abortController.signal });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentLength = Number(response.headers.get("content-length") || 0);
      const reader = response.body?.getReader();

      if (!reader) throw new Error("ReadableStream 不受支持");

      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        received += value.length;

        if (contentLength > 0) {
          state.value.progress = Math.round((received / contentLength) * 100);
          options.onProgress?.(state.value.progress);
        }
      }

      // 合并并下载
      const blob = new Blob(chunks as BlobPart[]);
      downloadBlob(blob, fileName);

      state.value.progress = 100;
    } catch (err) {
      if (!state.value.aborted) throw err;
    } finally {
      state.value.downloading = false;
      abortController = null;
    }
  };

  const abort = () => {
    state.value.aborted = true;
    state.value.downloading = false;
    abortController?.abort();
  };

  return {
    state: computed(() => state.value),
    download,
    abort,
  };
}

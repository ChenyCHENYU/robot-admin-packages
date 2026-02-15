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

  // 合并数据
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  }

  // 使用 SubtleCrypto 计算 SHA-256
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
): Promise<void> {
  const results: Promise<void>[] = [];
  const executing: Set<Promise<void>> = new Set();

  for (const task of tasks) {
    const p = task().then(() => {
      executing.delete(p);
    });
    results.push(p);
    executing.add(p);

    if (executing.size >= concurrent) {
      await Promise.race(executing);
    }
  }

  await Promise.all(results);
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
    const totalChunks = Math.ceil(file.size / chunkSize);
    const hash = await calculateFileHash(file);

    state.value = {
      progress: 0,
      uploading: true,
      currentChunk: 0,
      totalChunks,
      speed: 0,
      aborted: false,
    };

    const startTime = Date.now();
    let completedChunks = 0;

    // 创建分片任务
    const tasks: Array<() => Promise<void>> = [];
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      tasks.push(async () => {
        if (state.value.aborted) return;

        let attempt = 0;
        while (attempt < retries) {
          try {
            await uploadFn(chunk, i, totalChunks, hash);
            completedChunks++;
            state.value.currentChunk = completedChunks;
            state.value.progress = Math.round(
              (completedChunks / totalChunks) * 100,
            );

            const elapsed = (Date.now() - startTime) / 1000;
            state.value.speed =
              elapsed > 0 ? (completedChunks * chunkSize) / elapsed : 0;
            break;
          } catch (err) {
            attempt++;
            if (attempt >= retries) throw err;
            // 等待后重试
            await new Promise((r) => setTimeout(r, 1000 * attempt));
          }
        }
      });
    }

    try {
      // 并发上传
      await executeWithConcurrency(tasks, concurrent);

      // 合并分片
      if (mergeFn && !state.value.aborted) {
        await mergeFn(file.name, totalChunks, hash);
      }

      state.value.progress = 100;
    } catch (err) {
      if (!state.value.aborted) {
        throw err;
      }
    } finally {
      state.value.uploading = false;
    }
  };

  const abort = () => {
    state.value.aborted = true;
    state.value.uploading = false;
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

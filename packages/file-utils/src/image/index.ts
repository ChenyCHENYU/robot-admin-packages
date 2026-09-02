/**
 * @description 图片处理工具 - 压缩/裁剪/格式转换/缩放
 * 基于浏览器原生 Canvas API，零外部依赖
 */

import { getFileUtilsContext, type FileUtilsContext } from "../config";
import { assertWithinLimit, FileUtilsError, throwIfAborted } from "../types";
import { useFile } from "../file";

// ==================== 类型定义 ====================

export interface CompressOptions {
  /** 压缩质量 0-1，默认 0.8 */
  quality?: number;
  /** 最大宽度（像素） */
  maxWidth?: number;
  /** 最大高度（像素） */
  maxHeight?: number;
  /** 输出格式，默认 image/jpeg */
  type?: "image/jpeg" | "image/png" | "image/webp";
  /** JPEG transparency fill. Default: white. */
  backgroundColor?: string;
  maxPixels?: number;
  maxFileSize?: number;
  signal?: AbortSignal;
}

export interface CropOptions {
  /** 裁剪起点 X 坐标 */
  x: number;
  /** 裁剪起点 Y 坐标 */
  y: number;
  /** 裁剪宽度 */
  width: number;
  /** 裁剪高度 */
  height: number;
  maxPixels?: number;
  maxFileSize?: number;
  signal?: AbortSignal;
}

export interface ImageInfo {
  /** 图片宽度（像素） */
  width: number;
  /** 图片高度（像素） */
  height: number;
  /** MIME 类型 */
  type: string;
  /** 文件大小（字节） */
  size: number;
}

export type ImageFormat = "png" | "jpeg" | "webp";

export interface UseImageOptions {
  context?: FileUtilsContext;
  /** Verify common raster file signatures against the declared MIME type. */
  verifyMimeType?: boolean;
}

// ==================== 内部工具函数 ====================

/**
 * @description 安全获取 Canvas 2D 上下文（getContext 可能返回 null）
 */
function get2DContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new FileUtilsError(
      "NOT_SUPPORTED",
      "无法获取 Canvas 2D 上下文（环境不支持或上下文数量超限）",
    );
  }
  return ctx;
}

/**
 * @description 从 File/Blob 加载 HTMLImageElement
 */
function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

/** Detects common raster image formats from file signatures. */
export async function detectImageMimeType(
  source: Blob,
  signal?: AbortSignal,
): Promise<string | undefined> {
  throwIfAborted(signal);
  const bytes = new Uint8Array(await source.slice(0, 64).arrayBuffer());
  throwIfAborted(signal);
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  const header6 = ascii(bytes, 0, 6);
  if (header6 === "GIF87a" || header6 === "GIF89a") return "image/gif";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return "image/webp";
  }
  if (ascii(bytes, 0, 2) === "BM") return "image/bmp";
  if (
    startsWith(bytes, [0x49, 0x49, 0x2a, 0x00]) ||
    startsWith(bytes, [0x4d, 0x4d, 0x00, 0x2a])
  ) {
    return "image/tiff";
  }
  if (startsWith(bytes, [0x00, 0x00, 0x01, 0x00])) return "image/x-icon";
  if (ascii(bytes, 4, 4) === "ftyp") {
    const brands = ascii(bytes, 8, Math.max(0, bytes.length - 8));
    if (/avif|avis/.test(brands)) return "image/avif";
    if (/heic|heix|hevc|hevx/.test(brands)) return "image/heic";
  }
  return undefined;
}

function normalizeImageMimeType(type: string): string {
  const normalized = type.toLowerCase().split(";", 1)[0].trim();
  if (normalized === "image/jpg") return "image/jpeg";
  if (normalized === "image/vnd.microsoft.icon") return "image/x-icon";
  return normalized;
}

async function loadImage(
  source: File | Blob,
  signal?: AbortSignal,
  verifyMimeType = false,
): Promise<HTMLImageElement> {
  if (source.type && !source.type.startsWith("image/")) {
    return Promise.reject(
      new FileUtilsError(
        "INVALID_CONTENT",
        `不支持的图片 MIME 类型: ${source.type}`,
      ),
    );
  }
  if (verifyMimeType) {
    const detected = await detectImageMimeType(source, signal);
    if (!detected) {
      throw new FileUtilsError("INVALID_CONTENT", "无法识别图片文件签名");
    }
    if (
      source.type &&
      normalizeImageMimeType(source.type) !== normalizeImageMimeType(detected)
    ) {
      throw new FileUtilsError(
        "INVALID_CONTENT",
        `图片 MIME 与文件签名不一致: ${source.type} / ${detected}`,
        { details: { declared: source.type, detected } },
      );
    }
  }
  if (
    typeof Image === "undefined" ||
    typeof globalThis.URL?.createObjectURL !== "function"
  ) {
    throw new FileUtilsError("NOT_SUPPORTED", "当前环境不支持浏览器图片解码");
  }
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(source);

    const cleanup = () => {
      URL.revokeObjectURL(url);
      signal?.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      img.onload = null;
      img.onerror = null;
      cleanup();
      img.removeAttribute("src");
      reject(
        new FileUtilsError("ABORTED", "图片处理已取消", {
          cause: signal?.reason,
        }),
      );
    };
    img.onload = () => {
      img.onload = null;
      img.onerror = null;
      cleanup();
      resolve(img);
    };
    img.onerror = () => {
      img.onload = null;
      img.onerror = null;
      cleanup();
      reject(new FileUtilsError("READ_FAILED", "图片加载失败"));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
    img.src = url;
  });
}

/**
 * @description Canvas 转 Blob
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new FileUtilsError("WRITE_FAILED", "Canvas 转 Blob 失败")),
      type,
      quality,
    );
  });
}

function assertDimension(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
    throw new RangeError(`${name} 必须是大于 0 的整数`);
  }
}

function assertCoordinate(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} 必须是大于或等于 0 的有限数值`);
  }
}

function assertPixelLimit(
  width: number,
  height: number,
  maximum: number,
): void {
  assertDimension(width, "width");
  assertDimension(height, "height");
  if (width * height > maximum) {
    throw new FileUtilsError(
      "LIMIT_EXCEEDED",
      `图片像素数超过限制：${width}×${height} > ${maximum}`,
    );
  }
}

// ==================== 主 Hook ====================

/**
 * @description 图片处理工具 - 提供压缩、裁剪、格式转换、缩放等能力
 * @example
 * ```ts
 * import { useImage } from '@robot-admin/file-utils'
 *
 * const image = useImage()
 *
 * // 压缩图片
 * const compressed = await image.compress(file, { quality: 0.6, maxWidth: 1200 })
 *
 * // 裁剪图片
 * const cropped = await image.crop(file, { x: 0, y: 0, width: 300, height: 300 })
 *
 * // 格式转换
 * const webp = await image.convert(file, 'webp')
 *
 * // 获取图片信息
 * const info = await image.getInfo(file)
 * console.log(info.width, info.height, info.size)
 * ```
 */
export function useImage(options: UseImageOptions = {}) {
  const context = () => getFileUtilsContext(options.context);
  const verifyMimeType = options.verifyMimeType ?? false;
  const createCanvas = (): HTMLCanvasElement => {
    if (!globalThis.document?.createElement) {
      throw new FileUtilsError("NOT_SUPPORTED", "当前环境不支持 Canvas");
    }
    return document.createElement("canvas");
  };
  const validateInput = (file: File | Blob, maxFileSize?: number) => {
    assertWithinLimit(
      file.size,
      maxFileSize ?? context().limits.maxFileSize,
      "图片文件大小",
    );
  };
  /**
   * @description 压缩图片
   */
  const compress = async (
    file: File | Blob,
    options: CompressOptions = {},
  ): Promise<Blob> => {
    const {
      quality = 0.8,
      maxWidth,
      maxHeight,
      type = "image/jpeg",
      backgroundColor = "#fff",
      maxPixels,
      maxFileSize,
      signal,
    } = options;
    validateInput(file, maxFileSize);
    if (!Number.isFinite(quality) || quality < 0 || quality > 1) {
      throw new RangeError("quality 必须位于 0 到 1 之间");
    }
    if (maxWidth !== undefined) assertDimension(maxWidth, "maxWidth");
    if (maxHeight !== undefined) assertDimension(maxHeight, "maxHeight");

    const img = await loadImage(file, signal, verifyMimeType);
    assertPixelLimit(
      img.width,
      img.height,
      maxPixels ?? context().limits.maxImagePixels,
    );
    let { width, height } = img;

    // 按比例缩放
    if (maxWidth && width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }
    if (maxHeight && height > maxHeight) {
      width = Math.round((width * maxHeight) / height);
      height = maxHeight;
    }

    assertPixelLimit(
      width,
      height,
      maxPixels ?? context().limits.maxImagePixels,
    );
    const canvas = createCanvas();
    canvas.width = width;
    canvas.height = height;

    const ctx = get2DContext(canvas);
    if (type === "image/jpeg") {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(img, 0, 0, width, height);
    throwIfAborted(signal);
    const blob = await canvasToBlob(canvas, type, quality);
    throwIfAborted(signal);
    if (blob.type && blob.type !== type) {
      throw new FileUtilsError(
        "NOT_SUPPORTED",
        `浏览器不支持输出格式: ${type}`,
      );
    }
    return blob;
  };

  /**
   * @description 裁剪图片
   */
  const crop = async (
    file: File | Blob,
    options: CropOptions,
  ): Promise<Blob> => {
    const { signal, maxPixels } = options;
    validateInput(file, options.maxFileSize);
    const img = await loadImage(file, signal, verifyMimeType);
    assertDimension(options.width, "width");
    assertDimension(options.height, "height");
    assertCoordinate(options.x, "x");
    assertCoordinate(options.y, "y");
    if (
      options.x + options.width > img.width ||
      options.y + options.height > img.height
    ) {
      throw new RangeError("裁剪区域超出图片边界");
    }
    assertPixelLimit(
      options.width,
      options.height,
      maxPixels ?? context().limits.maxImagePixels,
    );

    const canvas = createCanvas();
    canvas.width = options.width;
    canvas.height = options.height;

    const ctx = get2DContext(canvas);
    ctx.drawImage(
      img,
      options.x,
      options.y,
      options.width,
      options.height,
      0,
      0,
      options.width,
      options.height,
    );

    throwIfAborted(signal);
    const blob = await canvasToBlob(canvas, "image/png");
    throwIfAborted(signal);
    return blob;
  };

  /**
   * @description 图片格式转换
   */
  const convert = async (
    file: File | Blob,
    format: ImageFormat,
    options: {
      quality?: number;
      maxPixels?: number;
      maxFileSize?: number;
      signal?: AbortSignal;
    } = {},
  ): Promise<Blob> => {
    validateInput(file, options.maxFileSize);
    const img = await loadImage(file, options.signal, verifyMimeType);
    assertPixelLimit(
      img.width,
      img.height,
      options.maxPixels ?? context().limits.maxImagePixels,
    );

    const canvas = createCanvas();
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = get2DContext(canvas);
    ctx.drawImage(img, 0, 0);

    const mimeType = `image/${format}`;
    const quality = format === "jpeg" ? options.quality ?? 0.92 : undefined;
    if (
      quality !== undefined &&
      (!Number.isFinite(quality) || quality < 0 || quality > 1)
    ) {
      throw new RangeError("quality 必须位于 0 到 1 之间");
    }

    throwIfAborted(options.signal);
    const blob = await canvasToBlob(canvas, mimeType, quality);
    throwIfAborted(options.signal);
    if (blob.type && blob.type !== mimeType) {
      throw new FileUtilsError(
        "NOT_SUPPORTED",
        `浏览器不支持输出格式: ${mimeType}`,
      );
    }
    return blob;
  };

  /**
   * @description 缩放图片
   */
  const resize = async (
    file: File | Blob,
    width: number,
    height?: number,
    options: {
      maxPixels?: number;
      maxFileSize?: number;
      signal?: AbortSignal;
    } = {},
  ): Promise<Blob> => {
    validateInput(file, options.maxFileSize);
    assertDimension(width, "width");
    if (height !== undefined) assertDimension(height, "height");
    const img = await loadImage(file, options.signal, verifyMimeType);
    const targetHeight = height ?? Math.round((img.height * width) / img.width);
    assertPixelLimit(
      width,
      targetHeight,
      options.maxPixels ?? context().limits.maxImagePixels,
    );

    const canvas = createCanvas();
    canvas.width = width;
    canvas.height = targetHeight;

    const ctx = get2DContext(canvas);
    ctx.drawImage(img, 0, 0, width, targetHeight);

    throwIfAborted(options.signal);
    const blob = await canvasToBlob(canvas, "image/png");
    throwIfAborted(options.signal);
    return blob;
  };

  /**
   * @description 获取图片信息
   */
  const getInfo = async (
    file: File | Blob,
    readOptions: {
      maxPixels?: number;
      maxFileSize?: number;
      signal?: AbortSignal;
    } = {},
  ): Promise<ImageInfo> => {
    validateInput(file, readOptions.maxFileSize);
    const img = await loadImage(file, readOptions.signal, verifyMimeType);
    assertPixelLimit(
      img.width,
      img.height,
      readOptions.maxPixels ?? context().limits.maxImagePixels,
    );
    return {
      width: img.width,
      height: img.height,
      type: file.type || "unknown",
      size: file.size,
    };
  };

  /**
   * @description 图片转 Base64（复用 file 模块实现）
   */
  const toBase64 = (
    file: File | Blob,
    readOptions: { maxFileSize?: number; signal?: AbortSignal } = {},
  ): Promise<string> =>
    useFile({ context: options.context }).toBase64(
      file,
      readOptions.maxFileSize ?? context().limits.maxFileSize,
      readOptions.signal,
    );

  return { compress, crop, convert, resize, getInfo, toBase64 };
}

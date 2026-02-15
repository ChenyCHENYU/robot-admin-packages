/**
 * @description 图片处理工具 - 压缩/裁剪/格式转换/缩放
 * 基于浏览器原生 Canvas API，零外部依赖
 */

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

// ==================== 内部工具函数 ====================

/**
 * @description 从 File/Blob 加载 HTMLImageElement
 */
function loadImage(source: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(source);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片加载失败"));
    };

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
        blob ? resolve(blob) : reject(new Error("Canvas 转 Blob 失败")),
      type,
      quality,
    );
  });
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
export function useImage() {
  /**
   * @description 压缩图片
   */
  const compress = async (
    file: File | Blob,
    options: CompressOptions = {},
  ): Promise<Blob> => {
    const { quality = 0.8, maxWidth, maxHeight, type = "image/jpeg" } = options;

    const img = await loadImage(file);
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

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, width, height);

    return canvasToBlob(canvas, type, quality);
  };

  /**
   * @description 裁剪图片
   */
  const crop = async (
    file: File | Blob,
    options: CropOptions,
  ): Promise<Blob> => {
    const img = await loadImage(file);

    const canvas = document.createElement("canvas");
    canvas.width = options.width;
    canvas.height = options.height;

    const ctx = canvas.getContext("2d")!;
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

    return canvasToBlob(canvas, "image/png");
  };

  /**
   * @description 图片格式转换
   */
  const convert = async (
    file: File | Blob,
    format: ImageFormat,
  ): Promise<Blob> => {
    const img = await loadImage(file);

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    const mimeType = `image/${format}`;
    const quality = format === "jpeg" ? 0.92 : undefined;

    return canvasToBlob(canvas, mimeType, quality);
  };

  /**
   * @description 缩放图片
   */
  const resize = async (
    file: File | Blob,
    width: number,
    height?: number,
  ): Promise<Blob> => {
    const img = await loadImage(file);
    const targetHeight = height || Math.round((img.height * width) / img.width);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, width, targetHeight);

    return canvasToBlob(canvas, "image/png");
  };

  /**
   * @description 获取图片信息
   */
  const getInfo = async (file: File | Blob): Promise<ImageInfo> => {
    const img = await loadImage(file);
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
  const toBase64 = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("图片读取失败"));
      reader.readAsDataURL(file);
    });
  };

  return { compress, crop, convert, resize, getInfo, toBase64 };
}

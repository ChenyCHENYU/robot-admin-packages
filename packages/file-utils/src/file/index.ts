/**
 * @description 文件处理工具 - Base64/JSON/XML 操作
 * 纯浏览器 API，零外部依赖
 */

import { downloadBlob } from "../types";

// ==================== 类型定义 ====================

export interface XMLOptions {
  /** XML 根元素名称，默认 'root' */
  rootName?: string;
  /** 文件名，默认 'export.xml' */
  fileName?: string;
  /** 缩进空格数，默认 2 */
  indent?: number;
  /** 是否包含 XML 声明，默认 true */
  declaration?: boolean;
}

// ==================== 内部工具函数 ====================

/**
 * @description 将对象转换为 XML 字符串
 */
function objectToXML(
  obj: any,
  tagName: string,
  level: number,
  indent: number,
): string {
  const pad = " ".repeat(level * indent);

  if (Array.isArray(obj)) {
    return obj
      .map((item) => objectToXML(item, tagName, level, indent))
      .join("\n");
  }

  if (typeof obj === "object" && obj !== null) {
    const children = Object.entries(obj)
      .map(([key, value]) => objectToXML(value, key, level + 1, indent))
      .join("\n");
    return `${pad}<${tagName}>\n${children}\n${pad}</${tagName}>`;
  }

  return `${pad}<${tagName}>${escapeXML(String(obj))}</${tagName}>`;
}

/**
 * @description XML 特殊字符转义
 */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ==================== 主 Hook ====================

/**
 * @description 文件处理工具 - 提供 Base64、JSON、XML 等文件操作能力
 * @example
 * ```ts
 * import { useFile } from '@robot-admin/file-utils'
 *
 * const file = useFile()
 *
 * // Base64 转换
 * const base64 = await file.toBase64(imageFile)
 * const restoredFile = file.fromBase64(base64, 'image.png')
 *
 * // 下载为 JSON
 * file.downloadJSON(data, 'config.json')
 *
 * // 下载为 XML
 * file.downloadXML(data, { rootName: 'users', fileName: 'users.xml' })
 *
 * // 读取文件
 * const json = await file.readAsJSON<Config>(jsonFile)
 * ```
 */
export function useFile() {
  /**
   * @description 将 File/Blob 转为 Base64 字符串
   */
  const toBase64 = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("文件读取失败"));
      reader.readAsDataURL(file);
    });
  };

  /**
   * @description 将 Base64 字符串还原为 File 对象
   */
  const fromBase64 = (
    base64: string,
    fileName: string,
    mimeType?: string,
  ): File => {
    const arr = base64.split(",");
    const mime =
      mimeType || arr[0]?.match(/:(.*?);/)?.[1] || "application/octet-stream";
    const bstr = atob(arr.length > 1 ? arr[1] : arr[0]);
    const u8arr = new Uint8Array(bstr.length);

    for (let i = 0; i < bstr.length; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }

    return new File([u8arr], fileName, { type: mime });
  };

  /**
   * @description 将数据下载为 JSON 文件
   */
  const downloadJSON = (data: any, fileName = "export.json"): void => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], {
      type: "application/json;charset=utf-8;",
    });
    downloadBlob(blob, fileName);
  };

  /**
   * @description 将数据下载为 XML 文件
   */
  const downloadXML = (
    data: Record<string, any>,
    options: XMLOptions = {},
  ): void => {
    const {
      rootName = "root",
      fileName = "export.xml",
      indent = 2,
      declaration = true,
    } = options;

    let xml = declaration ? '<?xml version="1.0" encoding="UTF-8"?>\n' : "";
    xml += objectToXML(data, rootName, 0, indent);

    const blob = new Blob([xml], { type: "application/xml;charset=utf-8;" });
    downloadBlob(blob, fileName);
  };

  /**
   * @description 读取文件为文本
   */
  const readAsText = (file: File): Promise<string> => {
    return file.text();
  };

  /**
   * @description 读取文件为 JSON 对象
   */
  const readAsJSON = <T = any>(file: File): Promise<T> => {
    return file.text().then((text) => JSON.parse(text));
  };

  /**
   * @description 读取文件为 ArrayBuffer
   */
  const readAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return file.arrayBuffer();
  };

  return {
    toBase64,
    fromBase64,
    downloadJSON,
    downloadXML,
    readAsText,
    readAsJSON,
    readAsArrayBuffer,
  };
}

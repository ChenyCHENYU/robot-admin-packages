/**
 * @description 通用下载文件 Hook 封装 - 支持多种文件类型导出
 * 已解耦 naive-ui，通知通过 configureFileUtils 注入
 */

import { getNotificationHandler } from "../config";
import { downloadBlob } from "../types";

// ==================== 类型定义 ====================

/** 文件类型枚举 */
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

/** MIME 类型映射 */
const MIME_TYPE_MAP: Record<string, string> = {
  [FileType.XLSX]:
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  [FileType.XLS]: "application/vnd.ms-excel",
  [FileType.CSV]: "text/csv",
  [FileType.PDF]: "application/pdf",
  [FileType.DOC]: "application/msword",
  [FileType.DOCX]:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  [FileType.PPT]: "application/vnd.ms-powerpoint",
  [FileType.PPTX]:
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  [FileType.TXT]: "text/plain",
  [FileType.JSON]: "application/json",
  [FileType.XML]: "application/xml",
  [FileType.ZIP]: "application/zip",
  [FileType.RAR]: "application/x-rar-compressed",
  [FileType.PNG]: "image/png",
  [FileType.JPG]: "image/jpeg",
  [FileType.JPEG]: "image/jpeg",
  [FileType.GIF]: "image/gif",
  [FileType.SVG]: "image/svg+xml",
  [FileType.MP4]: "video/mp4",
  [FileType.MP3]: "audio/mpeg",
  [FileType.WAV]: "audio/wav",
};

/** 下载配置接口 */
export interface DownloadConfig {
  fileName: string;
  fileType: FileType;
  params?: Record<string, unknown>;
  showNotification?: boolean;
  notificationConfig?: {
    loading?: string;
    success?: string;
    error?: string;
  };
}

/** API 函数类型 */
export type DownloadApiFunction = (
  params?: Record<string, unknown>,
) => Promise<Blob>;

// ==================== 默认配置 ====================

const DEFAULT_NOTIFICATION_CONFIG = {
  loading: "文件下载中，请稍候...",
  success: "文件下载成功",
  error: "文件下载失败",
};

// ==================== 工具函数 ====================

/**
 * @description 显示通知消息
 */
const showNotificationMessage = (
  type: "info" | "success" | "error",
  content: string,
  duration = 2000,
) => {
  const handler = getNotificationHandler();
  handler(type, content, duration);
};

/**
 * @description 获取完整文件名
 */
const getFullFileName = (fileName: string, fileType: FileType): string => {
  return fileName.endsWith(fileType) ? fileName : `${fileName}${fileType}`;
};

/**
 * @description 创建文件 Blob 对象
 */
const createFileBlob = (response: Blob, fileType: FileType): Blob => {
  const mimeType = MIME_TYPE_MAP[fileType] || "application/octet-stream";
  return new Blob([response], { type: mimeType });
};

// ==================== 导出函数 ====================

/**
 * @description 通用下载 Hook
 * @example
 * ```ts
 * import { useDownload, FileType } from '@robot-admin/file-utils'
 *
 * await useDownload(api.downloadFile, {
 *   fileName: '报表',
 *   fileType: FileType.XLSX,
 *   params: { id: 1 }
 * })
 * ```
 */
export const useDownload = async (
  api: DownloadApiFunction,
  config: DownloadConfig,
): Promise<void> => {
  const {
    fileName,
    fileType,
    params = {},
    showNotification = true,
    notificationConfig = {},
  } = config;

  const notificationMessages = {
    ...DEFAULT_NOTIFICATION_CONFIG,
    ...notificationConfig,
  };

  try {
    if (showNotification) {
      showNotificationMessage("info", notificationMessages.loading);
    }

    const response = await api(params);

    const blob = createFileBlob(response, fileType);
    const fullFileName = getFullFileName(fileName, fileType);

    downloadBlob(blob, fullFileName);

    if (showNotification) {
      showNotificationMessage("success", notificationMessages.success);
    }
  } catch (err) {
    if (showNotification) {
      showNotificationMessage(
        "error",
        `${notificationMessages.error}：${err instanceof Error ? err.message : "未知错误"}`,
        3000,
      );
    }

    const errorMessage = `${notificationMessages.error}：${err instanceof Error ? err.message : "未知错误"}`;
    throw new Error(errorMessage);
  }
};

/**
 * @description 创建快捷下载方法
 */
const createQuickDownloadMethod = (fileType: FileType) => {
  return (
    api: DownloadApiFunction,
    fileName: string,
    params?: Record<string, unknown>,
  ) => {
    return useDownload(api, {
      fileName,
      fileType,
      params,
    });
  };
};

/** 快捷下载 - Excel */
export const useDownloadExcel = createQuickDownloadMethod(FileType.XLSX);

/** 快捷下载 - CSV */
export const useDownloadCSV = createQuickDownloadMethod(FileType.CSV);

/** 快捷下载 - PDF */
export const useDownloadPDF = createQuickDownloadMethod(FileType.PDF);

/** 快捷下载 - JSON */
export const useDownloadJSON = createQuickDownloadMethod(FileType.JSON);

/**
 * @description 获取支持的文件类型列表
 */
export const getSupportedFileTypes = (): Array<{
  label: string;
  value: FileType;
}> => {
  return Object.values(FileType).map((type) => ({
    label: type.toUpperCase().substring(1),
    value: type,
  }));
};

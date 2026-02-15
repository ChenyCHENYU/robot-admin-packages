/**
 * @description 公共类型定义
 */

/** 通用的导出/下载结果 */
export interface ExportResult {
  success: boolean;
  fileName: string;
  fileCount: number;
  message: string;
}

/** 通用的下载 Blob 辅助函数 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  Object.assign(link, {
    href: url,
    download: fileName,
    style: "display: none",
  });

  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 100);
}

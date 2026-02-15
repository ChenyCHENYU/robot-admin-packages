/**
 * @description 全局配置 - 解耦 UI 框架（naive-ui 等）
 * 通过 configureFileUtils 注入消息和通知回调，实现与 UI 框架的解耦
 * 如果未配置，默认回退到 console.log
 */

export interface FileUtilsConfig {
  /**
   * 消息回调（短提示，类似 toast）
   * 用于 useExcel、useJSZip 的操作反馈
   */
  onMessage?: (
    type: "success" | "error" | "info" | "warning",
    text: string,
  ) => void;

  /**
   * 通知回调（较长的通知提示）
   * 用于 useDownload 的下载状态反馈
   */
  onNotification?: (
    type: "success" | "error" | "info",
    content: string,
    duration?: number,
  ) => void;
}

let globalConfig: FileUtilsConfig = {};

/**
 * @description 配置 file-utils 全局设置
 * @example
 * ```ts
 * import { configureFileUtils } from '@robot-admin/file-utils'
 * import { createDiscreteApi } from 'naive-ui/es/discrete'
 *
 * const { message, notification } = createDiscreteApi(['message', 'notification'])
 *
 * configureFileUtils({
 *   onMessage: (type, text) => message[type](text),
 *   onNotification: (type, content, duration) =>
 *     notification[type]({ content, duration: duration ?? 2000 })
 * })
 * ```
 */
export function configureFileUtils(config: FileUtilsConfig): void {
  globalConfig = { ...globalConfig, ...config };
}

/**
 * @description 获取消息处理器（内部使用）
 */
export function getMessageHandler(): (
  type: "success" | "error" | "info" | "warning",
  text: string,
) => void {
  return (
    globalConfig.onMessage ??
    ((type, text) => {
      const prefix: Record<string, string> = {
        success: "✅",
        error: "❌",
        info: "ℹ️",
        warning: "⚠️",
      };
      console.log(`${prefix[type]} [file-utils] ${text}`);
    })
  );
}

/**
 * @description 获取通知处理器（内部使用）
 */
export function getNotificationHandler(): (
  type: "success" | "error" | "info",
  content: string,
  duration?: number,
) => void {
  return (
    globalConfig.onNotification ??
    ((type, content) => {
      const prefix: Record<string, string> = {
        success: "✅",
        error: "❌",
        info: "ℹ️",
      };
      console.log(`${prefix[type]} [file-utils] ${content}`);
    })
  );
}

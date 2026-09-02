export type MessageType = "success" | "error" | "info" | "warning";
export type NotificationType = "success" | "error" | "info";

export interface FileUtilsLimits {
  maxFileSize: number;
  maxRows: number;
  maxColumns: number;
  maxFieldLength: number;
  maxOutputSize: number;
  maxImagePixels: number;
  maxArchiveFiles: number;
  maxArchiveSize: number;
  maxBufferedDownloadSize: number;
}

export interface FileUtilsConfig {
  onMessage?: (type: MessageType, text: string) => void;
  onNotification?: (
    type: NotificationType,
    content: string,
    duration?: number,
  ) => void;
  logger?: Pick<Console, "debug" | "info" | "warn" | "error">;
  limits?: Partial<FileUtilsLimits>;
}

export interface FileUtilsContext {
  readonly config: Readonly<FileUtilsConfig>;
  readonly limits: Readonly<FileUtilsLimits>;
  message(type: MessageType, text: string): void;
  notify(type: NotificationType, content: string, duration?: number): void;
}

export const DEFAULT_FILE_UTILS_LIMITS: Readonly<FileUtilsLimits> = {
  maxFileSize: 100 * 1024 * 1024,
  maxRows: 100_000,
  maxColumns: 1_000,
  maxFieldLength: 1_000_000,
  maxOutputSize: 256 * 1024 * 1024,
  maxImagePixels: 40_000_000,
  maxArchiveFiles: 10_000,
  maxArchiveSize: 1024 * 1024 * 1024,
  maxBufferedDownloadSize: 512 * 1024 * 1024,
};

export function createFileUtilsContext(
  config: FileUtilsConfig = {},
): FileUtilsContext {
  const limits = Object.freeze({
    ...DEFAULT_FILE_UTILS_LIMITS,
    ...config.limits,
  });
  const snapshot: Readonly<FileUtilsConfig> = Object.freeze({
    ...config,
    limits,
  });
  return Object.freeze({
    config: snapshot,
    limits,
    message(type: MessageType, text: string) {
      snapshot.onMessage?.(type, text);
      snapshot.logger?.debug?.(`[file-utils:${type}] ${text}`);
    },
    notify(type: NotificationType, content: string, duration?: number) {
      snapshot.onNotification?.(type, content, duration);
      snapshot.logger?.debug?.(`[file-utils:${type}] ${content}`);
    },
  });
}

let defaultContext = createFileUtilsContext();

/** Compatibility API. Prefer a scoped context for multi-app or SSR usage. */
export function configureFileUtils(config: FileUtilsConfig): void {
  defaultContext = createFileUtilsContext({
    ...defaultContext.config,
    ...config,
    limits: { ...defaultContext.limits, ...config.limits },
  });
}

export function resetFileUtilsConfig(): void {
  defaultContext = createFileUtilsContext();
}

export function getFileUtilsContext(
  context?: FileUtilsContext,
): FileUtilsContext {
  return context ?? defaultContext;
}

export function getMessageHandler(context?: FileUtilsContext) {
  return (type: MessageType, text: string): void =>
    getFileUtilsContext(context).message(type, text);
}

export function getNotificationHandler(context?: FileUtilsContext) {
  return (
    type: NotificationType,
    content: string,
    duration?: number,
  ): void => getFileUtilsContext(context).notify(type, content, duration);
}

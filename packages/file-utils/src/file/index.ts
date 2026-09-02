import { getFileUtilsContext, type FileUtilsContext } from "../config";
import {
  assertWithinLimit,
  downloadBlob,
  FileUtilsError,
  sanitizeFileName,
  throwIfAborted,
} from "../types";

export interface XMLOptions {
  rootName?: string;
  fileName?: string;
  indent?: number;
  declaration?: boolean;
  invalidTagStrategy?: "sanitize" | "reject";
  maxDepth?: number;
  maxNodes?: number;
  maxOutputSize?: number;
  signal?: AbortSignal;
}

export interface JSONFileOptions {
  maxFileSize?: number;
  reviver?: (this: unknown, key: string, value: unknown) => unknown;
  signal?: AbortSignal;
}

export interface UseFileOptions {
  context?: FileUtilsContext;
}

function tagName(name: string, strategy: "sanitize" | "reject"): string {
  if (/^[A-Za-z_][\w.\-]*$/.test(name)) return name;
  if (strategy === "reject") {
    throw new FileUtilsError("INVALID_CONTENT", `无效的 XML 标签名: ${name}`);
  }
  const escaped = String(name).replace(/[^\w.\-]/g, "_");
  return `_${escaped || "item"}`;
}

function escapeXML(value: string): string {
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/.test(value)) {
    throw new FileUtilsError("INVALID_CONTENT", "数据包含 XML 1.0 不允许的控制字符");
  }
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface XMLBuildContext {
  indent: number;
  strategy: "sanitize" | "reject";
  maxDepth: number;
  maxNodes: number;
  nodes: number;
  ancestors: WeakSet<object>;
  signal?: AbortSignal;
}

function objectToXML(
  value: unknown,
  name: string,
  level: number,
  context: XMLBuildContext,
): string {
  throwIfAborted(context.signal);
  if (level > context.maxDepth) {
    throw new FileUtilsError("LIMIT_EXCEEDED", "XML 嵌套深度超过限制");
  }
  context.nodes += 1;
  assertWithinLimit(context.nodes, context.maxNodes, "XML 节点数");
  const pad = " ".repeat(level * context.indent);
  const safeName = tagName(name, context.strategy);

  if (Array.isArray(value)) {
    if (context.ancestors.has(value)) {
      throw new FileUtilsError("INVALID_CONTENT", "XML 数据存在循环引用");
    }
    context.ancestors.add(value);
    const result = value
      .map((item) => objectToXML(item, name, level, context))
      .join("\n");
    context.ancestors.delete(value);
    return result;
  }

  if (value !== null && typeof value === "object" && !(value instanceof Date)) {
    if (context.ancestors.has(value)) {
      throw new FileUtilsError("INVALID_CONTENT", "XML 数据存在循环引用");
    }
    context.ancestors.add(value);
    const entries = Object.entries(value as Record<string, unknown>);
    const normalizedNames = new Map<string, string>();
    for (const [key] of entries) {
      const normalized = tagName(key, context.strategy);
      const previous = normalizedNames.get(normalized);
      if (previous && previous !== key) {
        throw new FileUtilsError(
          "INVALID_CONTENT",
          `XML 标签清洗后发生冲突: ${previous} / ${key}`,
        );
      }
      normalizedNames.set(normalized, key);
    }
    const children = entries
      .filter(([, child]) => child !== undefined)
      .map(([key, child]) => objectToXML(child, key, level + 1, context))
      .join("\n");
    context.ancestors.delete(value);
    return children
      ? `${pad}<${safeName}>\n${children}\n${pad}</${safeName}>`
      : `${pad}<${safeName}/>`;
  }

  const text = value instanceof Date ? value.toISOString() : value == null ? "" : String(value);
  return `${pad}<${safeName}>${escapeXML(text)}</${safeName}>`;
}

export function useFile(options: UseFileOptions = {}) {
  const context = () => getFileUtilsContext(options.context);

  const toBase64 = (
    file: File | Blob,
    maxFileSize = context().limits.maxFileSize,
    signal?: AbortSignal,
  ) => {
    throwIfAborted(signal);
    assertWithinLimit(file.size, maxFileSize, "Base64 输入文件");
    if (typeof FileReader === "undefined") {
      return Promise.reject(
        new FileUtilsError("NOT_SUPPORTED", "当前环境不支持 FileReader"),
      );
    }
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      const cleanup = () => signal?.removeEventListener("abort", onAbort);
      const onAbort = () => reader.abort();
      reader.onload = () => {
        cleanup();
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new FileUtilsError("READ_FAILED", "文件读取结果不是字符串"));
      };
      reader.onerror = () => {
        cleanup();
        reject(
          new FileUtilsError("READ_FAILED", "文件读取失败", {
            cause: reader.error,
          }),
        );
      };
      reader.onabort = () => {
        cleanup();
        reject(new FileUtilsError("ABORTED", "文件读取已取消", { cause: signal?.reason }));
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      reader.readAsDataURL(file);
    });
  };

  const fromBase64 = (
    base64: string,
    fileName: string,
    mimeType?: string,
    maxOutputSize = context().limits.maxOutputSize,
  ): File => {
    try {
      if (typeof atob !== "function" || typeof File === "undefined") {
        throw new FileUtilsError("NOT_SUPPORTED", "当前环境不支持 Base64 文件转换");
      }
      const comma = base64.indexOf(",");
      const metadata = comma >= 0 ? base64.slice(0, comma) : "";
      const encoded = comma >= 0 ? base64.slice(comma + 1) : base64;
      const mime = mimeType ?? metadata.match(/^data:([^;,]+);base64$/i)?.[1] ?? "application/octet-stream";
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 === 1) {
        throw new Error("Base64 格式不合法");
      }
      const binary = atob(encoded);
      assertWithinLimit(binary.length, maxOutputSize, "Base64 输出文件");
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      return new File([bytes], sanitizeFileName(fileName), { type: mime });
    } catch (cause) {
      if (cause instanceof FileUtilsError) throw cause;
      throw new FileUtilsError("INVALID_CONTENT", "无效的 Base64 数据", { cause });
    }
  };

  const downloadJSON = (
    data: unknown,
    fileName = "export.json",
    maxOutputSize = context().limits.maxOutputSize,
    signal?: AbortSignal,
  ): void => {
    throwIfAborted(signal);
    let json: string;
    try {
      const serialized = JSON.stringify(data, null, 2);
      if (serialized === undefined) {
        throw new TypeError("顶层值不能被 JSON 序列化");
      }
      json = serialized;
    } catch (cause) {
      throw new FileUtilsError("INVALID_CONTENT", "数据无法序列化为 JSON", { cause });
    }
    assertWithinLimit(new Blob([json]).size, maxOutputSize, "JSON 输出");
    downloadBlob(new Blob([json], { type: "application/json;charset=utf-8" }), fileName);
  };

  const downloadXML = (
    data: Record<string, unknown>,
    options: XMLOptions = {},
  ): void => {
    throwIfAborted(options.signal);
    const buildContext: XMLBuildContext = {
      indent: options.indent ?? 2,
      strategy: options.invalidTagStrategy ?? "sanitize",
      maxDepth: options.maxDepth ?? 100,
      maxNodes: options.maxNodes ?? 100_000,
      nodes: 0,
      ancestors: new WeakSet(),
      signal: options.signal,
    };
    if (
      !Number.isInteger(buildContext.indent) ||
      buildContext.indent < 0 ||
      buildContext.indent > 16
    ) {
      throw new RangeError("indent 必须是 0 到 16 之间的整数");
    }
    const body = objectToXML(data, options.rootName ?? "root", 0, buildContext);
    throwIfAborted(options.signal);
    const xml = `${options.declaration === false ? "" : '<?xml version="1.0" encoding="UTF-8"?>\n'}${body}`;
    assertWithinLimit(
      new Blob([xml]).size,
      options.maxOutputSize ?? context().limits.maxOutputSize,
      "XML 输出",
    );
    downloadBlob(
      new Blob([xml], { type: "application/xml;charset=utf-8" }),
      options.fileName ?? "export.xml",
    );
  };

  const readAsText = async (
    file: File | Blob,
    maxFileSize = context().limits.maxFileSize,
    signal?: AbortSignal,
  ): Promise<string> => {
    throwIfAborted(signal);
    assertWithinLimit(file.size, maxFileSize, "文本文件");
    const text = await file.text();
    throwIfAborted(signal);
    return text;
  };

  const readAsJSON = async <T = unknown>(
    file: File,
    options: JSONFileOptions = {},
  ): Promise<T> => {
    const text = await readAsText(
      file,
      options.maxFileSize ?? context().limits.maxFileSize,
      options.signal,
    );
    try {
      return JSON.parse(text, options.reviver) as T;
    } catch (cause) {
      throw new FileUtilsError(
        "INVALID_CONTENT",
        `文件内容不是合法的 JSON: ${file.name}`,
        { cause },
      );
    }
  };

  const readAsArrayBuffer = async (
    file: File | Blob,
    maxFileSize = context().limits.maxFileSize,
    signal?: AbortSignal,
  ): Promise<ArrayBuffer> => {
    throwIfAborted(signal);
    assertWithinLimit(file.size, maxFileSize, "二进制文件");
    const buffer = await file.arrayBuffer();
    throwIfAborted(signal);
    return buffer;
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

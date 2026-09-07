import axios from "axios";
import type { AxiosRequestConfig } from "axios";

export type RequestErrorKind =
  | "business"
  | "http"
  | "network"
  | "timeout"
  | "canceled"
  | "concurrency"
  | "configuration"
  | "unknown";

export interface RequestErrorOptions<T = unknown> {
  kind: RequestErrorKind;
  message: string;
  code?: string | number;
  status?: number;
  data?: T;
  requestId?: string;
  retryable?: boolean;
  config?: AxiosRequestConfig;
  cause?: unknown;
}

export class RequestError<T = unknown> extends Error {
  readonly name = "RequestError";
  readonly kind: RequestErrorKind;
  readonly code?: string | number;
  readonly status?: number;
  readonly data?: T;
  readonly requestId?: string;
  readonly retryable: boolean;
  readonly config?: AxiosRequestConfig;
  readonly cause?: unknown;

  constructor(options: RequestErrorOptions<T>) {
    super(options.message);
    this.kind = options.kind;
    this.code = options.code;
    this.status = options.status;
    this.data = options.data;
    this.requestId = options.requestId;
    this.retryable = options.retryable ?? false;
    this.config = options.config;
    this.cause = options.cause;
  }
}

export function isRequestError(error: unknown): error is RequestError {
  return error instanceof RequestError;
}

export function isCanceledError(error: unknown): boolean {
  return (
    (error instanceof RequestError && error.kind === "canceled") ||
    axios.isCancel(error) ||
    (error as { code?: string; name?: string })?.code === "ERR_CANCELED" ||
    (error as { name?: string })?.name === "AbortError"
  );
}

export function normalizeRequestError(error: unknown): RequestError {
  if (error instanceof RequestError) return error;
  if (isCanceledError(error)) {
    return new RequestError({
      kind: "canceled",
      message: "Request canceled.",
      code: "ERR_CANCELED",
      cause: error,
    });
  }
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const timeout = error.code === "ECONNABORTED" || error.code === "ETIMEDOUT";
    const kind: RequestErrorKind = timeout
      ? "timeout"
      : status
        ? "http"
        : "network";
    return new RequestError({
      kind,
      message: error.message || "Request failed.",
      code: error.code,
      status,
      data: error.response?.data,
      requestId:
        error.response?.headers?.["x-request-id"] ??
        error.response?.headers?.["x-correlation-id"],
      retryable: timeout || !status || status === 408 || status === 429 || status >= 500,
      config: error.config,
      cause: error,
    });
  }
  return new RequestError({
    kind: "unknown",
    message: error instanceof Error ? error.message : "Unknown request error.",
    cause: error,
  });
}

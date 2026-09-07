import type {
  AxiosRequestConfig,
  GenericAbortSignal,
} from "axios";
import type {
  CacheItem,
  CacheStore,
  MemoryCacheOptions,
  RequestKeyOptions,
} from "../types";

const binaryObjectIds = new WeakMap<object, number>();
let nextBinaryObjectId = 0;

function getBinaryObjectId(value: object): number {
  let id = binaryObjectIds.get(value);
  if (id === undefined) {
    id = ++nextBinaryObjectId;
    binaryObjectIds.set(value, id);
  }
  return id;
}

function sortedStringify(value: unknown, seen = new WeakSet<object>()): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "bigint") return `bigint:${value.toString()}`;
  if (typeof value !== "object") return `${typeof value}:${String(value)}`;

  if (seen.has(value)) {
    throw new Error("Cannot generate a stable request key from a circular value.");
  }
  seen.add(value);

  try {
    if (Array.isArray(value)) {
      return `[${value.map((item) => sortedStringify(item, seen)).join(",")}]`;
    }
    if (value instanceof Date) return `date:${value.toISOString()}`;
    if (value instanceof Map) {
      return `map:${sortedStringify(
        [...value.entries()].sort(([left], [right]) =>
          String(left).localeCompare(String(right)),
        ),
        seen,
      )}`;
    }
    if (value instanceof Set) {
      return `set:${sortedStringify(
        [...value.values()].sort((left, right) =>
          String(left).localeCompare(String(right)),
        ),
        seen,
      )}`;
    }
    if (typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams) {
      return `url-search:${JSON.stringify([...value.entries()].sort())}`;
    }
    if (typeof FormData !== "undefined" && value instanceof FormData) {
      const entries = [...value.entries()].map(([key, item]) => [
        key,
        typeof item === "string"
          ? `string:${item}`
          : `binary:${getBinaryObjectId(item)}:${item.name}:${item.size}:${item.type}`,
      ]);
      return `form-data:${JSON.stringify(entries)}`;
    }
    if (
      (typeof Blob !== "undefined" && value instanceof Blob) ||
      value instanceof ArrayBuffer ||
      ArrayBuffer.isView(value)
    ) {
      return `binary:${getBinaryObjectId(value)}`;
    }

    const candidate = value as Record<string, unknown> & {
      toJSON?: () => unknown;
      constructor?: { name?: string };
    };
    const jsonValue =
      typeof candidate.toJSON === "function" &&
      candidate.constructor?.name === "AxiosHeaders"
        ? candidate.toJSON()
        : candidate;
    if (!jsonValue || typeof jsonValue !== "object") {
      return sortedStringify(jsonValue, seen);
    }
    const source = jsonValue as Record<string, unknown>;
    return `{${Object.keys(source)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${sortedStringify(source[key], seen)}`)
      .join(",")}}`;
  } finally {
    seen.delete(value);
  }
}

function fingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function generateRequestKey(
  config: AxiosRequestConfig,
  options: RequestKeyOptions = {},
): string {
  const {
    method = "get",
    url = "",
    baseURL = "",
    params,
    data,
    headers,
    responseType = "json",
  } = config;
  const parts = [method.toUpperCase(), baseURL, url, responseType];
  if (params != null) parts.push(sortedStringify(params));
  if (data != null) parts.push(sortedStringify(data));

  if (headers) {
    const headerSource =
      typeof (headers as { toJSON?: () => unknown }).toJSON === "function"
        ? (headers as { toJSON: () => unknown }).toJSON()
        : headers;
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(
      headerSource as Record<string, unknown>,
    )) {
      normalized[key.toLowerCase()] = value;
    }
    const varyHeaders = new Set(
      ["authorization", "x-tenant-id", "x-user-id", ...options.varyHeaders ?? []].map(
        (key) => key.toLowerCase(),
      ),
    );
    const selected: Record<string, string> = {};
    for (const key of [...varyHeaders].sort()) {
      if (normalized[key] != null) {
        selected[key] = fingerprint(String(normalized[key]));
      }
    }
    if (Object.keys(selected).length > 0) parts.push(sortedStringify(selected));
  }

  return parts.join("|");
}

function defaultClone<T>(value: T): T {
  if (typeof structuredClone !== "function") return value;
  try {
    return structuredClone(value);
  } catch {
    return value;
  }
}

export class MemoryCache implements CacheStore {
  private readonly cache = new Map<string, CacheItem>();
  private readonly accessOrder = new Set<string>();
  private maxSize: number;
  private readonly cloneValue: <T>(value: T) => T;

  constructor(options: MemoryCacheOptions = {}) {
    this.maxSize = options.maxSize ?? 1000;
    this.assertMaxSize(this.maxSize);
    this.cloneValue =
      typeof options.clone === "function"
        ? options.clone
        : options.clone === false
          ? <T>(value: T) => value
          : defaultClone;
  }

  get<T = unknown>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() >= item.expireAt) {
      this.delete(key);
      return null;
    }
    this.accessOrder.delete(key);
    this.accessOrder.add(key);
    return this.cloneValue(item.data as T);
  }

  set<T = unknown>(
    key: string,
    data: T,
    ttl: number,
    options: { tags?: readonly string[] } = {},
  ): void {
    if (!Number.isFinite(ttl) || ttl < 0) {
      throw new RangeError("Cache TTL must be a finite number greater than or equal to 0.");
    }
    if (this.maxSize === 0) return;
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) this.evictOldest();
    this.cache.set(key, {
      data: this.cloneValue(data),
      expireAt: Date.now() + ttl,
      tags: options.tags ? [...options.tags] : undefined,
    });
    this.accessOrder.delete(key);
    this.accessOrder.add(key);
  }

  delete(key: string): boolean {
    this.accessOrder.delete(key);
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache) {
      if (now >= item.expireAt) this.delete(key);
    }
  }

  deleteByPrefix(prefix: string): number {
    let removed = 0;
    for (const key of [...this.cache.keys()]) {
      if (key.startsWith(prefix) && this.delete(key)) removed += 1;
    }
    return removed;
  }

  deleteByTag(tag: string): number {
    let removed = 0;
    for (const [key, item] of [...this.cache.entries()]) {
      if (item.tags?.includes(tag) && this.delete(key)) removed += 1;
    }
    return removed;
  }

  get size(): number {
    return this.cache.size;
  }

  setMaxSize(size: number): void {
    this.assertMaxSize(size);
    this.maxSize = size;
    while (this.cache.size > this.maxSize) this.evictOldest();
  }

  private assertMaxSize(size: number): void {
    if (!Number.isInteger(size) || size < 0) {
      throw new RangeError(
        "Cache capacity must be an integer greater than or equal to 0.",
      );
    }
  }

  private evictOldest(): void {
    const oldestKey = this.accessOrder.values().next().value as string | undefined;
    if (oldestKey !== undefined) this.delete(oldestKey);
  }
}

export function delay(ms: number, signal?: GenericAbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(createAbortError((signal as AbortSignal).reason));
  }
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener?.("abort", onAbort);
      reject(createAbortError((signal as AbortSignal | undefined)?.reason));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener?.("abort", onAbort);
      resolve();
    }, Math.max(0, Number.isFinite(ms) ? ms : 0));
    signal?.addEventListener?.("abort", onAbort, { once: true });
  });
}

function createAbortError(reason?: unknown): Error {
  if (reason instanceof Error) return reason;
  return Object.assign(new Error("canceled"), {
    name: "AbortError",
    code: "ERR_CANCELED",
    reason,
  });
}

export function isNetworkError(error: unknown): boolean {
  const candidate = error as {
    response?: unknown;
    code?: string;
    message?: string;
  };
  return (
    !candidate?.response &&
    Boolean(candidate?.code) &&
    candidate.code !== "ECONNABORTED" &&
    candidate.code !== "ERR_CANCELED" &&
    candidate.message !== "canceled" &&
    candidate.message !== "Request aborted" &&
    candidate.message !== "Request cancelled"
  );
}

export function isTimeoutError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  return code === "ECONNABORTED" || code === "ETIMEDOUT";
}

export function isRetryableStatus(
  status: number,
  retryableStatusCodes: number[],
): boolean {
  return retryableStatusCodes.includes(status);
}

export function normalizeConfig<T extends object>(
  config: boolean | T | undefined,
  defaults: T,
): T {
  if (config === true) return { ...defaults, enabled: true };
  if (config === false) return { ...defaults, enabled: false };
  if (config && typeof config === "object") {
    return {
      ...defaults,
      ...Object.fromEntries(
        Object.entries(config as Record<string, unknown>).filter(
          ([, value]) => value !== undefined,
        ),
      ),
    } as T;
  }
  return { ...defaults };
}

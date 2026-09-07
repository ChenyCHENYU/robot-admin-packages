import type { AxiosInstance } from "axios";
import type {
  CacheStore,
  EnhancedAbortController,
  RequestPolicyDefaults,
  RequestScope,
} from "./types";
import { MemoryCache } from "./utils/helpers";

export interface CancelableRequest {
  controller: EnhancedAbortController;
  scope?: RequestScope;
}

export interface ReLoginState {
  promise: Promise<void> | null;
  resolve: (() => void) | null;
  reject: ((reason?: unknown) => void) | null;
}

export interface RequestRuntime {
  cache: CacheStore;
  defaults: RequestPolicyDefaults;
  pendingRequests: Map<string, EnhancedAbortController>;
  cancelableRequests: Map<string, CancelableRequest>;
  joinedRequests: Map<string, Promise<unknown>>;
  requestId: number;
  dedupeCleanupTimer: ReturnType<typeof setInterval> | null;
  cancelCleanupTimer: ReturnType<typeof setInterval> | null;
  reLogin: ReLoginState;
  authRefreshPromise: Promise<string | null> | null;
  reauthenticatePromise: Promise<string | null> | null;
  disposed: boolean;
}

export interface CreateRequestRuntimeOptions {
  cache?: CacheStore;
  defaults?: RequestPolicyDefaults;
}

interface SharedPackageState {
  defaultInstance: AxiosInstance | null;
  lastInstance: AxiosInstance | null;
  globalConfig: {
    successCodes: Array<number | string>;
    fieldAliases: {
      data: string[];
      list: string[];
      total: string[];
    };
  };
}

const RUNTIME_KEY = Symbol.for("@robot-admin/request-core/runtime/v1");
const PACKAGE_STATE_KEY = Symbol.for("@robot-admin/request-core/state/v1");

const DEFAULT_GLOBAL_CONFIG: SharedPackageState["globalConfig"] = {
  successCodes: [200, 0, "200", "0"],
  fieldAliases: {
    data: ["data", "list", "items", "records"],
    list: ["list", "items", "records", "rows", "data"],
    total: ["total", "totalCount", "count", "totalElements"],
  },
};

function cloneGlobalConfig(
  config: SharedPackageState["globalConfig"],
): SharedPackageState["globalConfig"] {
  return {
    successCodes: [...config.successCodes],
    fieldAliases: {
      data: [...config.fieldAliases.data],
      list: [...config.fieldAliases.list],
      total: [...config.fieldAliases.total],
    },
  };
}

function getSharedState(): SharedPackageState {
  const target = globalThis as typeof globalThis & {
    [PACKAGE_STATE_KEY]?: SharedPackageState;
  };
  if (!target[PACKAGE_STATE_KEY]) {
    target[PACKAGE_STATE_KEY] = {
      defaultInstance: null,
      lastInstance: null,
      globalConfig: cloneGlobalConfig(DEFAULT_GLOBAL_CONFIG),
    };
  }
  return target[PACKAGE_STATE_KEY];
}

export function createRequestRuntime(
  options: CreateRequestRuntimeOptions = {},
): RequestRuntime {
  return {
    cache: options.cache ?? new MemoryCache(),
    defaults: { ...options.defaults },
    pendingRequests: new Map(),
    cancelableRequests: new Map(),
    joinedRequests: new Map(),
    requestId: 0,
    dedupeCleanupTimer: null,
    cancelCleanupTimer: null,
    reLogin: { promise: null, resolve: null, reject: null },
    authRefreshPromise: null,
    reauthenticatePromise: null,
    disposed: false,
  };
}

export function attachRequestRuntime(
  instance: AxiosInstance,
  runtime: RequestRuntime,
): void {
  Object.defineProperty(instance, RUNTIME_KEY, {
    configurable: false,
    enumerable: false,
    writable: false,
    value: runtime,
  });
  getSharedState().lastInstance = instance;
}

export function getRequestRuntime(instance: AxiosInstance): RequestRuntime {
  const runtime = (instance as AxiosInstance & { [RUNTIME_KEY]?: RequestRuntime })[
    RUNTIME_KEY
  ];
  if (!runtime) {
    throw new Error("The Axios instance is not managed by request-core.");
  }
  return runtime;
}

export function getActiveRequestRuntime(
  instance?: AxiosInstance,
): RequestRuntime {
  const shared = getSharedState();
  const target = instance ?? shared.defaultInstance ?? shared.lastInstance;
  if (!target) {
    throw new Error(
      "Request client not initialized. Create a client or call createRequestCore() first.",
    );
  }
  return getRequestRuntime(target);
}

export function setDefaultAxiosInstance(instance: AxiosInstance): void {
  getRequestRuntime(instance);
  getSharedState().defaultInstance = instance;
}

export function getDefaultAxiosInstance(): AxiosInstance | null {
  return getSharedState().defaultInstance;
}

export function getGlobalRuntimeConfig(): SharedPackageState["globalConfig"] {
  return cloneGlobalConfig(getSharedState().globalConfig);
}

export function setGlobalRuntimeConfig(config: {
  successCodes?: Array<number | string>;
  fieldAliases?: Partial<SharedPackageState["globalConfig"]["fieldAliases"]>;
}): void {
  const next = cloneGlobalConfig(DEFAULT_GLOBAL_CONFIG);
  if (config.successCodes) next.successCodes = [...config.successCodes];
  if (config.fieldAliases?.data) next.fieldAliases.data = [...config.fieldAliases.data];
  if (config.fieldAliases?.list) next.fieldAliases.list = [...config.fieldAliases.list];
  if (config.fieldAliases?.total) next.fieldAliases.total = [...config.fieldAliases.total];
  getSharedState().globalConfig = next;
}

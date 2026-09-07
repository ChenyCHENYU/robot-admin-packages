import type { App } from "vue";
import type {
  AxiosRequestConfig,
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { createAxiosInstance } from "./axios/request";
import { setGlobalAxiosInstance } from "./axios/service";
import {
  getGlobalRuntimeConfig,
  setGlobalRuntimeConfig,
} from "./axios/runtime";
import type { CacheStore, RequestPolicyDefaults } from "./axios/types";

export interface InterceptorConfig {
  request?: (
    config: InternalAxiosRequestConfig,
  ) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;
  requestError?: (error: AxiosError) => unknown;
  response?: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>;
  responseError?: (error: AxiosError) => unknown;
}

export interface FieldAliases {
  data?: string[];
  list?: string[];
  total?: string[];
}

export interface RequestCoreConfig {
  request?: AxiosRequestConfig;
  interceptors?: InterceptorConfig;
  successCodes?: Array<number | string>;
  fieldAliases?: FieldAliases;
  defaults?: RequestPolicyDefaults;
  cacheStore?: CacheStore;
}

/** Returns a defensive copy of the legacy default response configuration. */
export function getGlobalConfig() {
  return getGlobalRuntimeConfig();
}

/**
 * Creates the 0.2-compatible Vue plugin and selects its Axios instance for
 * global getData/postData helpers.
 *
 * @deprecated Prefer createRequestClient() plus createRequestPlugin().
 */
export function createRequestCore(config: RequestCoreConfig = {}) {
  const {
    request = {},
    interceptors = {},
    successCodes,
    fieldAliases,
    defaults,
    cacheStore,
  } = config;

  setGlobalRuntimeConfig({ successCodes, fieldAliases });
  const axiosInstance = createAxiosInstance(request, {
    cache: cacheStore,
    defaults,
  });
  setGlobalAxiosInstance(axiosInstance);

  if (interceptors.request || interceptors.requestError) {
    axiosInstance.interceptors.request.use(
      interceptors.request ?? ((requestConfig) => requestConfig),
      interceptors.requestError,
    );
  }
  if (interceptors.response || interceptors.responseError) {
    axiosInstance.interceptors.response.use(
      interceptors.response ?? ((response) => response),
      interceptors.responseError,
    );
  }

  return {
    install(app: App): void {
      app.config.globalProperties.$axios = axiosInstance;
    },
    axiosInstance,
  };
}

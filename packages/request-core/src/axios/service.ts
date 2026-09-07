import type { AxiosInstance } from "axios";
import type { EnhancedAxiosRequestConfig } from "./types";
import {
  getDefaultAxiosInstance,
  setDefaultAxiosInstance,
} from "./runtime";

export function setGlobalAxiosInstance(instance: AxiosInstance): void {
  setDefaultAxiosInstance(instance);
}

export function getGlobalAxiosInstance(): AxiosInstance {
  const instance = getDefaultAxiosInstance();
  if (!instance) {
    throw new Error(
      "Axios instance not initialized. Please call createRequestCore() or setGlobalAxiosInstance() first.",
    );
  }
  return instance;
}

const service = new Proxy({} as AxiosInstance, {
  get(_target, prop) {
    return getGlobalAxiosInstance()[prop as keyof AxiosInstance];
  },
});

export default service;

export async function getData<T = unknown>(
  url: string,
  config?: EnhancedAxiosRequestConfig,
): Promise<T> {
  const response = await getGlobalAxiosInstance().get(url, config);
  return response.data;
}

export async function postData<T = unknown, D = unknown>(
  url: string,
  data?: D,
  config?: EnhancedAxiosRequestConfig<D>,
): Promise<T> {
  const response = await getGlobalAxiosInstance().post(url, data, config);
  return response.data;
}

export async function putData<T = unknown, D = unknown>(
  url: string,
  data?: D,
  config?: EnhancedAxiosRequestConfig<D>,
): Promise<T> {
  const response = await getGlobalAxiosInstance().put(url, data, config);
  return response.data;
}

export async function patchData<T = unknown, D = unknown>(
  url: string,
  data?: D,
  config?: EnhancedAxiosRequestConfig<D>,
): Promise<T> {
  const response = await getGlobalAxiosInstance().patch(url, data, config);
  return response.data;
}

export async function deleteData<T = unknown>(
  url: string,
  config?: EnhancedAxiosRequestConfig,
): Promise<T> {
  const response = await getGlobalAxiosInstance().delete(url, config);
  return response.data;
}

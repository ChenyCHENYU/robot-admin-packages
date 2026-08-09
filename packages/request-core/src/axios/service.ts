import type { AxiosInstance } from "axios";
import type { EnhancedAxiosRequestConfig } from "./types";

let globalService: AxiosInstance | null = null;

export function setGlobalAxiosInstance(instance: AxiosInstance): void {
  globalService = instance;
}

export function getGlobalAxiosInstance(): AxiosInstance {
  if (!globalService) {
    throw new Error(
      "Axios instance not initialized. Please call createRequestCore() or setGlobalAxiosInstance() first.",
    );
  }
  return globalService;
}

const service = new Proxy({} as AxiosInstance, {
  get(_target, prop) {
    return getGlobalAxiosInstance()[prop as keyof AxiosInstance];
  },
});

export default service;

export async function getData<T = any>(
  url: string,
  config?: EnhancedAxiosRequestConfig,
): Promise<T> {
  const response = await getGlobalAxiosInstance().get(url, config);
  return response.data;
}

export async function postData<T = any>(
  url: string,
  data?: any,
  config?: EnhancedAxiosRequestConfig,
): Promise<T> {
  const response = await getGlobalAxiosInstance().post(url, data, config);
  return response.data;
}

export async function putData<T = any>(
  url: string,
  data?: any,
  config?: EnhancedAxiosRequestConfig,
): Promise<T> {
  const response = await getGlobalAxiosInstance().put(url, data, config);
  return response.data;
}

export async function deleteData<T = any>(
  url: string,
  config?: EnhancedAxiosRequestConfig,
): Promise<T> {
  const response = await getGlobalAxiosInstance().delete(url, config);
  return response.data;
}

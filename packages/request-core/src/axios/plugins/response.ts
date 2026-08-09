/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-07 10:00:00
 * @LastEditors: ChenYu ycyplus@gmail.com
 * @LastEditTime: 2026-02-07 10:00:00
 * @FilePath: \robot-admin-request-core\src\axios\plugins\response.ts
 * @Description: 响应处理插件（预留，用户通过 interceptors 配置）
 * Copyright (c) 2026 by CHENY, All Rights Reserved ���.
 */

import type { AxiosInstance, AxiosResponse } from "axios";
import type { EnhancedAxiosRequestConfig } from "../types";
import { cleanupAbortContext } from "../utils/abort";

/**
 * 设置响应插件（预留，具体逻辑由用户通过 interceptors 配置）
 */
export function setupResponsePlugin(instance: AxiosInstance): void {
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      cleanupAbortContext(response.config as EnhancedAxiosRequestConfig);
      return response;
    },
    (error: any) => {
      cleanupAbortContext(error?.config as EnhancedAxiosRequestConfig);
      return Promise.reject(error);
    },
  );
}

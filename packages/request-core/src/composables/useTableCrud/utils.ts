/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-07 10:00:00
 * @LastEditors: ChenYu ycyplus@gmail.com
 * @LastEditTime: 2026-02-07 10:00:00
 * @FilePath: \robot-admin-request-core\src\composables\useTableCrud\utils.ts
 * @Description: useTableCrud 工具函数
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import type { DataRecord } from "./types";
import {
  DATA_FIELD_ALIASES,
  LIST_FIELD_ALIASES,
  TOTAL_FIELD_ALIASES,
  SUCCESS_CODES,
} from "./constants";
import { getGlobalConfig } from "../../core";

/**
 * 获取运行时字段别名（优先使用全局配置）
 */
function getRuntimeFieldAliases() {
  const config = getGlobalConfig();
  return {
    data: config.fieldAliases.data || DATA_FIELD_ALIASES,
    list: config.fieldAliases.list || LIST_FIELD_ALIASES,
    total: config.fieldAliases.total || TOTAL_FIELD_ALIASES,
  };
}

/**
 * 获取运行时成功状态码（优先使用全局配置）
 */
function getRuntimeSuccessCodes() {
  const config = getGlobalConfig();
  return config.successCodes || SUCCESS_CODES;
}

/**
 * 字段查找器（支持多种字段别名）
 */
export const FieldFinder = {
  /**
   * 查找第一个存在的字段值
   */
  findFirst<T>(
    obj: object | null | undefined,
    aliases: readonly string[],
    defaultValue: T,
  ): T {
    if (!obj || typeof obj !== "object") return defaultValue;

    const record = obj as Record<string, unknown>;
    for (const key of aliases) {
      if (key in record && record[key] !== undefined) {
        return record[key] as T;
      }
    }
    return defaultValue;
  },

  /**
   * 查找第一个存在的数字字段
   */
  findNumber(
    obj: object | null | undefined,
    aliases: readonly string[],
    defaultValue = 0,
  ): number {
    const value = this.findFirst(obj, aliases, defaultValue);
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : defaultValue;
  },
};

/**
 * 响应标准化工具
 */
export const ResponseNormalizer = {
  /**
   * 判断响应是否成功
   */
  isSuccess(res: unknown): boolean {
    if (!res || typeof res !== "object") return false;
    const record = res as Record<string, unknown>;
    if (typeof record.success === "boolean") return record.success;
    if (!("code" in record)) return true;
    // 使用运行时配置的成功状态码
    const successCodes = getRuntimeSuccessCodes();
    return (
      successCodes.includes(record.code as number | string) ||
      successCodes.some((code) => String(code) === String(record.code))
    );
  },

  /**
   * 标准化响应数据（提取 data 层）
   */
  normalize<T = unknown>(
    res: unknown,
  ): { data: T; success: boolean; raw: unknown } {
    if (!res || typeof res !== "object") {
      return { data: res as T, success: true, raw: res };
    }

    const aliases = getRuntimeFieldAliases();
    const record = res as Record<string, unknown>;
    const hasDataLayer = aliases.data.some((key) => key in record);
    if (!hasDataLayer) {
      return { data: res as T, success: ResponseNormalizer.isSuccess(res), raw: res };
    }
    return {
      data: FieldFinder.findFirst(record, aliases.data, res) as T,
      success: ResponseNormalizer.isSuccess(res),
      raw: res,
    };
  },
};

/**
 * URL 工具
 */
export const UrlUtils = {
  /**
   * 构建 URL（处理路径参数）
   */
  buildUrl(endpoint: string, id?: unknown): string {
    if (id !== undefined && endpoint.includes(":id")) {
      return endpoint.replace(":id", encodeURIComponent(String(id)));
    }
    return endpoint;
  },
};

/**
 * 数据提取工具（增强版，支持多种响应格式）
 */
export const DataExtractor = {
  /**
   * 从响应中提取列表数据（支持多种格式）
   *
   * 支持的响应结构：
   * 1. { code: 0, data: { list: [...], total: 10 } }  // 嵌套结构（最常见）
   * 2. { data: { items: [...], total: 10 } }           // 嵌套结构
   * 3. { list: [...], total: 10 }                      // 扁平结构
   * 4. { items: [...], totalCount: 10 }                // 不同字段名
   * 5. { data: [...] }                                  // 直接数组
   * 6. [...]                                            // 纯数组
   */
  extractList<T = unknown>(response: unknown): { items: T[]; total: number } {
    // 第一步：标准化响应，提取 data 层
    const normalized = ResponseNormalizer.normalize(response);
    const dataLayer = normalized.data;
    const aliases = getRuntimeFieldAliases();

    if (Array.isArray(dataLayer)) {
      const rootTotal = FieldFinder.findNumber(
        response && typeof response === "object" ? response : null,
        aliases.total,
        dataLayer.length,
      );
      return { items: dataLayer as T[], total: rootTotal };
    }

    if (!dataLayer || typeof dataLayer !== "object") {
      return { items: [], total: 0 };
    }

    // 第二步：从 data 层提取列表数组（使用运行时配置）
    const list = FieldFinder.findFirst<unknown[]>(dataLayer, aliases.list, []);

    // 第三步：提取总数（使用运行时配置）
    const rootTotal = FieldFinder.findNumber(
      response && typeof response === "object" ? response : null,
      aliases.total,
      Array.isArray(list) ? list.length : 0,
    );
    const total = FieldFinder.findNumber(dataLayer, aliases.total, rootTotal);

    return {
      items: Array.isArray(list) ? (list as T[]) : [],
      total,
    };
  },

  /**
   * 从响应中提取详情数据
   */
  extractDetail<T = unknown>(response: unknown): T | null {
    // 标准化响应
    const normalized = ResponseNormalizer.normalize(response);
    return normalized.data as T | null;
  },
};

/**
 * 行操作工具
 */
export const RowUtils = {
  /**
   * 从数组中查找行索引
   */
  findIndex<T extends DataRecord>(items: T[], idKey: keyof T, id: unknown): number {
    return items.findIndex((item) => item[idKey] === id);
  },

  /**
   * 从数组中移除行
   */
  remove<T extends DataRecord>(items: T[], idKey: keyof T, id: unknown): boolean {
    const index = this.findIndex(items, idKey, id);
    if (index !== -1) {
      items.splice(index, 1);
      return true;
    }
    return false;
  },

  /**
   * 生成默认 ID
   */
  generateId(): number {
    return Date.now() + Math.floor(Math.random() * 1000);
  },
};

/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-07 10:00:00
 * @LastEditors: ChenYu ycyplus@gmail.com
 * @LastEditTime: 2026-02-07 10:00:00
 * @FilePath: \robot-admin-request-core\src\composables\useTableCrud\index.ts
 * @Description: useTableCrud 统一导出
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

// ==================== 主函数 ====================
export { createTableCrud } from "./createTableCrud";
export { useTableCrud } from "./useTableCrud";

// ==================== 类型 ====================
export type {
  // 基础类型
  DataRecord,
  ApiEndpoints,
  // 自定义操作
  CustomAction,
  ActionContext,
  // 详情配置
  DetailItem,
  DetailSection,
  DetailConfig,
  DetailModal,
  // 主配置
  UseTableCrudConfig,
  UseTableCrudReturn,
  TableCrudDefaults,
  TableCrudFactory,
  TableListParamKeys,
  TableListParams,
} from "./types";

// ==================== 常量 ====================
export {
  DEFAULT_CONFIG,
  DEFAULT_MESSAGES,
  DATA_FIELD_ALIASES,
  LIST_FIELD_ALIASES,
  TOTAL_FIELD_ALIASES,
  SUCCESS_CODES,
} from "./constants";

// ==================== 工具函数 ====================
export {
  UrlUtils,
  DataExtractor,
  RowUtils,
  FieldFinder,
  ResponseNormalizer,
} from "./utils";

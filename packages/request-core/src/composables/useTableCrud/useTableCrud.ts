/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-07 10:00:00
 * @LastEditors: ChenYu ycyplus@gmail.com
 * @LastEditTime: 2026-02-07 10:00:00
 * @FilePath: \robot-admin-request-core\src\composables\useTableCrud\useTableCrud.ts
 * @Description: useTableCrud 核心逻辑 - CRUD + 分页 + 表单管理
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import { ref, reactive, computed, shallowRef } from "vue";
import { useMessage, useDialog } from "naive-ui";
import { getData, postData, putData, deleteData } from "../../axios/service";
import type {
  DataRecord,
  UseTableCrudConfig,
  UseTableCrudReturn,
  ActionContext,
  DetailModal,
} from "./types";
import { DEFAULT_CONFIG, DEFAULT_MESSAGES } from "./constants";
import { UrlUtils, DataExtractor, RowUtils } from "./utils";

/**
 * 表格 CRUD 组合式 API
 *
 * @description
 * 配置驱动的表格 CRUD 解决方案，极简使用，功能完整
 * 完全替代 usePageCrud，专注于表格场景
 *
 * @template T 数据行类型
 * @param config 配置对象
 * @returns 表格 CRUD 实例
 *
 * @example
 * ```ts
 * const table = useTableCrud<Employee>({
 *   api: {
 *     list: '/employees/list',
 *     get: '/employees/:id',
 *     update: '/employees/:id',
 *     remove: '/employees/:id',
 *     create: '/employees'
 *   },
 *   columns: [...],
 *   customActions: [
 *     {
 *       key: 'copy',
 *       label: '复制',
 *       icon: 'mdi:content-copy',
 *       handler: (row, ctx) => {
 *         const newRow = { ...row, id: Date.now() }
 *         ctx.data.unshift(newRow)
 *         ctx.message.success('复制成功')
 *       }
 *     }
 *   ]
 * })
 *
 * // 组件中使用
 * <c-table
 *   v-model:data="table.data.value"
 *   :columns="table.columns.value"
 *   :actions="table.actions.value"
 *   @save="table.save"
 * />
 * ```
 */
export function useTableCrud<T extends DataRecord>(
  config: UseTableCrudConfig<T>,
): UseTableCrudReturn<T> {
  // ==================== 配置解析 ====================
  const {
    api,
    columns,
    customActions = [],
    detail: detailConfig,
    idKey = DEFAULT_CONFIG.idKey as keyof T,
    defaultPageSize = DEFAULT_CONFIG.pageSize,
    defaultPaginationEnabled = DEFAULT_CONFIG.paginationEnabled,
    autoLoad = true,
    extractListData,
  } = config;

  // ==================== 全局实例 ====================
  const message = useMessage();
  const dialog = useDialog();

  // ==================== 响应式状态 ====================
  const data = shallowRef<T[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const tableRef = ref();
  const paginationEnabled = ref(defaultPaginationEnabled);

  // 分页状态
  const page: { current: number; size: number } = reactive({
    current: DEFAULT_CONFIG.currentPage,
    size: defaultPageSize,
  });

  // ==================== 详情弹窗 ====================
  const detailVisible = ref(false);
  const detailData = ref<T | null>(null);
  const detailTitle = ref("");

  const detail: DetailModal<T> = {
    visible: detailVisible,
    data: detailData as any,
    title: detailTitle,
    show: (row: T) => {
      detailData.value = row;
      detailTitle.value = `详情 - ${(row as any).name || row[idKey]}`;
      detailVisible.value = true;
    },
    close: () => {
      detailVisible.value = false;
      detailData.value = null;
      detailTitle.value = "";
    },
  };

  // ==================== 核心方法 ====================

  /**
   * 刷新数据
   */
  const refresh = async (): Promise<void> => {
    if (!api.list) return;

    loading.value = true;
    try {
      const queryParams = paginationEnabled.value
        ? { page: page.current, pageSize: page.size }
        : {};

      const response = await getData(api.list, { params: queryParams });

      const extracted = extractListData
        ? extractListData(response)
        : DataExtractor.extractList<T>(response);

      data.value = extracted.items;
      total.value = extracted.total;
    } catch (error) {
      console.error("[useTableCrud] 数据加载失败:", error);
      message.error(DEFAULT_MESSAGES.loadError);
    } finally {
      loading.value = false;
    }
  };

  /**
   * 获取详情
   */
  const getDetail = async (row: T): Promise<T | null> => {
    if (!api.get) {
      // 如果没有详情接口，直接显示当前数据
      detail.show(row);
      return row;
    }

    loading.value = true;
    try {
      const url = UrlUtils.buildUrl(api.get, row[idKey] as any);
      const response = await getData(url, {});
      const detailData = DataExtractor.extractDetail<T>(response);

      if (detailData) {
        detail.show(detailData);
        return detailData;
      }

      return null;
    } catch (error) {
      console.error("[useTableCrud] 详情获取失败:", error);
      message.error(DEFAULT_MESSAGES.detailError);
      return null;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 新增数据
   */
  const create = async (row: T): Promise<void> => {
    if (!api.create) {
      message.warning("未配置新增接口");
      return;
    }

    loading.value = true;
    try {
      await postData(api.create, row);
      message.success(DEFAULT_MESSAGES.createSuccess);
      await refresh();
    } catch (error) {
      console.error("[useTableCrud] 新增失败:", error);
      message.error("新增失败");
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 更新数据
   */
  const save = async (row: T): Promise<void> => {
    if (!api.update) {
      message.warning("未配置更新接口");
      return;
    }

    loading.value = true;
    try {
      const url = UrlUtils.buildUrl(api.update, row[idKey] as any);
      await putData(url, row);
      message.success(DEFAULT_MESSAGES.updateSuccess);
      await refresh();
    } catch (error) {
      console.error("[useTableCrud] 更新失败:", error);
      message.error(DEFAULT_MESSAGES.saveError);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 删除数据
   */
  const remove = async (row: T): Promise<void> => {
    if (!api.remove) {
      message.warning(DEFAULT_MESSAGES.noDeleteApi);
      return;
    }

    loading.value = true;
    try {
      const url = UrlUtils.buildUrl(api.remove, row[idKey] as any);
      await deleteData(url);
      message.success(DEFAULT_MESSAGES.deleteSuccess);

      // 从本地数据中移除
      RowUtils.remove(data.value, idKey, row[idKey]);

      await refresh();
    } catch (error) {
      console.error("[useTableCrud] 删除失败:", error);
      message.error(DEFAULT_MESSAGES.deleteError);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 批量删除数据
   */
  const batchRemove = async (rows: T[]): Promise<void> => {
    if (!rows || rows.length === 0) {
      message.warning("请选择要删除的数据");
      return;
    }

    if (!api.remove && !api.batchRemove) {
      message.warning(DEFAULT_MESSAGES.noDeleteApi);
      return;
    }

    loading.value = true;
    try {
      if (api.batchRemove) {
        // 使用批量删除接口
        const ids = rows.map((row) => row[idKey]);
        await postData(api.batchRemove, { ids });
      } else {
        // 使用单个删除接口循环删除
        await Promise.all(
          rows.map((row) => {
            const url = UrlUtils.buildUrl(api.remove!, row[idKey] as any);
            return deleteData(url);
          }),
        );
      }

      message.success(`成功删除 ${rows.length} 条数据`);
      await refresh();
    } catch (error) {
      console.error("[useTableCrud] 批量删除失败:", error);
      message.error("批量删除失败");
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // ==================== 事件处理 ====================

  /**
   * 处理取消编辑
   */
  const handleCancel = async (): Promise<void> => {
    // 取消编辑，刷新数据恢复原始状态
    await refresh();
  };

  /**
   * 处理分页变化
   */
  const handlePaginationChange = (pageNum: number, pageSize: number): void => {
    page.current = pageNum;
    page.size = pageSize;
    refresh();
  };

  /**
   * 处理行删除（UI层）
   */
  const handleRowDelete = (deletedRow: T): void => {
    RowUtils.remove(data.value, idKey, deletedRow[idKey]);
  };

  // ==================== 计算属性 ====================

  /**
   * 分页配置
   */
  const pagination = computed(() => {
    if (!paginationEnabled.value) return false;
    return {
      enabled: true,
      page: page.current,
      pageSize: page.size,
    };
  });

  /**
   * 操作上下文（用于自定义操作）
   */
  const createActionContext = (index: number): ActionContext<T> => ({
    data: data.value,
    index,
    page,
    paginationEnabled: paginationEnabled.value,
    message,
    dialog,
    refresh,
  });

  /**
   * 表格操作配置
   */
  const actions = computed(() => {
    const result: any = {};

    // 编辑操作
    if (api.update) {
      result.edit = async (row: T) => {
        try {
          await save(row);
          return { data: row, error: null };
        } catch (error) {
          return { data: null, error };
        }
      };
    }

    // 删除操作
    if (api.remove) {
      result.delete = async (row: T) => {
        try {
          await remove(row);
          return { data: { success: true }, error: null };
        } catch (error) {
          return { data: null, error };
        }
      };
    }

    // 详情操作
    if (api.get) {
      result.detail = async (row: T) => {
        try {
          const detailData = await getDetail(row);
          return { data: detailData, error: null };
        } catch (error) {
          return { data: null, error };
        }
      };
    }

    // 自定义操作
    if (customActions.length > 0) {
      result.custom = customActions.map((action) => ({
        key: action.key,
        label: action.label,
        icon: action.icon,
        type: action.type || "default",
        onClick: (row: T, index: number) => {
          const context = createActionContext(index);
          return action.handler(row, context);
        },
      }));
    }

    return result;
  });

  // ==================== 返回 ====================

  // 自动加载数据
  if (autoLoad) {
    refresh();
  }

  return {
    // 数据状态
    data,
    loading,
    total,

    // 表格配置
    columns: computed(() => columns),
    actions,
    tableRef,

    // 分页
    page,
    paginationEnabled,
    pagination,

    // 核心方法
    refresh,
    create,
    save,
    remove,
    batchRemove,
    getDetail,

    // 事件处理
    handleCancel,
    handlePaginationChange,
    handleRowDelete,

    // 详情弹窗
    detail,
    detailConfig,
  };
}

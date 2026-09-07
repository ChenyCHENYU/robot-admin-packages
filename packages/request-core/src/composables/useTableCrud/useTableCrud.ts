import {
  computed,
  getCurrentInstance,
  getCurrentScope,
  onMounted,
  onScopeDispose,
  reactive,
  ref,
  shallowRef,
  type Ref,
} from "vue";
import {
  deleteData,
  getData,
  postData,
  putData,
} from "../../axios/service";
import {
  isCanceledError,
  normalizeRequestError,
  RequestError,
} from "../../client/errors";
import { useRequestClient } from "../../vue/context";
import { DEFAULT_CONFIG, DEFAULT_MESSAGES } from "./constants";
import type {
  ActionContext,
  CrudDialogApi,
  CrudMessageApi,
  DataRecord,
  TableActions,
  TablePageState,
  TableQueryResult,
  UseTableCrudConfig,
  UseTableCrudReturn,
} from "./types";
import { DataExtractor, RowUtils, UrlUtils } from "./utils";

type Operation = "refresh" | "detail" | "create" | "update" | "remove";

const noopMessage: CrudMessageApi = {
  success: () => undefined,
  error: () => undefined,
  warning: () => undefined,
  info: () => undefined,
};

const noopDialog: CrudDialogApi = {
  warning: () => undefined,
  error: () => undefined,
  success: () => undefined,
  info: () => undefined,
};

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {
      // Shallow fallback supports reactive proxies and class-backed filters.
    }
  }
  return Array.isArray(value)
    ? ([...value] as T)
    : value && typeof value === "object"
      ? ({ ...value } as T)
      : value;
}

function recordValue<T extends object>(row: T, key: keyof T): unknown {
  return row[key];
}

function asQueryResult<T>(value: unknown): TableQueryResult<T> | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<TableQueryResult<T>>;
  return Array.isArray(candidate.items) && Number.isFinite(candidate.total)
    ? { items: candidate.items, total: Number(candidate.total) }
    : null;
}

export function useTableCrud<
  T extends DataRecord,
  Filters extends object = Record<string, unknown>,
  Sort extends object = Record<string, unknown>,
>(
  config: UseTableCrudConfig<T, Filters, Sort>,
): UseTableCrudReturn<T, Filters, Sort> {
  const {
    api,
    query,
    mutations = {},
    columns = [],
    customActions = [],
    detail: detailConfig,
    idKey = DEFAULT_CONFIG.idKey as keyof T,
    defaultPageSize = DEFAULT_CONFIG.pageSize,
    defaultPaginationEnabled = DEFAULT_CONFIG.paginationEnabled,
    initialFilters = {} as Filters,
    initialSort = null,
    createNewRow,
    autoLoad = true,
    extractListData,
    refreshAfterMutation = true,
    batchConcurrency = 4,
    detailTitle,
  } = config;

  if (!query && !api?.list) {
    throw new Error("useTableCrud requires either query or api.list.");
  }
  if (!Number.isInteger(batchConcurrency) || batchConcurrency < 1) {
    throw new RangeError("batchConcurrency must be an integer greater than 0.");
  }

  const injectedClient = getCurrentInstance() ? useRequestClient(true) : undefined;
  const client = config.client ?? injectedClient;
  const message = config.ui?.message ?? noopMessage;
  const dialog: CrudDialogApi = config.ui?.dialog ?? noopDialog;
  const notify = (
    type: "success" | "error" | "warning",
    text: string,
  ): void => {
    try {
      void Promise.resolve(message[type](text)).catch(() => undefined);
    } catch {
      // Presentation adapters must not alter request outcomes.
    }
  };

  const data = shallowRef<T[]>([]);
  const total = ref(0);
  const tableRef = ref<unknown>();
  const paginationEnabled = ref(defaultPaginationEnabled);
  const filters = ref(cloneValue(initialFilters)) as Ref<Filters>;
  const sort = ref(cloneValue(initialSort)) as Ref<Sort | null>;
  const error = shallowRef<RequestError | null>(null);
  const lastUpdated = ref<number | null>(null);
  const page: TablePageState = reactive({
    current: DEFAULT_CONFIG.currentPage,
    size: defaultPageSize,
  });
  const counts = reactive<Record<Operation, number>>({
    refresh: 0,
    detail: 0,
    create: 0,
    update: 0,
    remove: 0,
  });
  const controllers = new Set<AbortController>();
  let refreshController: AbortController | null = null;
  let refreshSequence = 0;
  let disposed = false;

  const loading = computed(() => Object.values(counts).some((count) => count > 0));
  const isInitialLoading = computed(
    () => counts.refresh > 0 && lastUpdated.value === null,
  );
  const isRefreshing = computed(
    () => counts.refresh > 0 && lastUpdated.value !== null,
  );
  const creating = computed(() => counts.create > 0);
  const updating = computed(() => counts.update > 0);
  const removing = computed(() => counts.remove > 0);

  const startOperation = (operation: Operation): AbortController => {
    counts[operation] += 1;
    const controller = new AbortController();
    controllers.add(controller);
    return controller;
  };

  const finishOperation = (
    operation: Operation,
    controller: AbortController,
  ): void => {
    counts[operation] = Math.max(0, counts[operation] - 1);
    controllers.delete(controller);
  };

  const reportError = async (
    cause: unknown,
    operation: Operation,
    fallbackMessage: string,
  ): Promise<RequestError> => {
    const normalized = normalizeRequestError(cause);
    if (!isCanceledError(normalized)) {
      error.value = normalized;
      notify("error", fallbackMessage);
      try {
        await config.onError?.(normalized, operation);
      } catch {
        // Error observers must not replace the request failure.
      }
    }
    return normalized;
  };

  const detailVisible = ref(false);
  const detailData = ref<T | null>(null) as Ref<T | null>;
  const detailTitleState = ref("");
  const detail = {
    visible: detailVisible,
    data: detailData,
    title: detailTitleState,
    show: (row: T): void => {
      detailData.value = row;
      detailTitleState.value =
        detailTitle?.(row) ??
        `详情 - ${String(
          (row as Record<string, unknown>).name ?? recordValue(row, idKey) ?? "",
        )}`;
      detailVisible.value = true;
    },
    close: (): void => {
      detailVisible.value = false;
      detailData.value = null;
      detailTitleState.value = "";
    },
  };

  const requestList = async (signal: AbortSignal): Promise<unknown> => {
    if (query) {
      return query({
        page: page.current,
        pageSize: page.size,
        paginationEnabled: paginationEnabled.value,
        filters: filters.value,
        sort: sort.value,
        signal,
      });
    }
    const paginationParams = paginationEnabled.value
      ? { page: page.current, pageSize: page.size }
      : {};
    const params = {
      ...paginationParams,
      ...(filters.value as Record<string, unknown>),
      ...(sort.value ? { sort: sort.value } : {}),
    };
    return client
      ? client.get(api!.list, { params, signal, concurrency: "takeLatest" })
      : getData(api!.list, { params, signal, dedupe: true });
  };

  const refresh = async (): Promise<void> => {
    if (disposed) return;
    refreshController?.abort();
    const sequence = ++refreshSequence;
    const controller = startOperation("refresh");
    refreshController = controller;
    error.value = null;
    try {
      const response = await requestList(controller.signal);
      if (sequence !== refreshSequence || controller.signal.aborted) return;
      const extracted =
        extractListData?.(response) ??
        asQueryResult<T>(response) ??
        DataExtractor.extractList<T>(response);
      data.value = [...extracted.items];
      total.value = extracted.total;
      lastUpdated.value = Date.now();
    } catch (cause) {
      if (!controller.signal.aborted) {
        await reportError(cause, "refresh", DEFAULT_MESSAGES.loadError);
      }
    } finally {
      if (refreshController === controller) refreshController = null;
      finishOperation("refresh", controller);
    }
  };

  const maybeRefresh = async (): Promise<void> => {
    if (refreshAfterMutation) await refresh();
  };

  const getDetail = async (row: T): Promise<T | null> => {
    if (!mutations.get && !api?.get) {
      detail.show(row);
      return row;
    }
    const controller = startOperation("detail");
    try {
      let result: T | null;
      if (mutations.get) {
        result = await mutations.get(row, { signal: controller.signal });
      } else {
        const url = UrlUtils.buildUrl(api!.get!, recordValue(row, idKey));
        const response = client
          ? await client.get(url, { signal: controller.signal })
          : await getData(url, { signal: controller.signal });
        result = DataExtractor.extractDetail<T>(response);
      }
      if (result) detail.show(result);
      return result;
    } catch (cause) {
      if (!controller.signal.aborted) {
        await reportError(cause, "detail", DEFAULT_MESSAGES.detailError);
      }
      return null;
    } finally {
      finishOperation("detail", controller);
    }
  };

  const create = async (row: T): Promise<void> => {
    if (!mutations.create && !api?.create) {
      notify("warning", "未配置新增操作");
      return;
    }
    const controller = startOperation("create");
    try {
      if (mutations.create) {
        await mutations.create(row, { signal: controller.signal });
      } else if (client) {
        await client.post(api!.create!, row, { signal: controller.signal });
      } else {
        await postData(api!.create!, row, { signal: controller.signal });
      }
      notify("success", DEFAULT_MESSAGES.createSuccess);
      await maybeRefresh();
    } catch (cause) {
      throw await reportError(cause, "create", "新增失败");
    } finally {
      finishOperation("create", controller);
    }
  };

  const save = async (row: T): Promise<void> => {
    if (!mutations.update && !api?.update) {
      notify("warning", "未配置更新操作");
      return;
    }
    const controller = startOperation("update");
    try {
      if (mutations.update) {
        await mutations.update(row, { signal: controller.signal });
      } else {
        const url = UrlUtils.buildUrl(api!.update!, recordValue(row, idKey));
        if (client) await client.put(url, row, { signal: controller.signal });
        else await putData(url, row, { signal: controller.signal });
      }
      notify("success", DEFAULT_MESSAGES.updateSuccess);
      await maybeRefresh();
    } catch (cause) {
      throw await reportError(cause, "update", DEFAULT_MESSAGES.saveError);
    } finally {
      finishOperation("update", controller);
    }
  };

  const removeOne = async (row: T, signal: AbortSignal): Promise<void> => {
    if (mutations.remove) {
      await mutations.remove(row, { signal });
      return;
    }
    if (!api?.remove) throw new Error("Delete operation is not configured.");
    const url = UrlUtils.buildUrl(api.remove, recordValue(row, idKey));
    if (client) await client.delete(url, { signal });
    else await deleteData(url, { signal });
  };

  const removeRowsLocally = (rows: readonly T[]): void => {
    let removed = 0;
    for (const row of rows) {
      if (RowUtils.remove(data.value, idKey, recordValue(row, idKey))) {
        removed += 1;
      }
    }
    if (removed > 0) {
      data.value = [...data.value];
      total.value = Math.max(0, total.value - removed);
    }
  };

  const remove = async (row: T): Promise<void> => {
    if (!mutations.remove && !api?.remove) {
      notify("warning", DEFAULT_MESSAGES.noDeleteApi);
      return;
    }
    const controller = startOperation("remove");
    try {
      await removeOne(row, controller.signal);
      notify("success", DEFAULT_MESSAGES.deleteSuccess);
      if (refreshAfterMutation) await refresh();
      else removeRowsLocally([row]);
    } catch (cause) {
      throw await reportError(cause, "remove", DEFAULT_MESSAGES.deleteError);
    } finally {
      finishOperation("remove", controller);
    }
  };

  const batchRemove = async (rows: T[]): Promise<void> => {
    if (rows.length === 0) {
      notify("warning", "请选择要删除的数据");
      return;
    }
    if (!mutations.batchRemove && !mutations.remove && !api?.batchRemove && !api?.remove) {
      notify("warning", DEFAULT_MESSAGES.noDeleteApi);
      return;
    }
    const controller = startOperation("remove");
    try {
      if (mutations.batchRemove) {
        await mutations.batchRemove(rows, { signal: controller.signal });
      } else if (api?.batchRemove) {
        const ids = rows.map((row) => recordValue(row, idKey));
        if (client) {
          await client.post(api.batchRemove, { ids }, { signal: controller.signal });
        } else {
          await postData(api.batchRemove, { ids }, { signal: controller.signal });
        }
      } else {
        let cursor = 0;
        const failures: unknown[] = [];
        const worker = async (): Promise<void> => {
          while (cursor < rows.length && !controller.signal.aborted) {
            const current = rows[cursor++];
            try {
              await removeOne(current, controller.signal);
            } catch (cause) {
              failures.push(cause);
            }
          }
        };
        await Promise.all(
          Array.from({ length: Math.min(batchConcurrency, rows.length) }, worker),
        );
        if (controller.signal.aborted) {
          throw Object.assign(new Error("canceled"), {
            name: "AbortError",
            code: "ERR_CANCELED",
          });
        }
        if (failures.length > 0) {
          throw new RequestError({
            kind: "business",
            message: `${failures.length} delete operation(s) failed.`,
            data: failures,
          });
        }
      }
      notify("success", `成功删除 ${rows.length} 条数据`);
      if (refreshAfterMutation) await refresh();
      else removeRowsLocally(rows);
    } catch (cause) {
      throw await reportError(cause, "remove", "批量删除失败");
    } finally {
      finishOperation("remove", controller);
    }
  };

  const search = async (next?: Partial<Filters>): Promise<void> => {
    if (next) Object.assign(filters.value, next);
    page.current = DEFAULT_CONFIG.currentPage;
    await refresh();
  };

  const resetSearch = async (): Promise<void> => {
    filters.value = cloneValue(initialFilters);
    page.current = DEFAULT_CONFIG.currentPage;
    await refresh();
  };

  const setSort = async (next: Sort | null): Promise<void> => {
    sort.value = cloneValue(next);
    page.current = DEFAULT_CONFIG.currentPage;
    await refresh();
  };

  const handlePaginationChange = (pageNumber: number, pageSize: number): void => {
    page.current = pageNumber;
    page.size = pageSize;
    void refresh();
  };

  const handleRowDelete = (row: T): void => {
    removeRowsLocally([row]);
  };

  const createActionContext = (index: number): ActionContext<T> => ({
    data: data.value,
    index,
    page,
    paginationEnabled: paginationEnabled.value,
    message,
    dialog,
    refresh,
  });

  const actions = computed<TableActions<T>>(() => {
    const result: TableActions<T> = {};
    if (mutations.update || api?.update) {
      result.edit = async (row) => {
        try {
          await save(row);
          return { data: row, error: null };
        } catch (cause) {
          return { data: null, error: normalizeRequestError(cause) };
        }
      };
    }
    if (mutations.remove || api?.remove) {
      result.delete = async (row) => {
        try {
          await remove(row);
          return { data: { success: true }, error: null };
        } catch (cause) {
          return { data: null, error: normalizeRequestError(cause) };
        }
      };
    }
    if (mutations.get || api?.get) {
      result.detail = async (row) => {
        const value = await getDetail(row);
        return { data: value, error: error.value };
      };
    }
    if (customActions.length > 0) {
      result.custom = customActions.map((action) => ({
        key: action.key,
        label: action.label,
        icon: action.icon,
        type: action.type ?? "default",
        onClick: (row, index) => action.handler(row, createActionContext(index)),
      }));
    }
    return result;
  });

  const pagination = computed(() =>
    paginationEnabled.value
      ? {
          enabled: true as const,
          page: page.current,
          pageSize: page.size,
          itemCount: total.value,
        }
      : false,
  );

  const createDraft = (): T => createNewRow?.() ?? ({} as T);
  const cancel = (): void => {
    refreshSequence += 1;
    refreshController?.abort();
    refreshController = null;
    for (const controller of controllers) controller.abort();
  };
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    cancel();
  };

  if (getCurrentScope()) onScopeDispose(dispose);
  if (autoLoad === "mounted" && getCurrentInstance()) {
    onMounted(() => void refresh());
  } else if (autoLoad === "mounted") {
    void refresh();
  }
  else if (autoLoad) void refresh();

  return {
    data,
    rows: data,
    loading,
    isInitialLoading,
    isRefreshing,
    creating,
    updating,
    removing,
    total,
    error,
    lastUpdated,
    columns: computed(() => columns),
    actions,
    tableRef,
    page,
    filters,
    sort,
    paginationEnabled,
    pagination,
    refresh,
    reload: refresh,
    search,
    resetSearch,
    setSort,
    create,
    save,
    remove,
    batchRemove,
    getDetail,
    createDraft,
    cancel,
    dispose,
    handleCancel: refresh,
    handlePaginationChange,
    handleRowDelete,
    detail,
    detailConfig,
  };
}

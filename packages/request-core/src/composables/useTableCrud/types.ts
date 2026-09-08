import type { ComputedRef, Ref, ShallowRef } from "vue";
import type { RequestError } from "../../client/errors";
import type { RequestClient } from "../../client/types";

export type DataRecord = object;

export interface TableColumn<T = object> {
  title?: string;
  key?: string;
  render?: (row: T, index: number) => unknown;
  width?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  fixed?: "left" | "right";
  align?: "left" | "center" | "right";
  ellipsis?: boolean | object;
  sorter?: boolean | ((a: T, b: T) => number) | string;
  filter?: boolean | ((value: string, row: T) => boolean);
  [key: string]: unknown;
}

export interface ApiEndpoints {
  list: string;
  get?: string;
  create?: string;
  update?: string;
  remove?: string;
  batchRemove?: string;
}

export interface CrudMessageApi {
  success(message: string): unknown;
  error(message: string): unknown;
  warning(message: string): unknown;
  info?(message: string): unknown;
}

export interface CrudDialogApi {
  warning(options: unknown): unknown;
  error(options: unknown): unknown;
  success(options: unknown): unknown;
  info(options: unknown): unknown;
}

export interface CrudUiAdapter {
  message: CrudMessageApi;
  dialog?: CrudDialogApi;
}

export interface TablePageState {
  current: number;
  size: number;
}

export interface TableQueryContext<Filters, Sort> {
  page: number;
  pageSize: number;
  paginationEnabled: boolean;
  filters: Readonly<Filters>;
  sort: Readonly<Sort> | null;
  signal: AbortSignal;
}

export interface TableQueryResult<T> {
  items: T[];
  total: number;
}

export interface TableListParamKeys {
  /** Query parameter receiving the current page. Set to false to omit it. */
  page?: string | false;
  /** Query parameter receiving the page size. Set to false to omit it. */
  pageSize?: string | false;
  /** Query parameter receiving the sort object. Set to false to omit it. */
  sort?: string | false;
}

export type TableListParams<Filters extends object, Sort extends object> =
  | TableListParamKeys
  | ((context: TableQueryContext<Filters, Sort>) => Record<string, unknown>);

export interface TableMutationContext {
  signal: AbortSignal;
}

export interface CrudMutations<T> {
  create?: (row: T, context: TableMutationContext) => Promise<unknown>;
  update?: (row: T, context: TableMutationContext) => Promise<unknown>;
  remove?: (row: T, context: TableMutationContext) => Promise<unknown>;
  batchRemove?: (rows: T[], context: TableMutationContext) => Promise<unknown>;
  get?: (row: T, context: TableMutationContext) => Promise<T>;
}

export interface ActionContext<T> {
  data: T[];
  index: number;
  page: TablePageState;
  paginationEnabled: boolean;
  message: CrudMessageApi;
  dialog: CrudDialogApi;
  refresh: () => Promise<void>;
}

export interface CustomAction<T> {
  key: string;
  label: string;
  icon: string;
  type?: "default" | "primary" | "info" | "success" | "warning" | "error";
  handler: (row: T, context: ActionContext<T>) => void | Promise<void>;
}

export interface DetailItem {
  label: string;
  key: string;
  type?: string;
  span?: number;
  formatter?: (value: unknown) => string;
  tagType?: string;
  [key: string]: unknown;
}

export interface DetailSection {
  title: string;
  columns: number;
  items: DetailItem[];
}

export interface DetailConfig {
  sections: DetailSection[];
}

export interface UseTableCrudConfig<
  T extends DataRecord,
  Filters extends object = Record<string, unknown>,
  Sort extends object = Record<string, unknown>,
> {
  /** Legacy string endpoints. Prefer query/mutations for typed applications. */
  api?: ApiEndpoints;
  /**
   * Maps list state to query parameters when api.list is used. A function fully
   * controls the parameters; an object only renames or omits standard fields.
   */
  listParams?: TableListParams<Filters, Sort>;
  query?: (
    context: TableQueryContext<Filters, Sort>,
  ) => Promise<TableQueryResult<T> | unknown>;
  mutations?: CrudMutations<T>;
  client?: RequestClient;
  columns?: TableColumn<T>[];
  customActions?: CustomAction<T>[];
  detail?: DetailConfig;
  idKey?: keyof T;
  defaultPageSize?: number;
  defaultPaginationEnabled?: boolean;
  initialFilters?: Filters;
  initialSort?: Sort | null;
  createNewRow?: () => T;
  extractListData?: (response: unknown) => TableQueryResult<T>;
  /** true keeps the historical immediate behavior; "mounted" is SSR-safe. */
  autoLoad?: boolean | "mounted";
  refreshAfterMutation?: boolean;
  batchConcurrency?: number;
  ui?: CrudUiAdapter;
  detailTitle?: (row: T) => string;
  onError?: (error: RequestError, operation: string) => void | Promise<void>;
}

/** Stable application-level defaults shared by a table CRUD factory. */
export interface TableCrudDefaults {
  client?: RequestClient;
  defaultPageSize?: number;
  defaultPaginationEnabled?: boolean;
  autoLoad?: boolean | "mounted";
  refreshAfterMutation?: boolean;
  batchConcurrency?: number;
  ui?: CrudUiAdapter;
  listParams?: TableListParamKeys;
}

export interface TableCrudFactory {
  <
    T extends DataRecord,
    Filters extends object = Record<string, unknown>,
    Sort extends object = Record<string, unknown>,
  >(
    config: UseTableCrudConfig<T, Filters, Sort>,
  ): UseTableCrudReturn<T, Filters, Sort>;
}

export interface DetailModal<T> {
  visible: Ref<boolean>;
  data: Ref<T | null>;
  title: Ref<string>;
  show: (row: T) => void;
  close: () => void;
}

export interface TableActionResult<T = unknown> {
  data: T | null;
  error: RequestError | null;
}

export interface TableActions<T> {
  edit?: (row: T) => Promise<TableActionResult<T>>;
  delete?: (row: T) => Promise<TableActionResult<{ success: true }>>;
  detail?: (row: T) => Promise<TableActionResult<T | null>>;
  custom?: Array<{
    key: string;
    label: string;
    icon: string;
    type: CustomAction<T>["type"];
    onClick: (row: T, index: number) => void | Promise<void>;
  }>;
}

export interface UseTableCrudReturn<
  T extends DataRecord,
  Filters extends object = Record<string, unknown>,
  Sort extends object = Record<string, unknown>,
> {
  data: ShallowRef<T[]>;
  /** Preferred semantic alias of data. */
  rows: ShallowRef<T[]>;
  loading: ComputedRef<boolean>;
  isInitialLoading: ComputedRef<boolean>;
  isRefreshing: ComputedRef<boolean>;
  creating: ComputedRef<boolean>;
  updating: ComputedRef<boolean>;
  removing: ComputedRef<boolean>;
  total: Ref<number>;
  error: ShallowRef<RequestError | null>;
  lastUpdated: Ref<number | null>;
  columns: ComputedRef<TableColumn<T>[]>;
  actions: ComputedRef<TableActions<T>>;
  tableRef: Ref<unknown>;
  page: TablePageState;
  filters: Ref<Filters>;
  sort: Ref<Sort | null>;
  paginationEnabled: Ref<boolean>;
  pagination: ComputedRef<
    false | { enabled: true; page: number; pageSize: number; itemCount: number }
  >;
  refresh: () => Promise<void>;
  reload: () => Promise<void>;
  search: (next?: Partial<Filters>) => Promise<void>;
  resetSearch: () => Promise<void>;
  setSort: (next: Sort | null) => Promise<void>;
  create: (row: T) => Promise<void>;
  save: (row: T) => Promise<void>;
  remove: (row: T) => Promise<void>;
  batchRemove: (rows: T[]) => Promise<void>;
  getDetail: (row: T) => Promise<T | null>;
  createDraft: () => T;
  cancel: () => void;
  dispose: () => void;
  handleCancel: () => Promise<void>;
  handlePaginationChange: (page: number, pageSize: number) => void;
  handleRowDelete: (row: T, index?: number) => void;
  detail: DetailModal<T>;
  detailConfig?: DetailConfig;
}

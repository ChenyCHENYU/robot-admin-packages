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

/** A complete custom data source for local data, tests and non-HTTP backends. */
export interface TableCrudDataSource<
  T extends DataRecord,
  Filters extends object = Record<string, unknown>,
  Sort extends object = Record<string, unknown>,
> {
  query: (
    context: TableQueryContext<Filters, Sort>,
  ) => Promise<TableQueryResult<T> | unknown>;
  mutations?: CrudMutations<T>;
}

/** One explicit source replaces page-side api/query/mutations object assembly. */
export type TableCrudSource<
  T extends DataRecord,
  Filters extends object = Record<string, unknown>,
  Sort extends object = Record<string, unknown>,
> = ApiEndpoints | TableCrudDataSource<T, Filters, Sort>;

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

export type CrudEditorMode = "create" | "edit";

export interface CrudEditorContext<T> {
  mode: CrudEditorMode;
  original: T | null;
}

/** Optional business hooks and copy for the headless create/edit workflow. */
export interface CrudEditorConfig<T> {
  createTitle?: string;
  editTitle?: string | ((row: T) => string);
  /** Normalizes timestamps, audit fields, etc. immediately before persistence. */
  prepareSubmit?: (row: T, context: CrudEditorContext<T>) => T | Promise<T>;
}

export interface UseTableCrudConfig<
  T extends DataRecord,
  Filters extends object = Record<string, unknown>,
  Sort extends object = Record<string, unknown>,
> {
  /** Preferred flat boundary: pass endpoint configuration or a custom source. */
  source?: TableCrudSource<T, Filters, Sort>;
  /** Backward-compatible split endpoint field. New code should prefer source. */
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
  editor?: CrudEditorConfig<T>;
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

/** Framework-agnostic state consumed by form modal adapters. */
export interface CrudEditor<T> {
  visible: Ref<boolean>;
  mode: Ref<CrudEditorMode>;
  model: Ref<T | null>;
  title: Ref<string>;
  loading: ComputedRef<boolean>;
  openCreate: () => void;
  openEdit: (row: T) => void;
  setModel: (row: T) => void;
  close: () => void;
  submit: (row?: T) => Promise<boolean>;
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
  editor: CrudEditor<T>;
}

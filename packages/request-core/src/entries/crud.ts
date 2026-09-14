import { useNaiveTableCrud } from "../naive/useNaiveTableCrud";

export { useNaiveTableCrud };
export { createMemoryTableSource } from "../composables/useTableCrud/createMemoryTableSource";
export { defineDetailConfig } from "../composables/useTableCrud/configuration";
export type { MemoryTableSourceOptions } from "../composables/useTableCrud/createMemoryTableSource";

/** @deprecated Prefer useTableCrud from /vue or useNaiveTableCrud from /naive. */
export const useTableCrud = useNaiveTableCrud;

export type {
  DataRecord,
  UseTableCrudConfig,
  UseTableCrudReturn,
  ApiEndpoints,
  TableColumn,
  ActionContext,
  CustomAction,
  DetailModal,
  DetailItem,
  DetailSection,
  DetailConfig,
  CrudEditor,
  CrudEditorConfig,
  CrudEditorContext,
  CrudEditorMode,
  TableCrudDataSource,
  TableCrudSource,
} from "../composables/useTableCrud/types";

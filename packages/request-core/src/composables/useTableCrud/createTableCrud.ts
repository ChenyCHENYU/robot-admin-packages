import { useTableCrud } from "./useTableCrud";
import type {
  DataRecord,
  TableCrudDefaults,
  TableCrudFactory,
  TableListParamKeys,
  UseTableCrudConfig,
  UseTableCrudReturn,
} from "./types";

function snapshotListParams(
  value: TableListParamKeys | undefined,
): TableListParamKeys | undefined {
  return value ? { ...value } : undefined;
}

/**
 * Creates a typed table composable with application-level defaults. Each call
 * still owns isolated reactive state and can override every shared default.
 */
export function createTableCrud(
  defaults: TableCrudDefaults = {},
): TableCrudFactory {
  const shared = {
    ...defaults,
    listParams: snapshotListParams(defaults.listParams),
  };

  return <
    T extends DataRecord,
    Filters extends object = Record<string, unknown>,
    Sort extends object = Record<string, unknown>,
  >(
    config: UseTableCrudConfig<T, Filters, Sort>,
  ): UseTableCrudReturn<T, Filters, Sort> => {
    const localListParams = config.listParams;
    const listParams =
      localListParams && typeof localListParams === "object"
        ? { ...shared.listParams, ...localListParams }
        : (localListParams ?? shared.listParams);

    return useTableCrud<T, Filters, Sort>({
      ...shared,
      ...config,
      listParams,
    });
  };
}

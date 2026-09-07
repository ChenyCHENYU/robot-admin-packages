import { useDialog, useMessage } from "naive-ui";
import { useTableCrud } from "../composables/useTableCrud/useTableCrud";
import type {
  DataRecord,
  UseTableCrudConfig,
  UseTableCrudReturn,
} from "../composables/useTableCrud/types";

export function useNaiveTableCrud<
  T extends DataRecord,
  Filters extends object = Record<string, unknown>,
  Sort extends object = Record<string, unknown>,
>(
  config: UseTableCrudConfig<T, Filters, Sort>,
): UseTableCrudReturn<T, Filters, Sort> {
  const message = useMessage();
  const dialog = useDialog();
  return useTableCrud({
    ...config,
    ui: config.ui ?? {
      message: {
        success: (text) => message.success(text),
        error: (text) => message.error(text),
        warning: (text) => message.warning(text),
        info: (text) => message.info(text),
      },
      dialog: {
        warning: (options) =>
          dialog.warning(options as Parameters<typeof dialog.warning>[0]),
        error: (options) =>
          dialog.error(options as Parameters<typeof dialog.error>[0]),
        success: (options) =>
          dialog.success(options as Parameters<typeof dialog.success>[0]),
        info: (options) =>
          dialog.info(options as Parameters<typeof dialog.info>[0]),
      },
    },
  });
}

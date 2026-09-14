import type { DataRecord, TableCrudDataSource } from "./types";

export interface MemoryTableSourceOptions<T extends DataRecord> {
  /** Stable identifier used by get/update/remove. Defaults to `id`. */
  idKey?: keyof T;
}

function cloneRow<T>(row: T): T {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(row);
    } catch {
      // Reactive proxies and class instances fall back to a shallow copy.
    }
  }
  return Array.isArray(row)
    ? ([...row] as T)
    : row && typeof row === "object"
      ? ({ ...row } as T)
      : row;
}

/**
 * Creates an isolated in-memory CRUD source from rows or a row factory.
 * Filtering, sorting and paging intentionally remain table concerns.
 */
export function createMemoryTableSource<T extends DataRecord>(
  seed: readonly T[] | (() => readonly T[]),
  options: MemoryTableSourceOptions<T> = {},
): TableCrudDataSource<T> {
  const idKey = options.idKey ?? ("id" as keyof T);
  let rows = (typeof seed === "function" ? seed() : seed).map(cloneRow);
  const idOf = (row: T): unknown => row[idKey];

  return {
    query: async () => ({
      items: rows.map(cloneRow),
      total: rows.length,
    }),
    mutations: {
      get: async (row) =>
        cloneRow(rows.find((item) => idOf(item) === idOf(row)) ?? row),
      create: async (row) => {
        rows = [cloneRow(row), ...rows];
      },
      update: async (row) => {
        rows = rows.map((item) =>
          idOf(item) === idOf(row) ? cloneRow(row) : item,
        );
      },
      remove: async (row) => {
        rows = rows.filter((item) => idOf(item) !== idOf(row));
      },
    },
  };
}

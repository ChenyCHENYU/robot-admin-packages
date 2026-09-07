import { effectScope } from "vue";
import { describe, expect, it } from "vitest";
import { useTableCrud } from "../src/composables/useTableCrud/useTableCrud";

interface Row {
  id: number;
  name: string;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("headless useTableCrud", () => {
  it("keeps the latest list response and supports search/reset", async () => {
    const first = deferred<{ items: Row[]; total: number }>();
    const second = deferred<{ items: Row[]; total: number }>();
    const contexts: Array<{ keyword?: string }> = [];
    let call = 0;
    const scope = effectScope();
    const table = scope.run(() =>
      useTableCrud<Row, { keyword?: string }>({
        autoLoad: false,
        initialFilters: { keyword: "initial" },
        query: async (context) => {
          contexts.push({ ...context.filters });
          call += 1;
          return call === 1 ? first.promise : second.promise;
        },
      }),
    )!;

    const oldRefresh = table.refresh();
    const newRefresh = table.search({ keyword: "new" });
    second.resolve({ items: [{ id: 2, name: "new" }], total: 1 });
    await newRefresh;
    first.resolve({ items: [{ id: 1, name: "old" }], total: 1 });
    await oldRefresh;
    expect(table.rows.value).toEqual([{ id: 2, name: "new" }]);
    expect(contexts).toEqual([{ keyword: "initial" }, { keyword: "new" }]);

    const reset = table.resetSearch();
    // Third request is not deferred and would otherwise remain pending.
    table.cancel();
    await reset;
    expect(table.filters.value).toEqual({ keyword: "initial" });
    scope.stop();
  });

  it("tracks mutation state independently and uses createNewRow", async () => {
    const gate = deferred<void>();
    const scope = effectScope();
    const table = scope.run(() =>
      useTableCrud<Row>({
        autoLoad: false,
        refreshAfterMutation: false,
        query: async () => ({ items: [], total: 0 }),
        createNewRow: () => ({ id: 0, name: "draft" }),
        mutations: {
          create: async () => gate.promise,
        },
      }),
    )!;

    expect(table.createDraft()).toEqual({ id: 0, name: "draft" });
    const creating = table.create({ id: 1, name: "created" });
    expect(table.creating.value).toBe(true);
    expect(table.loading.value).toBe(true);
    gate.resolve();
    await creating;
    expect(table.creating.value).toBe(false);
    expect(table.loading.value).toBe(false);
    scope.stop();
  });

  it("updates local rows and totals when delete refresh is disabled", async () => {
    const table = useTableCrud<Row>({
      autoLoad: false,
      refreshAfterMutation: false,
      query: async () => ({
        items: [
          { id: 1, name: "first" },
          { id: 2, name: "second" },
        ],
        total: 2,
      }),
      mutations: {
        remove: async () => undefined,
      },
    });

    await table.refresh();
    await table.batchRemove([{ id: 1, name: "first" }]);

    expect(table.rows.value).toEqual([{ id: 2, name: "second" }]);
    expect(table.total.value).toBe(1);
  });

  it("does not let presentation adapter failures replace mutation outcomes", async () => {
    const table = useTableCrud<Row>({
      autoLoad: false,
      refreshAfterMutation: false,
      query: async () => ({ items: [{ id: 1, name: "row" }], total: 1 }),
      mutations: {
        remove: async () => undefined,
      },
      ui: {
        message: {
          success: () => {
            throw new Error("presentation failed");
          },
          error: () => undefined,
          warning: () => undefined,
        },
      },
    });

    await table.refresh();
    await expect(table.remove({ id: 1, name: "row" })).resolves.toBeUndefined();
    expect(table.rows.value).toEqual([]);
    expect(table.total.value).toBe(0);
  });
});

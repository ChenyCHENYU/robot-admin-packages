import { effectScope } from "vue";
import { describe, expect, it } from "vitest";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { createRequestClient } from "../src/client/client";
import { createTableCrud } from "../src/composables/useTableCrud/createTableCrud";
import { createMemoryTableSource } from "../src/composables/useTableCrud/createMemoryTableSource";
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

function response(
  config: InternalAxiosRequestConfig,
  data: unknown,
): AxiosResponse {
  return { data, status: 200, statusText: "OK", headers: {}, config };
}

describe("headless useTableCrud", () => {
  it("uses one isolated memory source without page-side CRUD assembly", async () => {
    const sourceRows = [{ id: 1, name: "first" }];
    const table = useTableCrud({
      autoLoad: false,
      source: createMemoryTableSource(sourceRows),
    });

    await table.refresh();
    table.rows.value[0]!.name = "local mutation";
    await table.refresh();
    expect(table.rows.value).toEqual([{ id: 1, name: "first" }]);

    await table.create({ id: 2, name: "second" });
    expect(table.rows.value).toEqual([
      { id: 2, name: "second" },
      { id: 1, name: "first" },
    ]);

    await table.save({ id: 2, name: "updated" });
    expect(table.rows.value[0]).toEqual({ id: 2, name: "updated" });
    expect(await table.getDetail({ id: 2, name: "stale" })).toEqual({
      id: 2,
      name: "updated",
    });

    await table.remove({ id: 1, name: "first" });
    expect(table.rows.value).toEqual([{ id: 2, name: "updated" }]);
    expect(sourceRows).toEqual([{ id: 1, name: "first" }]);
  });

  it("accepts endpoint configuration through the same source boundary", async () => {
    let requestedUrl: string | undefined;
    const client = createRequestClient({
      request: {
        adapter: async (config) => {
          requestedUrl = config.url;
          return response(config, { items: [], total: 0 });
        },
      },
    });
    const table = useTableCrud<Row>({
      autoLoad: false,
      client,
      source: { list: "/rows" },
    });

    await table.refresh();
    expect(requestedUrl).toBe("/rows");
    client.dispose();
  });

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

  it("drives create and edit form modals without page-owned state", async () => {
    const created: Row[] = [];
    const updated: Row[] = [];
    const table = useTableCrud<Row>({
      autoLoad: false,
      refreshAfterMutation: false,
      query: async () => ({ items: [], total: 0 }),
      createNewRow: () => ({ id: 0, name: "draft" }),
      editor: {
        createTitle: "Create row",
        editTitle: (row) => `Edit ${row.name}`,
        prepareSubmit: (row) => ({ ...row, name: row.name.trim() }),
      },
      mutations: {
        create: async (row) => {
          created.push(row);
        },
        update: async (row) => {
          updated.push(row);
        },
      },
    });

    table.editor.openCreate();
    expect(table.editor.visible.value).toBe(true);
    expect(table.editor.title.value).toBe("Create row");
    expect(table.editor.model.value).toEqual({ id: 0, name: "draft" });
    expect(await table.editor.submit({ id: 1, name: " created " })).toBe(true);
    expect(created).toEqual([{ id: 1, name: "created" }]);
    expect(table.editor.visible.value).toBe(false);

    const source = { id: 2, name: "source" };
    table.editor.openEdit(source);
    table.editor.setModel({ id: 2, name: " changed " });
    expect(source.name).toBe("source");
    expect(table.editor.title.value).toBe("Edit source");
    expect(await table.editor.submit()).toBe(true);
    expect(updated).toEqual([{ id: 2, name: "changed" }]);
    expect(table.editor.visible.value).toBe(false);
  });

  it("keeps the editor open when submit preparation fails", async () => {
    const errors: string[] = [];
    const table = useTableCrud<Row>({
      autoLoad: false,
      refreshAfterMutation: false,
      query: async () => ({ items: [], total: 0 }),
      createNewRow: () => ({ id: 0, name: "draft" }),
      editor: {
        prepareSubmit: async () => {
          throw new Error("normalize failed");
        },
      },
      mutations: { create: async () => undefined },
      onError: (error) => {
        errors.push(error.message);
      },
    });

    table.editor.openCreate();
    expect(await table.editor.submit()).toBe(false);
    expect(table.editor.visible.value).toBe(true);
    expect(table.editor.model.value).toEqual({ id: 0, name: "draft" });
    expect(errors).toEqual(["normalize failed"]);
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

  it("creates isolated tables from shared application defaults", async () => {
    const useAppTable = createTableCrud({
      autoLoad: false,
      defaultPageSize: 50,
      refreshAfterMutation: false,
    });
    const first = useAppTable<Row, { keyword: string }>({
      initialFilters: { keyword: "first" },
      query: async () => ({ items: [], total: 0 }),
    });
    const second = useAppTable<Row, { keyword: string }>({
      defaultPageSize: 10,
      initialFilters: { keyword: "second" },
      query: async () => ({ items: [], total: 0 }),
    });

    first.filters.value.keyword = "changed";

    expect(first.page.size).toBe(50);
    expect(second.page.size).toBe(10);
    expect(second.filters.value.keyword).toBe("second");
  });

  it("maps legacy list pagination without per-page query boilerplate", async () => {
    let requestParams: unknown;
    const client = createRequestClient({
      request: {
        adapter: async (config) => {
          requestParams = config.params;
          return response(config, { items: [], total: 0 });
        },
      },
    });
    const useAppTable = createTableCrud({
      client,
      autoLoad: false,
      listParams: { page: "current", pageSize: "size", sort: "order" },
    });
    const table = useAppTable<Row, { keyword: string }, { field: string }>({
      api: { list: "/users" },
      initialFilters: { keyword: "robot" },
      initialSort: { field: "name" },
      listParams: { sort: false },
    });

    await table.refresh();

    expect(requestParams).toEqual({
      current: 1,
      size: 10,
      keyword: "robot",
    });
    client.dispose();
  });

  it("allows a page to fully control legacy list parameters", async () => {
    let requestParams: unknown;
    const client = createRequestClient({
      request: {
        adapter: async (config) => {
          requestParams = config.params;
          return response(config, { items: [], total: 0 });
        },
      },
    });
    const table = useTableCrud<Row, { keyword: string }>({
      api: { list: "/users" },
      client,
      autoLoad: false,
      initialFilters: { keyword: "robot" },
      listParams: ({ page, pageSize, filters }) => ({
        pageIndex: page - 1,
        limit: pageSize,
        search: filters.keyword,
      }),
    });

    await table.refresh();

    expect(requestParams).toEqual({
      pageIndex: 0,
      limit: 10,
      search: "robot",
    });
    client.dispose();
  });
});

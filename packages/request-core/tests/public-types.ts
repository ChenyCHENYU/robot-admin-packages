import {
  createRequestClient,
  type RequestClient,
  type RequestConfig,
} from "../src/entries/axios";
import {
  createMemoryTableSource,
  createTableCrud,
  defineDetailConfig,
  useRequestClient,
  useTableCrud,
  type TableCrudDataSource,
} from "../src/entries/vue";
import { useNaiveTableCrud } from "../src/entries/naive";

interface User {
  id: number;
  name: string;
}

interface CreateUser {
  name: string;
}

const client = createRequestClient();
const config: RequestConfig = {
  cache: { enabled: true, tags: ["users"] },
  retry: { enabled: true, count: 2 },
  concurrency: "join",
  scope: "type-fixture",
};

async function verifyClientTypes(): Promise<void> {
  const users = await client.get<User[]>("/users", config);
  const created = await client.post<User, CreateUser>("/users", {
    name: users[0]?.name ?? "Robot",
  });
  created.id.toFixed();
}

function verifyTableTypes(): void {
  const detail = defineDetailConfig({
    sections: [
      {
        title: "User",
        columns: 1,
        items: [
          { label: "Name", key: "name", formatter: (value) => String(value) },
        ],
      },
    ],
  });
  const table = useTableCrud<User, { keyword: string }>({
    client,
    autoLoad: false,
    initialFilters: { keyword: "" },
    query: async ({ filters }) => ({
      items: [{ id: 1, name: filters.keyword }],
      total: 1,
    }),
    detail,
  });
  table.rows.value[0]?.name.toUpperCase();
  void table.search({ keyword: "Robot" });

  const useAppTable = createTableCrud({
    client,
    autoLoad: false,
    listParams: { page: "current", pageSize: "size" },
  });
  const configured = useAppTable<User, { keyword: string }>({
    api: { list: "/users" },
    initialFilters: { keyword: "" },
    listParams: ({ page, filters }) => ({
      current: page,
      keyword: filters.keyword,
    }),
  });
  configured.rows.value[0]?.id.toFixed();

  const local = useAppTable({
    source: createMemoryTableSource([{ id: 1, name: "Robot" }]),
  });
  local.rows.value[0]?.name.toUpperCase();
}

void verifyClientTypes;
void verifyTableTypes;

// 外部 UI 的排序、筛选与数字键不应迫使业务重写列或做双重断言。
interface ExternalColumn {
  key: string | number;
  title: string;
  sorter?: { multiple: number; compare: (a: User, b: User) => number };
  filter?: (value: string | number, row: User) => boolean;
  render?: (row: User, index: number) => string;
}
function verifyExternalColumns(): void {
  const columns: ExternalColumn[] = [{ key: "name", title: "姓名" }];
  const table = useTableCrud<User>({
    autoLoad: false,
    source: createMemoryTableSource([{ id: 1, name: "Robot" }]),
    columns,
  });
  table.columns.value[0]?.render?.({ id: 1, name: "Robot" }, 0);
  useTableCrud<User>({
    autoLoad: false,
    columns: [{ key: "name", render: (row) => row.name.toUpperCase() }],
  });
  useTableCrud<User>({
    autoLoad: false,
    // @ts-expect-error 列渲染仍须接收正确的业务模型。
    columns: [{ render: (row: { id: string }) => row.id }],
  });
}
void verifyExternalColumns;

function verifySourceInference(): void {
  const table = useTableCrud({
    autoLoad: false,
    initialFilters: { keyword: "" },
    initialSort: { field: "name", descending: false },
    source: {
      query: async ({ filters, sort }) => ({
        items: [{ id: 1, name: filters.keyword, descending: sort?.descending }],
        total: 1,
      }),
    },
  });
  table.rows.value[0]?.id.toFixed();
  table.rows.value[0]?.name.toUpperCase();
  table.filters.value.keyword.toUpperCase();
  void table.search({ keyword: "Robot" });
  void table.setSort({ field: "id", descending: true });
  // @ts-expect-error Row fields come from the normalized query result.
  table.rows.value[0]?.missing;
  // @ts-expect-error Inferred filters reject misspelled names.
  void table.search({ keywrod: "Robot" });
  // @ts-expect-error Inferred filters retain their value types.
  void table.search({ keyword: 123 });
  // @ts-expect-error Inferred sort retains its value types.
  void table.setSort({ field: "id", descending: "yes" });

  const useAppTable = createTableCrud({ autoLoad: false });
  const configured = useAppTable({
    initialFilters: { keyword: "" },
    source: {
      query: async ({ filters }) => ({
        items: [{ id: 1, name: filters.keyword }],
        total: 1,
      }),
    },
  });
  configured.rows.value[0]?.name.toUpperCase();
  configured.filters.value.keyword.toUpperCase();
  // @ts-expect-error Application defaults preserve inferred filters.
  void configured.search({ keyword: false });

  const naive = useNaiveTableCrud({
    autoLoad: false,
    initialFilters: { keyword: "" },
    source: {
      query: async ({ filters }) => ({
        items: [{ id: 1, name: filters.keyword }],
        total: 1,
      }),
    },
  });
  naive.rows.value[0]?.name.toUpperCase();
  naive.filters.value.keyword.toUpperCase();
  // @ts-expect-error The UI adapter preserves inferred filters.
  void naive.search({ keywrod: "Robot" });

  const rowsOnly = useTableCrud({
    autoLoad: false,
    source: {
      query: async () => ({ items: [{ id: 1, name: "Robot" }], total: 1 }),
    },
  });
  rowsOnly.rows.value[0]?.name.toUpperCase();
}

function verifySourceContract(): void {
  const source: TableCrudDataSource<User> = {
    // @ts-expect-error Typed sources cannot return a legacy envelope.
    query: async () => ({
      data: { list: [{ id: 1, name: "Robot" }], total: 1 },
    }),
  };
  useTableCrud<User>({
    autoLoad: false,
    source: {
      // @ts-expect-error A normalized result must match the explicit business row.
      query: async () => ({ items: [{ id: "wrong-id", name: 123 }], total: 1 }),
    },
  });
  createTableCrud()({
    source: {
      // @ts-expect-error Inferred sources still require a numeric total.
      query: async () => ({ items: [{ id: 1, name: "Robot" }], total: "1" }),
    },
  });
  const legacyQuery = async (): Promise<unknown> => ({
    data: { list: [{ id: 1, name: "Robot" }], total: 1 },
  });
  const legacy = useTableCrud<User>({ autoLoad: false, query: legacyQuery });
  legacy.rows.value[0]?.name.toUpperCase();
  void source;
}

function verifyRequestInjection(optional: boolean | undefined): void {
  const required: RequestClient = useRequestClient();
  const explicitlyRequired: RequestClient = useRequestClient(false);
  const defaultRequired: RequestClient = useRequestClient(undefined);
  void required.get<User[]>("/users");
  void explicitlyRequired.get<User[]>("/users");
  void defaultRequired.get<User[]>("/users");
  const maybeClient = useRequestClient(true);
  // @ts-expect-error Optional injection requires a presence check.
  void maybeClient.get<User[]>("/users");
  void maybeClient?.get<User[]>("/users");
  const dynamicClient = useRequestClient(optional);
  // @ts-expect-error A boolean flag may allow missing injection.
  const definitelyPresent: RequestClient = dynamicClient;
  void definitelyPresent;
}

void verifySourceInference;
void verifySourceContract;
void verifyRequestInjection;

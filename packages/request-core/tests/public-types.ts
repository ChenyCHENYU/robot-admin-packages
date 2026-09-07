import {
  createRequestClient,
  type RequestConfig,
} from "../src/entries/axios";
import { useTableCrud } from "../src/entries/vue";

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
  const table = useTableCrud<User, { keyword: string }>({
    client,
    autoLoad: false,
    initialFilters: { keyword: "" },
    query: async ({ filters }) => ({
      items: [{ id: 1, name: filters.keyword }],
      total: 1,
    }),
  });
  table.rows.value[0]?.name.toUpperCase();
  void table.search({ keyword: "Robot" });
}

void verifyClientTypes;
void verifyTableTypes;

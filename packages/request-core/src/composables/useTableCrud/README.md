# useTableCrud

`useTableCrud` 是 `@robot-admin/request-core/vue` 提供的 Headless 表格请求状态机。
它管理查询、分页、搜索、排序、CRUD、并发和生命周期，不绑定任何表格组件或 UI
框架。

完整安装、Client、认证、缓存和迁移说明见包根目录的 [README](../../../README.md)。

## 推荐用法

```ts
import { useTableCrud } from '@robot-admin/request-core/vue'
import { request } from '@/services/request'

interface Employee {
  id: number
  name: string
}

interface Filters {
  keyword: string
  enabled?: boolean
}

const table = useTableCrud<Employee, Filters>({
  client: request,
  autoLoad: 'mounted',
  initialFilters: { keyword: '' },
  query: ({ page, pageSize, filters, signal }) =>
    request.get('/employees', {
      params: { page, pageSize, ...filters },
      signal,
      concurrency: 'takeLatest',
    }),
  mutations: {
    create: (row, { signal }) => request.post('/employees', row, { signal }),
    update: (row, { signal }) =>
      request.put(`/employees/${row.id}`, row, { signal }),
    remove: (row, { signal }) =>
      request.delete(`/employees/${row.id}`, { signal }),
  },
  createNewRow: () => ({ id: 0, name: '' }),
})
```

`query` 可以直接返回 `{ items, total }`，也可以返回以下兼容结构：

- `{ data: { list, total } }`
- `{ data: { items, totalCount } }`
- `{ list, total }`
- `{ data: [...] }`
- `[...]`

## 配置

| 配置 | 说明 |
| --- | --- |
| `query(context)` | 推荐的类型化列表查询函数 |
| `mutations` | 可选的 create/update/remove/batchRemove/get 函数 |
| `client` | 显式 Client；省略时读取 Vue 注入 |
| `initialFilters`, `initialSort` | 初始筛选和排序 |
| `defaultPageSize` | 默认 10 |
| `defaultPaginationEnabled` | 默认 true |
| `autoLoad` | `true` 立即加载、`'mounted'` 挂载加载、`false` 手动加载 |
| `refreshAfterMutation` | 变更成功后是否刷新，默认 true |
| `batchConcurrency` | 单条删除降级模式的并发数，默认 4 |
| `extractListData` | 自定义列表结果提取 |
| `createNewRow` | `createDraft()` 使用的草稿工厂 |
| `ui` | 可选消息/对话框适配，不提供时完全静默 |
| `onError` | 统一接收标准化 RequestError |

`api: { list, get, create, update, remove, batchRemove }` 字符串配置仍可兼容旧项目，
新代码优先使用函数式 `query/mutations`，以支持 mock、动态 URL、不同 HTTP 方法和
完整类型推导。

## 返回值

- 数据：`rows`（`data` 兼容别名）、`total`、`error`、`lastUpdated`
- 查询状态：`loading`、`isInitialLoading`、`isRefreshing`
- 变更状态：`creating`、`updating`、`removing`
- 查询模型：`page`、`filters`、`sort`、`paginationEnabled`、`pagination`
- 查询：`refresh`、`reload`、`search`、`resetSearch`、`setSort`
- 变更：`create`、`save`、`remove`、`batchRemove`、`getDetail`
- 生命周期：`cancel`、`dispose`
- 兼容：`columns`、`actions`、`tableRef`、`detail`、`detailConfig`

## 并发和错误语义

- 每次刷新会取消上一轮刷新，并用序号阻止不响应 AbortSignal 的旧请求回写数据。
- 所有操作使用引用计数维护总 loading，不会因为并发任务提前结束而错误复位。
- 查询错误写入 `error` 并保持历史兼容：默认不向外抛出。
- create/save/remove/batchRemove 错误会写入 `error` 并重新抛出 RequestError。
- 主动取消不会显示错误消息，也不会污染 `error`。
- `refreshAfterMutation: false` 时，单条和批量删除会同步维护本地行与 `total`。
- Message 呈现适配器的同步或异步异常不会替换真实 CRUD 结果。
- Vue effect scope 销毁时自动取消未完成请求。

## Naive UI

```ts
import { useNaiveTableCrud } from '@robot-admin/request-core/naive'

const table = useNaiveTableCrud({
  client: request,
  query: context => employeeApi.list(context),
  columns,
})
```

该适配只提供 Naive UI Message/Dialog。业务状态和请求逻辑仍由同一个 Headless
实现维护，不存在第二份 CRUD 逻辑。

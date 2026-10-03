# useTableCrud

`useTableCrud` 是 `@robot-admin/request-core/vue` 提供的 Headless 表格请求状态机。
它管理查询、分页、搜索、排序、CRUD、并发和生命周期，不绑定任何表格组件或 UI
框架。

完整安装、Client、认证、缓存和迁移说明见包根目录的 [README](../../../README.md)。

## 推荐用法

标准页面使用 `source` 统一接入 HTTP 端点或自定义数据源。HTTP 端点会复用显式传入
或 Vue 注入的 Client；下面的例子在组件挂载后加载数据：

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
  source: {
    list: '/employees',
    get: '/employees/:id',
    create: '/employees',
    update: '/employees/:id',
    remove: '/employees/:id',
  },
  initialFilters: { keyword: '' },
  createNewRow: () => ({ id: 0, name: '' }),
})
```

`list` 使用 GET，`create` 使用 POST，`update` 使用 PUT，`remove` 使用 DELETE；
详情、更新和删除端点中的 `:id` 会按 `idKey`（默认 `id`）替换并进行 URL 编码。
只需要查询的页面可以只提供 `source: { list: '/employees' }`。

### 内存数据源

演示、测试或离线数据可以通过同一个 `source` 接口接入，不需要实现五个异步方法：

```ts
import {
  createMemoryTableSource,
  useTableCrud,
} from '@robot-admin/request-core/vue'

const seedEmployees = [{ id: 1, name: 'Robot' }]
const table = useTableCrud({
  source: createMemoryTableSource(seedEmployees),
  autoLoad: false,
  createNewRow: () => ({ id: 0, name: '' }),
})

await table.refresh()
await table.save({ id: 1, name: 'Robot Admin' })
```

行类型从种子数据自动推断。每次 `createMemoryTableSource()` 调用创建独立的数据
快照，提供查询、详情、新增、更新和删除；同一个 source 被多个表格使用时仍会共享
该 source 的数据。可通过第二个参数 `{ idKey: 'employeeNo' }` 指定标识字段，并在
`useTableCrud` 中使用相同的 `idKey`。

内存源查询返回完整列表，不自动按筛选、排序或分页参数处理；需要这些行为时由
自定义 source 的 `query(context)` 或呈现层实现。新增行的唯一标识也由业务提供，
内存源不会自动生成 ID。

### 自定义查询与变更

特殊 HTTP 方法、动态 URL 或聚合接口可用 `query/mutations` 接管；以下沿用前例的
`Employee`、`Filters` 类型：

```ts
import { useTableCrud } from '@robot-admin/request-core/vue'
import { request } from '@/services/request'

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

自定义 source 本身也可提供 `{ query, mutations }`。顶层 `api`、`query` 和同名
`mutations` 方法会覆盖 source 的对应配置，仅在需要局部覆盖时使用。

## 应用级函数式预配置

```ts
import { createTableCrud } from '@robot-admin/request-core/vue'
import { request } from '@/services/request'

export const useAppTable = createTableCrud({
  client: request,
  autoLoad: 'mounted',
  defaultPageSize: 20,
  listParams: { page: 'current', pageSize: 'size' },
})

const table = useAppTable<Employee, Filters>({
  source: { list: '/employees' },
  initialFilters: { keyword: '' },
})
```

`createTableCrud()` 返回一个带应用默认值的 `useTableCrud`。它不创建单例状态、不
绑定表格组件，也不要求继承基类；每次调用都会创建独立状态，且页面可覆盖任意
默认项。建议控制器保留 `table` 能力对象，只向模板解构实际需要的字段。

`listParams` 有两种模式：

- `{ page: 'current', pageSize: 'size', sort: 'order' }`：只调整通用字段名；字段值为
  `false` 时省略该字段。
- `context => ({ ... })`：由页面完全生成列表参数，适合特殊接口。函数形式会替代
  工厂级字段映射。

`query` 可以直接返回 `{ items, total }`，也可以返回以下兼容结构：

- `{ data: { list, total } }`
- `{ data: { items, totalCount } }`
- `{ list, total }`
- `{ data: [...] }`
- `[...]`

## 新增与编辑工作流

通过 `editor` 配置标题和提交前转换，表单弹窗可直接消费 `table.editor`：

```ts
import {
  createMemoryTableSource,
  useTableCrud,
} from '@robot-admin/request-core/vue'

const employee = { id: 1, name: 'Robot' }
const table = useTableCrud({
  source: createMemoryTableSource([employee]),
  autoLoad: false,
  createNewRow: () => ({ id: 0, name: '' }),
  editor: {
    createTitle: '新增员工',
    editTitle: (row) => `编辑员工 · ${row.name}`,
    prepareSubmit: (row) => ({ ...row, name: row.name.trim() }),
  },
})

table.editor.openCreate()
table.editor.setModel({ id: 2, name: 'New Employee' })
const created = await table.editor.submit()

table.editor.openEdit(employee)
const updated = await table.editor.submit()
```

| 状态/方法 | 说明 |
| --- | --- |
| `visible`, `mode`, `model`, `title` | 弹窗可见性、`create/edit` 模式、草稿和标题，均为 Ref |
| `loading` | 当前模式对应的新增/更新状态，为 ComputedRef |
| `openCreate()` / `openEdit(row)` | 创建或复制草稿，并打开对应模式 |
| `setModel(row)` | 复制业务表单数据到当前草稿 |
| `submit(row?)` | 提交传入数据或当前草稿；成功返回 true，否则返回 false |
| `close()` | 关闭弹窗并清理草稿和标题 |

脚本中读取 Ref 使用 `.value`。提交前可在宿主表单执行校验；`prepareSubmit` 接收
草稿及 `{ mode, original }`，支持异步转换，新增时 `original` 为 `null`。它也可以
抛错阻止提交，错误会记录到 `table.error`。提交成功自动关闭；预处理或请求失败时
保留弹窗。未配置对应变更方法或没有草稿时返回 `false`。`dispose()` 会取消请求并
清理编辑器。

## 详情配置

`defineDetailConfig()` 为详情字段提供上下文类型检查，不需要给配置变量手工标注
类型：

```ts
import { defineDetailConfig } from '@robot-admin/request-core/vue'

const employeeDetail = defineDetailConfig({
  sections: [{
    title: '员工信息',
    columns: 2,
    items: [{
      label: '姓名',
      key: 'name',
      formatter: (value) => String(value),
    }],
  }],
})
```

将该配置传入 `useTableCrud({ source, detail: employeeDetail })`，使用
`getDetail(row)` 获取详情并更新 `table.detail`；仅需展示当前行时可以省略详情端点。

## 配置

| 配置 | 说明 |
| --- | --- |
| `source` | 推荐入口：HTTP 端点配置或 `{ query, mutations }` 自定义数据源 |
| `query(context)` | 需要接管查询时提供的类型化函数 |
| `mutations` | 可选的 create/update/remove/batchRemove/get 函数 |
| `client` | 显式 Client；省略时读取 Vue 注入 |
| `listParams` | 使用端点 source 或 `api.list` 时重命名/省略通用参数，或完全自定义参数映射 |
| `initialFilters`, `initialSort` | 初始筛选和排序 |
| `defaultPageSize` | 默认 10 |
| `defaultPaginationEnabled` | 默认 true |
| `autoLoad` | `true` 立即加载、`'mounted'` 挂载加载、`false` 手动加载 |
| `refreshAfterMutation` | 变更成功后是否刷新，默认 true |
| `batchConcurrency` | 单条删除降级模式的并发数，默认 4 |
| `extractListData` | 自定义列表结果提取 |
| `createNewRow` | `createDraft()` 和 `editor.openCreate()` 使用的草稿工厂 |
| `editor` | 新增/编辑标题及 `prepareSubmit(row, context)` 提交前转换 |
| `detail` | 详情配置，可用 `defineDetailConfig()` 定义 |
| `idKey` | 行标识字段，默认 `id`；用于 URL 替换和本地删除 |
| `ui` | 可选消息/对话框适配，不提供时完全静默 |
| `onError` | 统一接收标准化 RequestError |

`api: { list, get, create, update, remove, batchRemove }` 字符串配置仍兼容旧项目；
新页面优先把同一份端点配置放到 `source`。标准单表可结合 `createTableCrud()`
减少重复；动态 URL、特殊 HTTP 方法或复杂聚合查询可使用函数式 `query/mutations`。

## 返回值

- 数据：`rows`（`data` 兼容别名）、`total`、`error`、`lastUpdated`
- 查询状态：`loading`、`isInitialLoading`、`isRefreshing`
- 变更状态：`creating`、`updating`、`removing`
- 查询模型：`page`、`filters`、`sort`、`paginationEnabled`、`pagination`
- 查询：`refresh`、`reload`、`search`、`resetSearch`、`setSort`
- 变更：`create`、`save`、`remove`、`batchRemove`、`getDetail`
- 草稿和弹窗：`createDraft`、`editor`
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

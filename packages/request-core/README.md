# @robot-admin/request-core

[![npm version](https://img.shields.io/npm/v/@robot-admin/request-core.svg)](https://www.npmjs.com/package/@robot-admin/request-core)
[![license](https://img.shields.io/npm/l/@robot-admin/request-core.svg)](./LICENSE)

面向生产环境的实例化请求编排与 Vue 3 Headless CRUD 工具。当前版本：
`0.4.1`。

它保留 Axios 的完整能力，只收拢应用中最容易重复出错的部分：并发请求、缓存、
取消、重试、Token 刷新、错误标准化以及列表 CRUD 生命周期。

## 特性

- 每个 Client 独立持有缓存、待处理请求、取消作用域和认证状态，无跨应用污染。
- 简单调用保持一行，复杂调用通过平铺的请求配置按需启用。
- 相同请求支持 `join`、`takeLatest`、`takeFirst`、`allow` 四种并发语义。
- 内存 LRU 缓存支持 TTL、标签/前缀失效、自定义同步 CacheStore 和引用保护。
- 重试支持幂等方法白名单、指数退避、抖动、`Retry-After` 和总时间预算。
- Token 主动刷新、并发 401 恢复和重新登录均使用 single-flight。
- `RequestError` 统一业务、HTTP、网络、超时、取消和配置错误。
- Vue 层不依赖具体 UI；Naive UI 仅作为可选兼容适配层。
- ESM、CJS 和 TypeScript 类型入口均经过发布前验证。

## 安装与入口

```bash
bun add @robot-admin/request-core axios
```

| 入口 | 依赖边界 | 用途 |
| --- | --- | --- |
| `@robot-admin/request-core/axios` | Axios | 推荐的请求 Client、策略及兼容 API |
| `@robot-admin/request-core/vue` | Axios + Vue | `useRequest`、Headless `useTableCrud`、Client 注入 |
| `@robot-admin/request-core/naive` | Axios + Vue + Naive UI | `useNaiveTableCrud` 兼容适配 |
| `@robot-admin/request-core` | 完整兼容入口 | 旧项目平滑迁移，当前仍会引用 Naive UI |
| `@robot-admin/request-core/crud` | 兼容入口 | 已废弃，迁移到 `/vue` 或 `/naive` |

纯请求项目应使用 `/axios`，这样不会引入 Vue 或任何 UI 框架。

## 推荐接入

### 创建唯一的应用 Client

```ts
// src/services/request.ts
import {
  createRequestClient,
  type ResponseAdapter,
} from '@robot-admin/request-core/axios'

const responseAdapter: ResponseAdapter = {
  isSuccess: data => [0, 200].includes((data as { code: number }).code),
  getData: data => (data as { data: unknown }).data,
  getError: data => ({
    code: (data as { code?: number }).code,
    message: (data as { message?: string }).message ?? '请求失败',
    data,
  }),
}

export const request = createRequestClient({
  request: {
    baseURL: import.meta.env.VITE_API_BASE,
    timeout: 10_000,
  },
  response: responseAdapter,
  defaults: {
    concurrency: 'join',
    retry: { enabled: false },
    cache: { enabled: false },
  },
  hooks: {
    onError: error => {
      if (error.kind !== 'canceled') window.$message?.error(error.message)
    },
  },
})
```

所有能力均可省略。默认缓存和重试关闭；新 Client 的相同安全读取请求默认共享结果，
副作用方法默认允许并发。

### 类型化调用

```ts
interface User {
  id: number
  name: string
}

interface CreateUser {
  name: string
}

const users = await request.get<User[]>('/users', {
  params: { keyword: 'robot' },
})

const user = await request.post<User, CreateUser>('/users', {
  name: 'Robot',
})

const response = await request.raw<User>({
  method: 'GET',
  url: '/users/1',
})
```

支持 `request/get/post/put/patch/delete/head/options/raw`。`raw()` 返回完整
`AxiosResponse`，其他方法返回响应适配器处理后的数据。

## 全局配置与按需能力

策略可以在 Client 层配置默认值，也可以被单次请求覆盖：

```ts
await request.get('/dashboard', {
  cache: { enabled: true, ttl: 60_000, tags: ['dashboard'] },
  retry: { enabled: true, count: 2, maxElapsedMs: 8_000 },
  concurrency: 'takeLatest',
  scope: 'dashboard-page',
})

request.cache.invalidateTag('dashboard')
request.requests.cancelScope('dashboard-page')
```

并发策略：

- `join`：相同请求共享一次网络调用，适合字典和初始化数据。
- `takeLatest`：取消旧请求，只保留最新请求，适合搜索和分页。
- `takeFirst`：已有相同请求时拒绝新请求，适合提交按钮。
- `allow`：允许全部并发，适合调用方自行管理的任务。

旧 `dedupe` 配置继续可用。隐式去重只作用于 GET、HEAD、OPTIONS；POST 等
副作用请求不会被默认取消。

### 缓存

```ts
const client = createRequestClient({
  cache: { maxSize: 500, clone: true },
})

await client.get('/users', {
  cache: {
    enabled: true,
    ttl: 5 * 60_000,
    tags: ['users'],
    varyHeaders: ['accept-language'],
  },
})

client.cache.clear()
client.cache.invalidateTag('users')
client.cache.invalidatePrefix('GET|')
```

缓存按 Client 隔离，键包含 `baseURL`、URL、方法、参数、请求体、响应类型和身份
相关请求头摘要。切换用户或租户时仍建议显式 `client.cache.clear()`。

### 重试

```ts
await request.get('/reports', {
  retry: {
    enabled: true,
    count: 3,
    delay: 500,
    maxDelay: 10_000,
    maxElapsedMs: 20_000,
    respectRetryAfter: true,
    onRetry: ({ attempt, delay }) => reportRetry(attempt, delay),
  },
})
```

默认只允许 GET、HEAD、OPTIONS、PUT、DELETE 重试。POST 不会自动重试；流式或
不可重放的 body 也会被保护性跳过。

## 认证恢复

```ts
const request = createRequestClient({
  request: { baseURL: '/api' },
  auth: {
    getToken: () => userStore.token,
    shouldRefresh: () => userStore.isTokenExpiringSoon(),
    refresh: async ({ raw, signal }) => {
      const response = await raw<{ data: { token: string } }>({
        method: 'POST',
        url: '/auth/refresh-token',
        data: { refreshToken: userStore.refreshToken },
        signal,
      })
      const token = response.data.data.token
      userStore.setToken(token)
      return token
    },
    reauthenticate: async () => {
      await reLoginDialog.open()
      return userStore.token
    },
    isAuthRequest: config => config.url?.startsWith('/auth/') === true,
  },
})
```

并发请求共享同一次刷新或重新登录。401 请求最多自动重放一次；`raw` 会自动
设置 `skipAuth` 并关闭重试、缓存去重和取消跟踪，防止刷新接口递归。

单次请求也可显式使用 `skipAuth: true`。

## Vue 接入

```ts
// main.ts
import { createRequestPlugin } from '@robot-admin/request-core/vue'
import { request } from '@/services/request'

app.use(createRequestPlugin(request))
```

这只通过 Vue InjectionKey 提供 Client，不写入 `window`，也不修改 Vue 全局类型。
组件仍可通过配置显式传入 Client，适合多后端或多租户应用。

### useRequest

```ts
import { useRequest } from '@robot-admin/request-core/vue'
import { request } from '@/services/request'

const user = useRequest(
  ({ signal }, id: number) => request.get<User>(`/users/${id}`, { signal }),
  { concurrency: 'takeLatest', keepPreviousData: true },
)

await user.run(1)
```

提供 `data/error/loading/run/cancel/reset`，并在 Vue 作用域销毁时自动取消。
取消或重置后，即使业务执行器没有响应 `AbortSignal`，过期结果也不会回写；
`onSuccess/onError` 仅用于观察生命周期，其自身异常不会篡改真实请求结果。

## Headless useTableCrud

```ts
import { useTableCrud } from '@robot-admin/request-core/vue'
import { request } from '@/services/request'

const table = useTableCrud<User, UserFilters, UserSort>({
  client: request,
  autoLoad: 'mounted',
  initialFilters: { keyword: '' },
  query: ({ page, pageSize, filters, sort, signal }) =>
    request.get('/users', {
      params: { page, pageSize, ...filters, sort },
      signal,
      concurrency: 'takeLatest',
    }),
  mutations: {
    create: (row, { signal }) => request.post('/users', row, { signal }),
    update: (row, { signal }) =>
      request.put(`/users/${row.id}`, row, { signal }),
    remove: (row, { signal }) =>
      request.delete(`/users/${row.id}`, { signal }),
  },
  createNewRow: () => ({ id: 0, name: '' }),
})

await table.search({ keyword: 'robot' })
await table.resetSearch()
```

主要返回值：

| 状态/方法 | 说明 |
| --- | --- |
| `rows`, `total`, `error`, `lastUpdated` | 数据与错误状态 |
| `loading`, `isInitialLoading`, `isRefreshing` | 查询状态 |
| `creating`, `updating`, `removing` | 独立变更状态 |
| `filters`, `sort`, `page`, `pagination` | 查询条件与分页 |
| `refresh/reload/search/resetSearch/setSort` | 查询操作 |
| `create/save/remove/batchRemove/getDetail` | CRUD 操作 |
| `createDraft/cancel/dispose` | 草稿和生命周期 |

刷新采用 latest-wins，旧响应不会覆盖新数据；批量删除默认最多并发 4 个请求；
关闭删除后刷新时会同步维护本地行和总数；组件作用域销毁会终止未完成任务。
Message 适配器属于呈现观察层，其异常不会改变 CRUD 请求结果。

### Naive UI 兼容层

```ts
import { useNaiveTableCrud } from '@robot-admin/request-core/naive'

const table = useNaiveTableCrud({
  client: request,
  query: context => userApi.list(context),
  columns,
})
```

`useNaiveTableCrud` 只注入 Naive UI 的 Message/Dialog，数据能力与 `/vue` 完全
共用。Element Plus 项目直接使用 `/vue`，在真实业务需要前无需额外 UI 适配包。

## 兼容 API

`createRequestCore()`、`getData()`、`postData()`、`putData()`、`patchData()`、
`deleteData()` 继续可用。需要让这些全局兼容函数指向新 Client 时：

```ts
const request = createRequestClient({ setAsDefault: true })
```

或者调用 `setDefaultRequestClient(request)`。全局兼容入口只保存“默认 Client”引用；
请求运行状态仍属于具体实例。

## 从 0.2.x 升级

1. 请求代码改从 `/axios` 导入，新代码优先使用 `createRequestClient()`。
2. Vue 应用通过 `/vue` 的 `createRequestPlugin()` 注入 Client。
3. Headless CRUD 从 `/vue` 导入；需要现有 Naive 消息行为时使用
   `/naive` 的 `useNaiveTableCrud()`。
4. 根入口和 `/crud` 暂时兼容，`/crud` 已标记废弃。
5. `dedupe: true` 仍表示 take-latest；副作用方法不再隐式启用去重。
6. 缓存、取消和 reLogin 现在按 Axios 实例隔离；多 Client 场景应通过各自控制器
   清理状态。

没有删除 0.2.x 的公开请求方法、配置字段或 Naive CRUD 交互能力。

## 开发与发布验证

```bash
bun run type-check
bun run test
bun run build
bun run check:package
bun run verify
```

`prepublishOnly` 会执行完整 `verify`，包含类型、测试、构建、publint、ESM/CJS
入口、跨入口默认实例和依赖边界检查。

## License

[MIT](./LICENSE)

# @robot-admin/request-core

> 为 Vue 3 打造的企业级请求解决方案：Axios 增强 + 7 大插件 + CRUD Composable

[![npm version](https://img.shields.io/npm/v/@robot-admin/request-core.svg)](https://www.npmjs.com/package/@robot-admin/request-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

## ✨ 核心特性

- 🚀 **开箱即用**：3 步接入，5 分钟实现完整 CRUD
- 🔌 **7 大插件**：缓存、重试、去重、取消、reLogin 等开箱即用
- 📊 **useTableCrud**：配置式表格 CRUD，自动处理分页/搜索/增删改查
- 🎯 **智能适配**：自动兼容不同后端响应格式（字段名、成功码）
- 💪 **类型安全**：完整 TypeScript 支持
- 🎨 **Naive UI 集成**：深度集成 Naive UI 组件

---

## 📦 安装

```bash
npm install @robot-admin/request-core
# 或
bun add @robot-admin/request-core
```

**Peer Dependencies**: `vue@^3.4.0`, `naive-ui@^2.38.0`

---

## 🚀 30 秒快速上手

### 1️⃣ 初始化（main.ts）

```ts
import { createApp } from 'vue'
import { createRequestCore } from '@robot-admin/request-core'

const app = createApp(App)

app.use(createRequestCore({
  request: { baseURL: '/api', timeout: 10000 },
  interceptors: {
    request: (config) => {
      config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`
      return config
    }
  }
}))
```

### 2️⃣ 使用 CRUD（任意组件）

```vue
<script setup lang="ts">
import { useTableCrud } from '@robot-admin/request-core'

const table = useTableCrud({
  api: { list: '/users', get: '/users/:id', create: '/users', update: '/users/:id', remove: '/users/:id' },
  columns: [
    { key: 'id', title: 'ID' },
    { key: 'name', title: '姓名' },
    { key: 'email', title: '邮箱' }
  ]
})
</script>

<template>
  <n-data-table :data="table.data.value" :columns="table.columns.value" :loading="table.loading.value" />
</template>
```

✅ **完成！** 一个完整的带分页、搜索、编辑、删除的数据表格！

---

## 📚 核心 API

### 请求方法

| 方法 | 说明 | 示例 |
|------|------|------|
| `getData(url, config?)` | GET 请求 | `getData('/users')` |
| `postData(url, data, config?)` | POST 请求 | `postData('/users', { name: '张三' })` |
| `putData(url, data, config?)` | PUT 请求 | `putData('/users/1', { name: '李四' })` |
| `deleteData(url, config?)` | DELETE 请求 | `deleteData('/users/1')` |

### useTableCrud 配置

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `api.list` | `string` | ✅ | 列表接口 |
| `api.get` | `string` | - | 详情接口（支持 `:id`） |
| `api.create` | `string` | - | 创建接口 |
| `api.update` | `string` | - | 更新接口（支持 `:id`） |
| `api.remove` | `string` | - | 删除接口（支持 `:id`） |
| `columns` | `TableColumn[]` | ✅ | 表格列配置 |
| `customActions` | `CustomAction[]` | - | 自定义操作按钮 |
| `idKey` | `string` | - | ID 字段名（默认 `'id'`） |
| `defaultPageSize` | `number` | - | 每页条数（默认 `10`） |
| `autoLoad` | `boolean` | - | 自动加载（默认 `true`） |

### useTableCrud 返回值

| 属性/方法 | 类型 | 说明 |
|-----------|------|------|
| `data` | `Ref<T[]>` | 表格数据 |
| `loading` | `Ref<boolean>` | 加载状态 |
| `total` | `Ref<number>` | 总条数 |
| `pagination` | `object` | 分页配置（Naive UI 格式） |
| `columns` | `Ref<DataTableColumn[]>` | 表格列（含操作列） |
| `search()` | `() => Promise<void>` | 搜索 |
| `resetSearch()` | `() => void` | 重置搜索 |
| `refresh()` | `() => Promise<void>` | 刷新数据 |
| `viewDetail(row)` | `(row: T) => void` | 查看详情 |
| `handleEdit(row)` | `(row: T) => void` | 编辑 |
| `handleDelete(row)` | `(row: T) => void` | 删除 |

---

## 🔌 插件系统

所有请求方法都支持插件配置：

### 缓存插件（仅 GET）

```ts
getData('/users', {
  cache: { 
    enabled: true,      // 启用缓存
    ttl: 300000,       // 5 分钟过期
    forceUpdate: false // 不强制更新
  }
})
```

### 重试插件

```ts
postData('/submit', data, {
  retry: {
    enabled: true,          // 启用重试
    count: 3,               // 最多重试 3 次
    delay: 1000,            // 重试延迟 1 秒
    exponentialBackoff: true // 指数退避（1s, 2s, 4s）
  }
})
```

### 去重插件

```ts
getData('/users', {
  dedupe: { 
    enabled: true,  // 启用去重（默认启用）
    keyGenerator: (config) => `${config.method}-${config.url}` // 自定义去重 key
  }
})
```

### 取消插件

```ts
getData('/users', {
  cancel: { 
    enabled: true,  // 启用自动取消（路由切换时）
    whitelist: []   // 白名单接口（不取消）
  }
})
```

### reLogin 插件

自动管理重新登录场景，多个请求等待登录完成后自动重试：

```ts
import { onReLoginSuccess } from '@robot-admin/request-core'

// 在登录成功后调用
onReLoginSuccess()  // 通知所有等待的请求继续
```

---

## 🎯 完整示例

### 场景 1：完整的数据表格（分页 + 搜索 + CRUD）

```vue
<script setup lang="ts">
import { useTableCrud } from '@robot-admin/request-core'

interface User {
  id: number
  name: string
  email: string
  role: string
}

const table = useTableCrud<User>({
  api: {
    list: '/api/users/list',
    get: '/api/users/:id',
    create: '/api/users',
    update: '/api/users/:id',
    remove: '/api/users/:id'
  },
  columns: [
    { key: 'id', title: 'ID', width: 80 },
    { key: 'name', title: '姓名', width: 120 },
    { key: 'email', title: '邮箱', width: 200 },
    { key: 'role', title: '角色', width: 100 }
  ],
  customActions: [
    {
      key: 'resetPassword',
      label: '重置密码',
      icon: 'mdi:lock-reset',
      handler: async (row, ctx) => {
        await postData(`/api/users/${row.id}/reset-password`, {})
        ctx.message.success('密码已重置')
      }
    }
  ]
})
</script>

<template>
  <n-space vertical>
    <!-- 搜索栏 -->
    <n-space>
      <n-input v-model:value="table.searchKeyword.value" placeholder="搜索用户..." />
      <n-button type="primary" @click="table.search()">搜索</n-button>
      <n-button @click="table.resetSearch()">重置</n-button>
      <n-button type="success" @click="table.handleCreate()">新增用户</n-button>
    </n-space>

    <!-- 表格 -->
    <n-data-table
      :data="table.data.value"
      :columns="table.columns.value"
      :loading="table.loading.value"
      :pagination="table.pagination"
    />
  </n-space>
</template>
```

### 场景 2：自定义请求（带插件）

```ts
import { getData, postData } from '@robot-admin/request-core'

// 带缓存的 GET 请求
const users = await getData('/api/users', {
  cache: { enabled: true, ttl: 300000 }  // 缓存 5 分钟
})

// 带重试的 POST 请求
const result = await postData('/api/submit', { data: 'test' }, {
  retry: { enabled: true, count: 3 }
})
```

---

## ⚙️ 高级配置

### 适配不同后端响应格式

#### 1. 自定义成功状态码

如果后端返回的成功码不是 `0` 或 `200`：

```ts
createRequestCore({
  request: { baseURL: '/api' },
  successCodes: [1, '1', 'success'],  // 自定义成功码
  interceptors: {
    response: (response) => {
      const { code } = response.data
      if (![1, '1', 'success'].includes(code)) {
        throw new Error(response.data.message)
      }
      return response
    }
  }
})
```

#### 2. 自定义字段名映射

如果后端返回的字段名不标准（如 `items` 而非 `list`）：

```ts
createRequestCore({
  request: { baseURL: '/api' },
  fieldAliases: {
    data: ['result', 'data'],           // 数据层字段
    list: ['items', 'records', 'list'], // 列表字段
    total: ['totalCount', 'total']      // 总数字段
  }
})
```

#### 3. 单个接口特殊处理

```ts
useTableCrud({
  api: { list: '/special/api' },
  extractListData: (response) => ({
    items: response.result?.data || [],
    total: response.result?.count || 0
  })
})
```

---

## 💡 最佳实践

### ✅ 推荐做法

1. **统一初始化配置**
   ```ts
   // src/plugins/request-core.ts
   export function setupRequestCore(app: App) {
     app.use(createRequestCore({ /* 统一配置 */ }))
   }
   ```

2. **使用 composable 封装业务逻辑**
   ```ts
   // composables/useUsers.ts
   export function useUsers() {
     return useTableCrud<User>({
       api: { /* ... */ },
       columns: [ /* ... */ ]
     })
   }
   ```

3. **开启缓存减少重复请求**
   ```ts
   getData('/api/config', { cache: { enabled: true, ttl: 600000 } })
   ```

4. **重要接口启用重试**
   ```ts
   postData('/api/payment', data, { retry: { enabled: true, count: 3 } })
   ```

### ❌ 避免的做法

1. ❌ 不要在每个组件中重复配置 axios
2. ❌ 不要禁用去重插件（除非有特殊需求）
3. ❌ 不要在 useTableCrud 外部调用其内部方法

---

## 📖 完整类型定义

```ts
// 核心配置
export type RequestCoreConfig = {
  request: AxiosRequestConfig          // Axios 基础配置
  successCodes?: (string | number)[]   // 成功状态码
  fieldAliases?: FieldAliases          // 字段映射
  interceptors?: InterceptorConfig     // 拦截器
}

// CRUD 配置
export type UseTableCrudConfig<T> = {
  api: ApiEndpoints                    // API 端点
  columns: TableColumn[]               // 表格列
  customActions?: CustomAction[]       // 自定义操作
  idKey?: string                       // ID 字段名
  defaultPageSize?: number             // 默认分页大小
  autoLoad?: boolean                   // 是否自动加载
  extractListData?: (res: any) => { items: T[]; total: number }
}

// 插件配置
export type EnhancedAxiosRequestConfig = AxiosRequestConfig & {
  cache?: CacheConfig                  // 缓存配置
  retry?: RetryConfig                  // 重试配置
  dedupe?: DedupeConfig                // 去重配置
  cancel?: CancelConfig                // 取消配置
}
```

查看完整类型定义：[src/index.ts](./src/index.ts)

---

## 🛠️ 开发

```bash
bun install       # 安装依赖
bun run dev       # 开发模式（watch）
bun run build     # 构建
bun run type-check # 类型检查
```

---

## 📄 License

MIT © [ChenYu](https://github.com/ChenyCHENYU)


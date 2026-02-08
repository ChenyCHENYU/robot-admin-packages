# @robot-admin/request-core

> 统一请求核心库：Axios 封装（7 个插件）+ useTableCrud Composable

[![npm version](https://img.shields.io/npm/v/@robot-admin/request-core.svg)](https://www.npmjs.com/package/@robot-admin/request-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**[English](#english) | [中文文档](#中文文档)**

---

## 中文文档

### ✨ 核心功能

#### 1. Axios 封装（7 个内置插件）

- **cache**: 请求缓存（内存缓存，支持 TTL）
- **retry**: 请求重试（指数退避）
- **dedupe**: 请求去重（基于 AbortController）
- **cancel**: 自动取消（路由切换时）
- **request**: 通用请求逻辑（reLogin 管理）
- **response**: 通用响应逻辑（预留）
- **reLogin**: 重新登录管理（Promise 队列）

#### 2. useTableCrud Composable

- 配置驱动的表格 CRUD 解决方案
- 支持分页、搜索、排序、自定义操作
- 内置详情查看、编辑、删除等功能

### 📦 安装

```bash
npm install @robot-admin/request-core
# 或
bun add @robot-admin/request-core
# 或
pnpm add @robot-admin/request-core
```

### 🚀 快速开始

#### 1. 初始化 Request Core

```ts
// main.ts
import { createApp } from "vue";
import { createRequestCore, onReLoginSuccess } from "@robot-admin/request-core";
import { useUserStore } from "@/stores/user";

const app = createApp(App);

const requestCore = createRequestCore({
  request: {
    baseURL: import.meta.env.VITE_API_BASE,
    timeout: 10000,
  },

  // 🎯 配置成功状态码（适配不同后端约定）
  // 默认: [200, 0, '200', '0']
  // successCodes: [1, '1', 'success'],  // 示例：自定义成功码

  // 🎯 配置字段别名（适配不同后端响应格式）
  // fieldAliases: {
  //   data: ['data', 'result', 'payload'],      // 数据层字段
  //   list: ['list', 'items', 'records'],       // 列表字段
  //   total: ['total', 'totalCount', 'count'],  // 总数字段
  // },

  interceptors: {
    // 请求拦截：注入 token
    request: (config) => {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    // 响应拦截：处理业务码
    response: (response) => {
      const { code, message } = response.data;
      if (code !== 200) {
        window.$message?.error(message || "请求失败");
        return Promise.reject(new Error(message));
      }
      return response;
    },
    // 响应错误拦截：处理 401
    responseError: async (error) => {
      if (error.response?.status === 401) {
        const userStore = useUserStore();
        await userStore.reLogin();
        onReLoginSuccess(); // 通知所有等待的请求继续
        return Promise.reject(error);
      }
      return Promise.reject(error);
    },
  },
});

app.use(requestCore);
```

#### 🎯 高级配置：适配不同的后端接口

##### 场景 1：后端返回的成功码不是 `0` 或 `200`

如果你的后端 API 返回的成功码是 `1`、`'success'` 或其他值，可以通过 `successCodes` 配置：

```ts
const requestCore = createRequestCore({
  request: { baseURL: "/api" },

  // 配置成功状态码
  successCodes: [1, "1", "success"], // 支持数字和字符串

  interceptors: {
    response: (response) => {
      const { code, message } = response.data;
      // 自动判断 code 是否在 successCodes 中
      if (![1, "1", "success"].includes(code)) {
        window.$message?.error(message || "请求失败");
        return Promise.reject(new Error(message));
      }
      return response;
    },
  },
});
```

##### 场景 2：后端返回的字段名不标准

如果你的后端 API 返回的字段名不是 `list`、`total`，可以通过 `fieldAliases` 配置：

```ts
// 示例：后端返回格式
// {
//   code: 0,
//   result: {
//     employees: [...],      // 列表字段叫 employees
//     totalRecords: 100      // 总数字段叫 totalRecords
//   }
// }

const requestCore = createRequestCore({
  request: { baseURL: "/api" },

  // 配置字段别名
  fieldAliases: {
    data: ["result", "data", "payload"],          // 数据层字段（按优先级）
    list: ["employees", "items", "list"],         // 列表字段（按优先级）
    total: ["totalRecords", "total", "count"],    // 总数字段（按优先级）
  },

  interceptors: { /* ... */ },
});

// 现在 useTableCrud 会自动识别这些字段，无需手动配置 extractListData！
const table = useTableCrud({
  api: { list: "/employees/list" },  // ✅ 自动适配
  columns: [...],
});
```

##### 场景 3：单个接口特殊格式（临时覆盖）

如果只是某个特殊接口格式不同，可以在配置中单独处理：

```ts
const table = useTableCrud({
  api: { list: "/special/api" },
  columns: [...],

  // 针对特殊接口的自定义提取逻辑
  extractListData: (response: any) => {
    return {
      items: response.result?.specialList || [],
      total: response.result?.specialCount || 0,
    };
  },
});
```

#### 2. 使用 useTableCrud

```vue
<script setup lang="ts">
import { useTableCrud } from "@robot-admin/request-core";

interface Employee {
  id: number;
  name: string;
  age: number;
  department: string;
}

const table = useTableCrud<Employee>({
  api: {
    list: "/api/employees/list",
    get: "/api/employees/:id",
    update: "/api/employees/:id",
    remove: "/api/employees/:id",
    create: "/api/employees",
  },
  columns: [
    { key: "id", title: "ID", width: 80 },
    { key: "name", title: "姓名", width: 120 },
    { key: "age", title: "年龄", width: 80 },
    { key: "department", title: "部门", width: 150 },
  ],
  customActions: [
    {
      key: "export",
      label: "导出",
      icon: "mdi:download",
      handler: (row, ctx) => {
        console.log("导出", row);
        ctx.message.success("导出成功");
      },
    },
  ],
});
</script>

<template>
  <div>
    <!-- 搜索栏 -->
    <n-space>
      <n-input
        v-model:value="table.searchKeyword.value"
        placeholder="搜索..."
      />
      <n-button @click="table.search()">搜索</n-button>
      <n-button @click="table.resetSearch()">重置</n-button>
    </n-space>

    <!-- 表格 -->
    <n-data-table
      ref="table.tableRef.value"
      :data="table.data.value"
      :columns="table.columns.value"
      :loading="table.loading.value"
      :pagination="table.pagination"
    />
  </div>
</template>
```

#### 3. 使用插件配置

```ts
import { getData, postData } from "@robot-admin/request-core";

// 1. 开启缓存（5 分钟）
const users = await getData("/api/users", {
  cache: { enabled: true, ttl: 300000 },
});

// 2. 开启重试（3 次，指数退避）
const data = await postData(
  "/api/submit",
  { name: "张三" },
  {
    retry: { enabled: true, count: 3, exponentialBackoff: true },
  },
);

// 3. 禁用去重
const data = await getData("/api/timestamp", {
  dedupe: { enabled: false },
});

// 4. 白名单（不自动取消）
const data = await getData("/api/important", {
  cancel: { enabled: false },
});
```

### 📖 API 文档

#### createRequestCore(config)

创建 Request Core 实例。

**参数:**

- `config.request` - Axios 基础配置（baseURL, timeout, headers 等）
- `config.successCodes` - 成功状态码配置（默认: `[200, 0, '200', '0']`）
- `config.fieldAliases` - 字段别名配置（用于适配不同的后端响应格式）
  - `data` - 数据层字段别名（默认: `['data', 'list', 'items', 'records']`）
  - `list` - 列表字段别名（默认: `['list', 'items', 'records', 'rows', 'data']`）
  - `total` - 总数字段别名（默认: `['total', 'totalCount', 'count', 'totalElements']`）
- `config.interceptors` - 拦截器配置
  - `request` - 请求拦截器
  - `requestError` - 请求错误拦截器
  - `response` - 响应拦截器
  - `responseError` - 响应错误拦截器

**返回:**

- `install(app)` - Vue 插件安装方法
- `axiosInstance` - Axios 实例

#### useTableCrud\<T\>(config)

创建表格 CRUD 实例。

**参数:**

- `api` - API 端点配置（list, get, create, update, remove）
- `columns` - 表格列配置
- `customActions` - 自定义操作按钮
- `idKey` - ID 字段名（默认 'id'）
- `defaultPageSize` - 默认分页大小（默认 10）
- `autoLoad` - 是否自动加载（默认 true）

**返回对象包含:**

- `data` - 表格数据
- `loading` - 加载状态
- `total` - 总数
- `pagination` - 分页配置
- `search()` - 搜索方法
- `resetSearch()` - 重置搜索
- `refresh()` - 刷新数据
- `viewDetail(row)` - 查看详情
- `handleEdit(row)` - 编辑
- `handleDelete(row)` - 删除

### 🔌 插件配置

所有请求方法（`getData`, `postData`, `putData`, `deleteData`）都支持以下插件配置：

| 插件       | 配置项                                            | 说明               |
| ---------- | ------------------------------------------------- | ------------------ |
| **cache**  | `enabled`, `ttl`, `forceUpdate`                   | 请求缓存（仅 GET） |
| **retry**  | `enabled`, `count`, `delay`, `exponentialBackoff` | 请求重试           |
| **dedupe** | `enabled`, `keyGenerator`                         | 请求去重           |
| **cancel** | `enabled`, `whitelist`                            | 自动取消           |

### 📝 类型导出

```ts
// 核心类型
export type {
  RequestCoreConfig,
  InterceptorConfig,
  EnhancedAxiosRequestConfig,

  // CRUD 类型
  UseTableCrudConfig,
  UseTableCrudReturn,
  DataRecord,
  ApiEndpoints,
  TableColumn,
  CustomAction,
  DetailConfig,

  // 插件类型
  CacheConfig,
  RetryConfig,
  DedupeConfig,
  CancelConfig,
};
```

### 🛠️ 开发

```bash
# 安装依赖
bun install

# 开发模式（watch）
bun run dev

# 构建
bun run build

# 类型检查
bun run type-check
```

### 📄 License

MIT © [ChenYu](mailto:ycyplus@gmail.com)

---

## English

### ✨ Features

#### 1. Axios with 7 Built-in Plugins

- **cache**: Request caching (in-memory with TTL support)
- **retry**: Request retry (exponential backoff)
- **dedupe**: Request deduplication (AbortController-based)
- **cancel**: Auto-cancel on route change
- **request**: Common request logic (reLogin management)
- **response**: Common response logic (reserved for user config)
- **reLogin**: Re-login management (Promise queue)

#### 2. useTableCrud Composable

- Configuration-driven table CRUD solution
- Supports pagination, search, sort, custom actions
- Built-in detail view, edit, delete features

### 📦 Installation

```bash
npm install @robot-admin/request-core
```

### 🚀 Quick Start

See Chinese documentation above for detailed usage examples.

### 📝 Type Exports

All TypeScript types are fully exported. See the types section in Chinese docs.

### 📄 License

MIT © [ChenYu](mailto:ycyplus@gmail.com)

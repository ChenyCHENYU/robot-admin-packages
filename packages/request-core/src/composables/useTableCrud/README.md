# useTableCrud

> 配置驱动的表格 CRUD 组合式 API，极简使用，功能完整

## 🎯 设计目标

- ✅ **配置驱动**: 一个配置对象搞定所有表格需求
- ✅ **零样板代码**: 无需工厂函数、适配器、类型体操
- ✅ **扁平化返回**: 直接解构使用，无需多层嵌套
- ✅ **完整功能**: CRUD、分页、编辑、详情、自定义操作一应俱全
- ✅ **类型安全**: 完整的 TypeScript 支持

## 📦 安装使用

```typescript
import { useTableCrud } from '@robot-admin/request-core/crud'
```

## 🚀 快速开始

### 基础用法

```typescript
const table = useTableCrud<Employee>({
  // API 配置
  api: {
    list: '/employees/list',
    get: '/employees/:id',
    create: '/employees',
    update: '/employees/:id',
    remove: '/employees/:id',
  },

  // 列配置
  columns: [
    {
      key: 'name',
      title: '姓名',
      editable: true,
      editType: 'input',
    },
    {
      key: 'email',
      title: '邮箱',
      editable: true,
      editType: 'email',
    },
  ],

  // 自定义操作
  customActions: [
    {
      key: 'copy',
      label: '复制',
      icon: 'mdi:content-copy',
      handler: (row, ctx) => {
        const newRow = { ...row, id: Date.now() }
        ctx.data.unshift(newRow)
        ctx.message.success('复制成功')
      },
    },
  ],
})

// 自动加载数据（默认 autoLoad: true）
// 如需禁用自动加载：autoLoad: false
```

### 模板使用

```vue
<template>
  <c-table
    v-model:data="table.data.value"
    :columns="table.columns.value"
    :loading="table.loading.value"
    :actions="table.actions.value"
    :pagination="table.pagination.value"
    @save="table.save"
    @cancel="table.handleCancel"
    @pagination-change="table.handlePaginationChange"
  />
</template>
```

## 📚 API 文档

### ApiEndpoints 配置

| 字段          | 类型     | 必填 | 说明                               |
| ------------- | -------- | ---- | ---------------------------------- |
| `list`        | `string` | ✅   | 列表查询接口                       |
| `get`         | `string` | ❌   | 详情查询接口（支持 `:id` 占位符）  |
| `create`      | `string` | ❌   | 新增接口                           |
| `update`      | `string` | ❌   | 更新接口（支持 `:id` 占位符）      |
| `remove`      | `string` | ❌   | 删除接口（支持 `:id` 占位符）      |
| `batchRemove` | `string` | ❌   | 批量删除接口（可选，用于优化性能） |

**示例**：
```typescript
api: {
  list: '/employees/list',      // GET /employees/list?page=1&pageSize=10
  get: '/employees/:id',        // GET /employees/123
  create: '/employees',         // POST /employees
  update: '/employees/:id',     // PUT /employees/123
  remove: '/employees/:id',     // DELETE /employees/123
  batchRemove: '/employees/batch', // POST /employees/batch { ids: [1,2,3] }
}
```

### 配置选项

| 参数                       | 类型                             | 必填 | 默认值 | 说明                           |
| -------------------------- | -------------------------------- | ---- | ------ | ------------------------------ |
| `api`                      | `ApiEndpoints`                   | ✅   | -      | API 端点配置                   |
| `columns`                  | `TableColumn[]`                  | ✅   | -      | 表格列配置                     |
| `customActions`            | `CustomAction[]`                 | ❌   | `[]`   | 自定义操作按钮                 |
| `detail`                   | `DetailConfig`                   | ❌   | -      | 详情弹窗配置                   |
| `idKey`                    | `string`                         | ❌   | `'id'` | ID 字段名                      |
| `defaultPageSize`          | `number`                         | ❌   | `10`   | 默认分页大小                   |
| `defaultPaginationEnabled` | `boolean`                        | ❌   | `true` | 是否启用分页（默认传分页参数） |
| `autoLoad`                 | `boolean`                        | ❌   | `true` | 是否自动加载数据               |
| `createNewRow`             | `() => T`                        | ❌   | -      | 创建新行的工厂函数             |
| `extractListData`          | `(res: any) => { items, total }` | ❌   | -      | 自定义列表数据提取             |

#### 💡 分页最佳实践

**默认行为**（推荐）：

```typescript
// ✅ 默认传分页参数 page=1&pageSize=10
const table = useTableCrud({
  api: { list: '/employees/list' },
  columns: [...],
  // 无需配置，默认就传分页
})
```

**禁用分页**（特殊场景）：

```typescript
// ❌ 仅在接口不支持分页时使用
const table = useTableCrud({
  api: { list: '/employees/list' },
  columns: [...],
  defaultPaginationEnabled: false, // 不传分页参数
})
```

#### 🔧 配置作用域（重要）

**每个 useTableCrud 实例独立配置**，互不影响：

```typescript
// 场景：同一页面多个表格
const mainTable = useTableCrud({
  api: { list: '/employees/list' },    // ← 传分页
  columns: [...],
  defaultPageSize: 20,                  // ← 独立配置
})

const subTable = useTableCrud({
  api: { list: '/departments/all' },   // ← 不传分页
  columns: [...],
  defaultPaginationEnabled: false,     // ← 只影响这个实例
})

// ✅ mainTable: /employees/list?page=1&pageSize=20
// ✅ subTable:  /departments/all（无分页参数）
```

**分页配置只影响 `api.list`**，其他接口不受影响：
```typescript
// ✅ 正确理解
defaultPaginationEnabled: false  
// → 只影响 api.list，不传分页参数
// → api.get/create/update/remove 本来就不传分页
```

#### 🚀 自动加载说明

**默认自动加载**（推荐）：
```typescript
const table = useTableCrud({ 
  api: { list: '/employees/list' },
  columns: [...],
  // autoLoad: true（默认）→ 初始化时自动调用 refresh()
})

// 无需 onMounted(() => table.refresh())
```

**禁用自动加载**（手动控制）：
```typescript
const table = useTableCrud({ 
  api: { list: '/employees/list' },
  columns: [...],
  autoLoad: false, // 不自动加载
})

// 手动触发
onMounted(() => {
  if (someCondition) {
    table.refresh()
  }
})
```

### 返回值

#### 数据状态

- `data` - 表格数据
- `loading` - 加载状态
- `total` - 数据总数

#### 表格配置

- `columns` - 表格列配置
- `actions` - 操作按钮配置
- `tableRef` - 表格引用

#### 分页

- `page` - 分页状态 `{ current, size }`
- `paginationEnabled` - 分页启用状态
- `pagination` - 分页配置

#### 核心方法

- `refresh()` - 刷新数据
- `create(row)` - 新增数据
- `save(row)` - 更新数据
- `remove(row)` - 删除单条数据
- `batchRemove(rows)` - 批量删除数据
- `getDetail(row)` - 获取详情

#### 新增数据示例

```typescript
// 方式1：通过自定义按钮 + 表单模态框新增（推荐）
const handleAdd = () => {
  // 1. 打开表单模态框
  // 2. 用户填写完整信息
  // 3. 点击保存
  const newEmployee = {
    id: Date.now(), // 临时ID（后端会返回真实ID）
    name: '张三',
    email: 'zhangsan@example.com',
    // ...其他字段
  }
  
  // 调用 create 方法
  await table.create(newEmployee)
  // 自动刷新列表，新数据出现
}

// 方式2：使用 createNewRow 工厂函数生成默认值
import { createNewEmployee } from './data'

const newEmployee = createNewEmployee() // 生成带默认值的新数据
await table.create(newEmployee)
```

**重要说明**：
- ❌ **不要**直接插入行到 `table.data.value`（这是伪代码逻辑）
- ✅ **应该**通过表单收集数据后调用 `table.create()`
- ✅ 新增成功后会自动调用 `refresh()` 刷新列表

#### 批量操作示例

```typescript
// API 配置（可选批量接口）
api: {
  remove: '/employees/:id',
  batchRemove: '/employees/batch', // 可选
}

// 使用批量删除
await table.batchRemove(selectedRows)

// 逻辑：
// - 有 batchRemove 接口 → 调用批量接口
// - 没有 → 用 Promise.all 并发调用单删接口
```

#### 事件处理

- `handleCancel()` - 处理取消编辑
- `handlePaginationChange(page, size)` - 处理分页变化
- `handleRowDelete(row, index)` - 处理行删除

#### 详情弹窗

- `detail` - 详情弹窗状态
- `detailConfig` - 详情配置

## 🎨 完整示例

```typescript
// data.ts - 配置文件
import type { UseTableCrudConfig } from '@robot-admin/request-core/crud'

interface Employee {
  id: number
  name: string
  email: string
  department: string
}

export const employeeTableConfig: UseTableCrudConfig<Employee> = {
  // API 配置
  api: {
    list: '/employees/list',
    get: '/employees/:id',
    create: '/employees',
    update: '/employees/:id',
    remove: '/employees/:id',
    batchRemove: '/employees/batch', // 可选：批量删除
  },

  // 列配置
  columns: [
    { key: 'name', title: '姓名', editable: true, editType: 'input' },
    { key: 'email', title: '邮箱', editable: true, editType: 'email' },
    { key: 'department', title: '部门', editable: true, editType: 'select' },
  ],

  // 自定义操作
  customActions: [
    {
      key: 'export',
      label: '导出',
      icon: 'mdi:download',
      handler: async (row, ctx) => {
        // 导出逻辑
        ctx.message.success(`导出 ${row.name} 的数据`)
      },
    },
  ],

  // 可选配置
  idKey: 'id',
  createNewRow: () => ({
    id: Date.now(),
    name: '',
    email: '',
    department: '',
  }),
}
```

```vue
<!-- index.vue - 使用组件 -->
<script setup lang="ts">
import { useTableCrud } from '@robot-admin/request-core/crud'
import { employeeTableConfig } from './data'

// 初始化（自动加载数据）
const table = useTableCrud(employeeTableConfig)

// 批量删除示例
const selectedRows = ref<Employee[]>([])
const handleBatchDelete = async () => {
  await table.batchRemove(selectedRows.value)
  selectedRows.value = []
}
</script>

<template>
  <c-table
    v-model:data="table.data.value"
    v-model:selected="selectedRows"
    :columns="table.columns.value"
    :loading="table.loading.value"
    :actions="table.actions.value"
    :pagination="table.pagination.value"
    @save="table.save"
    @pagination-change="table.handlePaginationChange"
  />
  
  <NButton 
    v-if="selectedRows.length" 
    @click="handleBatchDelete"
  >
    批量删除 ({{ selectedRows.length }})
  </NButton>
</template>
```

更多示例：[Robot_Admin 表格演示](https://github.com/ChenyCHENYU/Robot_Admin/tree/main/src/views/demo/10-table)

## ❓ 常见问题

### 1. 为什么数据不显示？

**检查清单**：
- ✅ 接口是否正确返回数据？
- ✅ 响应格式是否支持？（支持 6+ 种格式，见下方）
- ✅ 是否传递了正确的分页参数？

**支持的响应格式**：
```typescript
// 格式 1：嵌套结构（最常见）
{ code: 0, data: { list: [...], total: 10 } }

// 格式 2：data + items
{ data: { items: [...], total: 10 } }

// 格式 3：扁平结构
{ list: [...], total: 10 }

// 格式 4：不同字段名
{ items: [...], totalCount: 10 }

// 格式 5：直接数组
{ data: [...] }

// 格式 6：纯数组
[...]
```

### 2. 批量删除如何实现？

```typescript
// 方式 1：有专门的批量接口（推荐）
api: {
  remove: '/employees/:id',
  batchRemove: '/employees/batch', // POST { ids: [1,2,3] }
}

// 方式 2：没有批量接口（自动并发调用）
api: {
  remove: '/employees/:id',
  // 不配置 batchRemove
  // 调用 batchRemove 时会用 Promise.all 并发删除
}

// 使用
await table.batchRemove(selectedRows)
```

### 3. 如何实现新增功能？

**推荐方式**：通过自定义按钮 + 表单模态框

```vue
<template>
  <!-- 新增按钮 -->
  <NButton @click="showAddModal = true">
    新增员工
  </NButton>

  <!-- 表格 -->
  <c-table v-model:data="table.data.value" ... />

  <!-- 新增表单模态框 -->
  <NModal v-model:show="showAddModal" title="新增员工">
    <NForm ref="formRef" :model="formData">
      <NFormItem label="姓名" path="name">
        <NInput v-model:value="formData.name" />
      </NFormItem>
      <!-- 其他表单项... -->
    </NForm>
    <template #footer>
      <NButton @click="handleSubmit">保存</NButton>
    </template>
  </NModal>
</template>

<script setup>
const table = useTableCrud({ api: {...}, columns: [...] })
const showAddModal = ref(false)
const formData = ref({})

const handleSubmit = async () => {
  await table.create(formData.value) // 调用 create 方法
  showAddModal.value = false
  // 自动刷新列表，新数据出现
}
</script>
```

**小技巧**：使用 `createNewRow` 配置生成默认值
```typescript
// data.ts
export const createNewEmployee = () => ({
  id: Date.now(),
  name: '',
  email: '',
  // ...默认值
})

// 使用
formData.value = createNewEmployee()
```

### 4. 多个表格如何配置？

每个 `useTableCrud` 实例**完全独立**：

```typescript
// 主表格：带分页
const mainTable = useTableCrud({
  api: { list: '/employees/list' },
  columns: [...],
  defaultPageSize: 20, // 独立配置
})

// 子表格：不分页
const subTable = useTableCrud({
  api: { list: '/departments/all' },
  columns: [...],
  defaultPaginationEnabled: false, // 只影响这个实例
})
```

### 5. 如何禁用自动加载？

```typescript
const table = useTableCrud({
  api: { list: '/employees/list' },
  columns: [...],
  autoLoad: false, // 禁用自动加载
})

// 手动控制
onMounted(() => {
  if (someCondition) {
    table.refresh()
  }
})
```

### 6. 如何自定义数据提取？

```typescript
const table = useTableCrud({
  api: { list: '/employees/list' },
  columns: [...],
  // 自定义提取逻辑（适用于特殊格式）
  extractListData: (response) => {
    return {
      items: response.result.employeeList,
      total: response.result.count,
    }
  },
})
```

## 🔄 对比 usePageCrud

| 特性       | usePageCrud   | useTableCrud |
| ---------- | ------------- | ------------ |
| 适用场景   | 通用 CRUD     | 专注表格     |
| 配置方式   | 分散配置      | 统一配置     |
| 使用复杂度 | 需要适配器    | 开箱即用     |
| 代码量     | 多个工厂函数  | 一行搞定     |
| 类型体操   | 需要定义 Deps | 自动推导     |

## 📝 设计历史

### 初始版本（2026-02-06）

- ✨ 初始版本
- ✨ 完整替代 usePageCrud
- ✨ 支持所有表格场景

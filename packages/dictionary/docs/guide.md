[← @robot-admin/dictionary](../README.md)

# 接入与场景指南

按 **接入一次 → 选择页面场景 → 按需处理错误与生命周期** 阅读。RobotAdmin 已完成第一部分，直接看[项目用法](https://github.com/ChenyCHENYU/Robot_Admin/blob/main/docs/dictionaries.md)。

| 要做什么                          | 去哪里                                      |
| --------------------------------- | ------------------------------------------- |
| 接后台接口、提供应用实例          | [接入步骤](#一接入只做一次)                 |
| 下拉、搜索、列表、详情、MachTable | [场景索引](#二接入后按场景使用)             |
| 静态枚举、专属接口、页面覆盖      | [场景六](#场景六静态枚举专属接口和页面覆盖) |
| 无 Vue 的脚本、提示、导出         | [场景七](#场景七脚本提示和导出前准备)       |
| 空字典、失败、重试                | [状态处理](#三空失败与重试)                 |
| 身份切换、失效、销毁、性能        | [维护边界](#四身份切换维护与性能边界)       |

## 一、接入只做一次

### 1. 接口统一返回选项

以下是示例协议，路径换成项目真实接口。字段 `dictionary: "user_status"` 会把 `user_status` 原样传给接口函数：

```json
[
  { "value": "1", "label": "正常" },
  { "value": "0", "label": "停用", "disabled": true }
]
```

在已有 API 模块实现一个函数，所有字典共用：

```ts
// api.ts：示例接口直接返回标准选项数组。
import type { DictionaryLoader } from "@robot-admin/dictionary";

export const getDictionaryOptionsApi: DictionaryLoader = async (
  code,
  { signal },
) => {
  const response = await fetch(
    `/api/dictionaries/${encodeURIComponent(code)}`,
    { signal },
  );
  if (!response.ok) throw new Error("字典暂时不可用，请重试");
  return response.json();
};
```

真实接口若返回 `{ code, data, msg }` 或使用 `dictValue/dictLabel`，只替换上面的 API 函数。下面演示**成功码为数字 0、原码为字符串**的协议；成功码、字段名和编码类型须以真实后台约定为准，两个 API 示例二选一：

```ts
import type { DictionaryLoader } from "@robot-admin/dictionary";

interface DictionaryResponse {
  code: number;
  msg?: string;
  data: { dictValue: string; dictLabel: string; disabled?: boolean }[];
}
export const getDictionaryOptionsApi: DictionaryLoader = async (
  code,
  { signal },
) => {
  const response = await fetch(
    `/api/dictionaries/${encodeURIComponent(code)}`,
    { signal },
  );
  if (!response.ok) throw new Error("字典暂时不可用，请重试");
  const result: DictionaryResponse = await response.json();
  if (result.code !== 0) throw new Error(result.msg || "字典加载失败");
  return result.data.map((item) => ({
    value: item.dictValue,
    label: item.dictLabel,
    disabled: item.disabled,
  }));
};
```

这样业务码检查、解包和映射只做一次，页面代码完全相同。最终返回值须为 `{ value, label, disabled? }[]`；格式错误会进入 `error`，不会冒充空字典。树接口的实际适配可参考 [RobotAdmin 的实现](https://github.com/ChenyCHENYU/Robot_Admin/blob/main/src/api/dictionary-options.ts)。

使用已有请求客户端时保留 `signal`，启用其静默错误模式（如 `silent: true`），由控件就地显示失败与重试；不要 `catch(() => [])`。租户、公司、语言等参数从上下文 `scope` 或现有请求层取得，库不猜测后台协议。

### 2. 应用创建并提供同一个实例

**已使用 Naive UI Components 的 Vue 项目**：把下面代码放在已有的 `createApp` 之后、`mount` 之前。`app` 是现有 Vue 应用，`./api` 是上一步的 API 模块；无需创建字典注册清单。

```ts
import { createDictionaryStore } from "@robot-admin/dictionary";
import { DICTIONARY_PROVIDER_KEY } from "@robot-admin/naive-ui-components/config";
import { getDictionaryOptionsApi } from "./api";

const dictionaries = createDictionaryStore(getDictionaryOptionsApi);
app.provide(DICTIONARY_PROVIDER_KEY, dictionaries);
app.onUnmount(() => dictionaries.destroy());
```

创建 Store、声明字段、调用 `getDictionary()` 均不发请求，消费者启用后才加载。同码共用稳定源、缓存和请求。新增远程类型时只写后台字典码，不新增别名、loader 或 `dictionaries.ts`。

**其他 Vue 或纯 TypeScript 项目**：只需要 `createDictionaryStore(getDictionaryOptionsApi)`；用项目现有服务/依赖注入传递实例。Vue 详情使用公开的 `useDictionaryLabels`，纯脚本见场景七，不必为此引入 Naive UI Components。

不要从 `main.ts` 反向导入实例到组件，也不要在每个页面重新创建应用 Store。应用持有并销毁它；SSR 每个请求创建独立实例。

## 二、接入后按场景使用

下列表单、搜索与 C_Table 片段在组件 `setup` 或其页面组合函数中使用，前提是应用已完成接入。Vue/组件导入按项目自动导入配置取舍；例中的类型导入用于检查字段，不是额外运行时依赖。

### 场景一：表单下拉

```ts
import { ref } from "vue";
import type { FormOption } from "@robot-admin/naive-ui-components/C_Form";

interface UserForm {
  account: string;
}
const model = ref<UserForm>({ account: "1" });
const fields: FormOption<UserForm>[] = [
  {
    prop: "account",
    label: "账户状态",
    type: "select",
    dictionary: "user_status",
  },
];
```

```vue
<C_Form v-model="model" :options="fields" />
```

显示“正常”，`model.account` 仍为字符串 `"1"`。已有 fields 只补 `dictionary`，不要再手写 `options` 加载或 `onMounted` 请求。

多选在字段中配置 `attrs: { multiple: true }`，模型对应字段使用数组；布尔值、零、前导零仍保留原始类型。组件继续负责校验、布局与显式选项优先级。

### 场景二：搜索条件

```ts
import { ref } from "vue";
import type { SearchFormItem } from "@robot-admin/naive-ui-components/C_FormSearch";

interface UserQuery {
  account: string | null;
}
const query = ref<UserQuery>({ account: null });
const searchFields: SearchFormItem<UserQuery>[] = [
  {
    prop: "account",
    label: "账户状态",
    type: "select",
    dictionary: "user_status",
  },
];
```

```vue
<C_FormSearch v-model="query" :form-item-list="searchFields" />
```

选项与表单共享来源，搜索载荷仍使用 `query.account` 的原码。查询触发与序列化继续使用搜索组件现有配置，不把标签写回查询条件。

### 场景三：C_Table 列表

```ts
import { ref } from "vue";
import { defineTableColumns } from "@robot-admin/naive-ui-components/C_Table";

interface UserRow {
  id: string;
  account: string;
}
const rows = ref<UserRow[]>([{ id: "U-1", account: "1" }]);
const columns = defineTableColumns<UserRow>([
  { key: "account", title: "账户状态", dictionary: "user_status" },
]);
```

```vue
<C_Table :data="rows" :columns="columns" row-key="id" />
```

接口完成后更新展示，行对象继续保留 `account: "1"`。普通字典默认文字展示；状态色通过列的 `status` 单独配置，不将所有枚举自动染成状态 Tag。自定义 renderer/formatter 等优先级仍由 C_Table 决定。

### 场景四：详情和弹窗

**RobotAdmin**：`useDictLabels(record, fields)` 自动读取最近 Provider，模板直接使用 `labels.account`。`record` 是响应式记录，`fields` 可以复用场景一已有的表单字段，无需再写翻译映射；不要从本包导入 `useDictLabels`。

**其他 Vue 项目**使用公开 API。下面是已接 NUI Provider 的完整绑定片段；其他 Vue 项目把 `provider` 换成现有服务传入的 Store 即可：

```ts
import { inject, ref } from "vue";
import { DICTIONARY_PROVIDER_KEY } from "@robot-admin/naive-ui-components/config";
import { useDictionaryLabels } from "@robot-admin/dictionary/vue";

const provider = inject(DICTIONARY_PROVIDER_KEY);
if (!provider) throw new Error("请先在应用启动时提供字典实例");
const user = ref<{ account: string } | null>(null);
const visible = ref(false);
const fields = [{ prop: "account", dictionary: "user_status" }] as const;
const { labels, loading, error, reload } = useDictionaryLabels(
  provider,
  user,
  fields,
  { enabled: visible },
);
// 详情接口返回后，调用 showDetail(record)。
function showDetail(record: { account: string }) {
  user.value = record;
  visible.value = true;
}
```

```vue
<NModal
  v-model:show="visible"
  preset="card"
  title="账户详情"
  style="width: min(520px, calc(100vw - 32px))"
>
  <NDescriptions :column="1">
    <NDescriptionsItem label="账户状态">{{ labels.account }}</NDescriptionsItem>
  </NDescriptions>
  <NAlert v-if="error" type="warning">
    字典加载失败。<NButton :loading="loading" @click="reload">重试</NButton>
  </NAlert>
</NModal>
```

这里的 `fields` 仅演示独立详情；已有表单/表格配置时直接复用其 `prop/key/field + dictionary`，非字典字段会忽略。`labels` 是 ref，模板自动解包；脚本中读取 `labels.value.account`。

记录为空或 `enabled: false` 时不解析、不订阅、不加载；关闭保留最后标签供离场动画使用，重开读取当前身份的数据。`reload()` 返回按字典去重的 `allSettled` 结果，一个失败不阻断其他字典。翻译不修改原始记录。

### 场景五：MachTable

MachTable 不读取 C_Table 的 `dictionary` 字段，使用自己的公共列策略。下面的页面组合函数接收**接入步骤创建的同一个 Store**；RobotAdmin 调用时传 `useAppDictionaries()`（从项目 `@/utils/d_dictionaryContext` 导入）。

```ts
import { ref } from "vue";
import type { DictionaryStore } from "@robot-admin/dictionary";
import {
  useDictionary,
  useDictionaryRefresh,
} from "@robot-admin/dictionary/vue";
import { defineVueColumns, useMachTable } from "@agile-team/mach-table-vue";
import { createDictionaryColumn } from "@agile-team/mach-table-vue/business";

export function useAccountGrid(dictionaries: DictionaryStore) {
  const table = useMachTable<{ id: string; account: string }>();
  const rows = ref([{ id: "U-1", account: "1" }]);
  const source = dictionaries.getDictionary("user_status");
  if (!source) throw new Error("字典实例不可用");
  const state = useDictionary(source);
  const columns = defineVueColumns<{ id: string; account: string }>([
    {
      field: "account",
      headerName: "账户状态",
      ...createDictionaryColumn(source, { options: source.getOptions }),
    },
  ]);
  useDictionaryRefresh([source], () => table.api.value?.view.refreshCells());
  async function reload() {
    try {
      await state.reload();
    } catch {
      /* 错误已保存在 state.error，由下面的局部提示呈现。 */
    }
  }
  return { table, rows, columns, state, reload };
}
```

在页面 setup 中调用该组合函数并解构返回值；模板组件 `MachTable` 从 `@agile-team/mach-table-vue` 导入：

```vue
<NAlert v-if="state.error.value" type="warning">
  字典加载失败。<NButton @click="reload">重试</NButton>
</NAlert>
<MachTable
  :ref="table.ref"
  :row-data="rows"
  :column-defs="columns"
  style="height: 260px"
/>
```

`useDictionaryRefresh` 仅在选项快照变化后合并刷新，loading/error 变化不重绘。单元格只做同步 Map 查询，不发请求、不逐单元格订阅。复制与 CSV/XLSX 的原码/标签输出由 MachTable 列策略单独配置。

### 场景六：静态枚举、专属接口和页面覆盖

**应用静态枚举或专属定义**：替换接入步骤中的 Store 创建语句，其余接入不变。普通远程码继续走统一接口：

```ts
import { createDictionaryStore } from "@robot-admin/dictionary";
import { getDictionaryOptionsApi } from "./api";

const dictionaries = createDictionaryStore(
  {
    urgency: [
      { value: false, label: "普通" },
      { value: true, label: "加急" },
    ],
    // 只有需要特殊 TTL/接口的类型才单独声明。
    special_status: {
      ttlMs: 60_000,
      load: (context) => getDictionaryOptionsApi("special_status", context),
    },
  },
  { load: getDictionaryOptionsApi },
);
```

字段配置 `dictionary: "urgency"` 即可使用静态选项。需要导出同一枚举数组供其他业务复用时，再用 `defineEnum(options)` 校验、复制和冻结；仅注册给 Store 不必包装。

**只覆盖当前页面**：在页面 setup 创建局部 Store、组合祖先来源并 provide；不要在局部 Store 配统一 loader，否则它会接管所有原码：

```ts
import { inject, provide, onScopeDispose } from "vue";
import {
  createDictionaryStore,
  createDictionaryProvider,
} from "@robot-admin/dictionary";
import { DICTIONARY_PROVIDER_KEY } from "@robot-admin/naive-ui-components/config";

const parent = inject(DICTIONARY_PROVIDER_KEY);
if (!parent) throw new Error("请先提供应用字典实例");
const local = createDictionaryStore({
  user_status: [{ value: "1", label: "本页正常" }],
});
const provider = createDictionaryProvider(local, parent);
provide(DICTIONARY_PROVIDER_KEY, provider);
onScopeDispose(() => local.destroy());
```

子组件的表单、搜索、C_Table 和详情自动读取最近 Provider。同一个 setup 内的详情显式把 `provider` 传给 `useDictionaryLabels`；RobotAdmin 使用 `useDictLabels(record, fields, { provider })`。Vue 的 inject 读取祖先，不会读取本层刚提供的值。

只有“名称不存在”才向应用来源查找；已找到的源即使为空、失败或无匹配值，也不会换源掩盖问题。组合器不创建缓存，不代替所有者销毁 Store。

### 场景七：脚本、提示和导出前准备

纯 TypeScript 不需要 Vue 或组件库。以下函数接收应用已有 Store，可用于提交提示或导出前准备：

```ts
import type { DictionaryStore } from "@robot-admin/dictionary";

export async function getAccountText(
  dictionaries: DictionaryStore,
  code: string,
) {
  const source = dictionaries.getDictionary("user_status");
  if (!source) throw new Error("字典实例不可用");
  await source.load();
  return source.label(code);
}
```

`load()` 会拒绝原始错误，由调用方捕获并在该操作处反馈；成功后 `label()` 是同步查找。预热多个码使用 `await dictionaries.preload(["user_status", "gender"])`，返回每个字典的 `allSettled` 结果。无参预热只处理已建立的源，不枚举后台目录。

## 三、空、失败与重试

| 情况                            | 实际行为                  | 页面怎么处理                                    |
| ------------------------------- | ------------------------- | ----------------------------------------------- |
| 未使用、记录未到达、弹窗关闭    | 不请求                    | 等真正使用时加载，不阻断应用启动                |
| 成功返回 `[]`                   | `empty`，仍按 TTL 缓存    | 明确显示暂无选项，不弹失败消息                  |
| HTTP/业务码失败、格式异常、超时 | `error`，保留同身份旧快照 | 控件局部重试；独立详情/MachTable 显示上面的提示 |
| 未匹配的历史编码                | 保留原码                  | 不改写提交数据，由业务治理历史值                |
| 停用选项                        | 标签仍能回显              | 下拉限制新选择，是否合法仍由业务校验决定        |

C_Form/C_FormSearch/C_Table 已处理字典状态。独立详情使用 `error/loading/reload`；独立网格使用 `state.error/state.loading/reload`，不要把接口错误只藏进控制台。

| 策略     | 默认值                                                                            |
| -------- | --------------------------------------------------------------------------------- |
| 成功缓存 | 5 分钟；`ttlMs: 0` 表示显式失效前一直有效                                         |
| 失败冷却 | 5 秒，避免重复消费形成错误风暴                                                    |
| 超时     | 15 秒                                                                             |
| 手动重试 | `source.load({ force: true })` 或 `reload()`，绕过 TTL/冷却；正在执行的请求仍共享 |

Store 配置可覆盖 `ttlMs/retryDelayMs/timeoutMs`；专属远程定义可覆盖 TTL。`source.load()` 和 `useDictionary().reload()` 失败拒绝；详情组的 `reload()` 与 `preload()` 返回 `allSettled`。

## 四、身份切换、维护与性能边界

- **身份变化**：应用调用 `setScope(scope)`；scope 包含影响结果的用户/租户/公司/语言，不含令牌。同步清空旧远程快照、取消旧请求并阻止迟到回填；静态枚举不重新加载。是否允许退出后的请求由应用认证层及 loader 决定。
- **字典维护成功**：调用 `invalidate("user_status")`。活跃订阅源重载，未使用源继续惰性；没有名称时失效本 Store 的所有远程源。
- **销毁**：应用卸载销毁应用 Store，页面卸载只销毁局部 Store。一个消费者取消不影响其他消费者的共享加载；销毁后不再创建新源。
- **原码**：`0`、`false`、`"0"`、`"001"` 严格区分，不自动数字化；数组逐项翻译。逗号串只有 `source.label(value, { split: "," })` 才拆分，不修改模型。
- **规模**：适合可整份读取的小字典。客户、物料、组织树的大型实体使用 DataPicker、分页检索或按码批量解析。按类型接口优先，不为每个原码重复拉全目录，也不再叠一套全目录缓存。
- **旧接入**：显式注册表继续有效，无统一 loader 时未知名称返回 `undefined`。轻量 `getOptions/load/subscribe/getState` 源仍可接入；标准 Store 还提供稳定快照与 O(1) 标签索引。

## 五、API 速查

| 入口/API                                                         | 用途                                                         |
| ---------------------------------------------------------------- | ------------------------------------------------------------ |
| 根入口 `createDictionaryStore(loader, options?)`                 | 应用统一远程接口                                             |
| 根入口 `createDictionaryStore(definitions, options?)`            | 静态/专属源；`options.load` 处理其余名称                     |
| 根入口 `createDictionaryProvider(...providers)`                  | 按顺序组合只读来源                                           |
| 根入口 `defineEnum(options)`                                     | 校验、复制、冻结可复用静态枚举                               |
| Store `getDictionary(name)`                                      | 取稳定源，不发请求；无统一 loader 的未知名称返回 `undefined` |
| Store `preload(names?)`                                          | 去重预热，返回 `allSettled`                                  |
| Store `setScope / invalidate / destroy`                          | 身份隔离、失效、销毁                                         |
| 源 `getOptions / get / label`                                    | 当前选项与同步翻译                                           |
| 源 `load / getState / subscribe`                                 | 加载、不可变状态与订阅清理                                   |
| `/vue` `useDictionaryLabels(provider, record, fields, options?)` | 详情字段标签与组加载状态                                     |
| `/vue` `useDictionary(source, options?)`                         | 单源状态与重试                                               |
| `/vue` `useDictionaryRefresh(sources, refresh)`                  | 选项快照变化后合并刷新                                       |

`useDictLabels`、`useAppDictionaries`、`setupDictionaries` 属于 RobotAdmin 应用，不是本包导出。`createDictionaryColumn` 属于 MachTable 的 `/business` 入口，NUI 的 Provider key 属于其 `/config` 入口。

维护流程见[仓库指南](https://github.com/ChenyCHENYU/robot-admin-packages/blob/main/docs/maintenance.md)。在本包运行 `bun run verify`，覆盖类型、生命周期、Vue 消费、ESM/CJS、SSR 和体积。

[MIT License](../LICENSE) · Robot Packages

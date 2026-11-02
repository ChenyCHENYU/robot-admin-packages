[← @robot-admin/dictionary](../README.md)

# 使用与 API 指南

首页提供推荐接入。本页按需要查阅远程接口、页面覆盖、启停、表格与底层 API。

## 本页导航

- [应用配置](#应用配置)
- [远程字典接入](#远程字典接入)
- [表单搜索与 C_Table](#表单搜索与-c_table)
- [详情与弹窗](#详情与弹窗)
- [页面覆盖](#页面覆盖)
- [MachTable 接入](#machtable-接入)
- [状态与失败处理](#状态与失败处理)
- [身份切换与生命周期](#身份切换与生命周期)
- [API 速查](#api-速查)
- [原码与性能边界](#原码与性能边界)

## 应用配置

远程字典在现有应用入口接一次接口。函数本身就是加载器，不需要单独的注册文件或逐项映射：

```ts
import { createDictionaryStore } from "@robot-admin/dictionary";
import { getDictionaryOptionsApi } from "./api";

export const dictionaries = createDictionaryStore(getDictionaryOptionsApi);
```

静态枚举或专属接口按需声明，未声明名称自动使用统一接口：

```ts
const dictionaries = createDictionaryStore(
  {
    "order-status": [
      { value: 0, label: "待下达" },
      { value: 1, label: "执行中" },
      { value: 2, label: "已完成" },
    ],
  },
  { load: getDictionaryOptionsApi },
);
```

应用持有这个实例并提供给所有消费者；应用卸载时调用 `destroy()`，不要在某个页面卸载时销毁共享实例。SSR 每个请求单独创建，避免跨用户共享缓存。没有统一加载器的既有注册表写法继续有效，未知名称仍返回 `undefined`。

`defineEnum(options)` 适合需要独立导出、复用的静态枚举常量；它校验并复制冻结选项。仅向 Store 注册时，直接使用数组即可。

## 远程字典接入

在应用 API 层实现一个通用函数，参数中的字典码就是字段声明的 `dictionary`：

```ts
import {
  type DictionaryLoadContext,
  type DictionaryOption,
} from "@robot-admin/dictionary";

// 示例接口直接返回标准选项数组；真实项目可复用自己的 API 函数。
export async function getDictionaryOptionsApi(
  code: string,
  { signal }: DictionaryLoadContext,
): Promise<readonly DictionaryOption[]> {
  const response = await fetch(
    `/api/dictionaries/${encodeURIComponent(code)}`,
    { signal },
  );
  if (!response.ok) throw new Error("订单状态暂时不可用，请重试");
  return response.json();
}
```

Loader 返回 `{ value, label, disabled? }[]`。接口若使用 `{ code, data, message }`、树形结构或不同字段名，在应用 API 层统一检查业务状态、解包和映射一次。Store 仍会校验返回的选项，非法格式进入错误状态。

`getDictionary(name)` 按需建立稳定源，但不发请求；真正消费时才加载。同码共用一份快照和请求，沿用 TTL、失败冷却、超时与作用域隔离。显式静态/专属定义优先，合法空字典和加载失败均不换源。名称按原码传递，不自动改大小写、连接符或编码类型。

`preload(["order_status"])` 可以显式预热未出现过的原码；不传名称时只处理已建立的源，不枚举后台目录。销毁后不再创建新源。统一远程来源适合作为应用兜底；页面只覆盖少数名称时保留显式定义，避免抢占应用来源。

有全局错误提示的请求客户端应为字典消费启用 `silent: true`，把错误交给使用位置展示和重试；认证恢复继续遵循应用请求层。不要使用 `catch(() => [])`，否则会把接口故障伪装成合法空字典。

Loader 同时收到 `{ signal, scope }`。`scope` 由应用定义；需要租户、公司或语言参数时，在 API 层适配真实业务协议，库不隐式注入 HTTP 请求。

## 表单搜索与 C_Table

Naive UI Components 通过现有 Provider 取字典。在应用初始化时注册一次；下例 `./app` 代表已有启动模块，不要求创建新文件：

```ts
import { DICTIONARY_PROVIDER_KEY } from "@robot-admin/naive-ui-components/config";
import { dictionaries } from "./app";

app.provide(DICTIONARY_PROVIDER_KEY, dictionaries); // app 为已有的 Vue 应用实例
```

之后字段只声明名称：

```ts
// C_Form / C_FormSearch
const formField = {
  prop: "status",
  label: "计划状态",
  type: "select",
  dictionary: "order-status",
};

// C_Table
const tableColumn = {
  key: "status",
  title: "计划状态",
  dictionary: "order-status",
};
```

NUI 控件管理加载、错误和局部重试。普通枚举保持文字显示；需要状态标签时，另外使用组件的 `status` 配置。字段自己的 renderer、formatter 或显式下拉选项优先级由组件决定，字典包不改写它们。

## 详情与弹窗

### 复用已有字段

在组件 `setup` 中传入现有记录和字段定义：

```ts
import { useDictionaryLabels } from "@robot-admin/dictionary/vue";
import { dictionaries } from "./app";

const { labels } = useDictionaryLabels(dictionaries, order, fields);
```

```vue
<span>{{ labels.status }}</span>
```

- `order` 接受 ref、reactive 对象或 getter，例如 `() => detailOrder.value?.header`。
- `fields` 读取 `prop/key/field` 和 `dictionary`；非字典字段忽略，配置在 setup 解析一次。
- 兼容 `{ status: "order-status" }` 映射和直接选项源；换记录不需要重新创建绑定。
- 字段路径支持点号和数字下标；原样包含点号的自身属性优先，不读取原型链。
- 同一字段声明不同字典时，通过 `error` 报告冲突，不猜测覆盖顺序。

类型明确的字段定义可以保留精确的标签键。宽泛配置数组的可选字典字段会表现为可选标签；使用既有组件类型检查字段声明即可，无需业务侧断言。

### 按弹窗状态启用

```ts
const { labels, loading, error, reload } = useDictionaryLabels(
  dictionaries,
  order,
  fields,
  { enabled: visible },
);
```

`enabled` 接受 boolean/ref/getter。缺少记录或未启用时不解析、订阅、加载远程源；关闭时归还当前订阅并取消等待，保留最后展示快照供弹窗离场。重新启用时先读取当前作用域的数据；禁用时手动重试也不会发请求。`{ immediate: false }` 只延后初次加载。

`labels` 只读，翻译不会改写 `order`。`loading/error/reload` 按需取用；字段组的 `reload()` 返回按字典去重的 `allSettled` 结果，一个失败不会阻断其他字典。

### RobotAdmin 的简写

```ts
const { labels } = useDictLabels(order, HEADER_FIELDS);
```

这是 RobotAdmin 的自动导入封装，负责读取当前 Provider；并非本包导出。弹窗同样可补充 `{ enabled: visible }`。已有的应用初始化、接口适配和演示入口见 [RobotAdmin 字典接入](https://github.com/ChenyCHENYU/Robot_Admin/blob/main/docs/dictionaries.md)。

## 页面覆盖

在页面配置处组合一次，所有控件和详情共用同一个 Provider：

```ts
import { provide } from "vue";
import { createDictionaryProvider } from "@robot-admin/dictionary";
import { DICTIONARY_PROVIDER_KEY } from "@robot-admin/naive-ui-components/config";

const provider = createDictionaryProvider(pageDictionaries, dictionaries);
provide(DICTIONARY_PROVIDER_KEY, provider);
const { labels } = useDictionaryLabels(provider, order, fields);
```

按传入顺序查找，页面名称缺失时兜底应用。已找到源的加载失败、合法空字典或未知编码都不触发换源，避免用另一份标签掩盖问题。组合器只读取来源，不创建请求或缓存，不负责销毁所组合的实例。

Vue 的 `inject` 读取祖先。RobotAdmin 的同层控制器显式使用 `useDictLabels(order, fields, { provider })`；子组件直接继承最近 Provider。不要在不同消费者里各写一条兜底链。

既有轻量源只需 `getOptions()`，可选 `load/getState/subscribe/label`。标准 Store 复用不可变快照及 O(1) 标签索引；旧源在加载/通知边界校验并复制选项，也支持原地更新后通知。共享缓存、TTL、超时及跨消费者请求合并由数据源负责，推荐使用本包 Store；读取适配不会再叠一套数据缓存。

## MachTable 接入

在已有 Vue 表格页面中，把同一个 Store 字典源接入公开业务列策略：

```ts
import { defineVueColumns, useMachTable } from "@agile-team/mach-table-vue";
import { createDictionaryColumn } from "@agile-team/mach-table-vue/business";
import {
  useDictionary,
  useDictionaryRefresh,
} from "@robot-admin/dictionary/vue";
import { dictionaries } from "./app";

interface Order {
  id: string;
  status: number;
}
const table = useMachTable<Order>();
const source = dictionaries.getDictionary("order_status");
if (!source) throw new Error("字典实例不可用");
const state = useDictionary(source);
const columns = defineVueColumns<Order>([
  {
    field: "status",
    headerName: "计划状态",
    ...createDictionaryColumn(source, { options: source.getOptions }),
  },
]);
useDictionaryRefresh([source], () => table.api.value?.view.refreshCells());
```

将 `table.ref`、业务行和 `columns` 传给 MachTable。页面通过 `state.loading/error/reload` 展示独立网格的请求状态；`useDictionary().reload()` 会拒绝失败，事件处理器应捕获并交给局部状态反馈。

单元格执行同步索引查询，不发请求、不遍历整份字典。异步选项变化后，`useDictionaryRefresh` 在 Vue post-flush 合并刷新；仅加载或错误状态变化不重绘表格。列默认保持原码输出，复制与 CSV/XLSX 的展示策略由 MachTable 列配置决定。

大规模客户/物料实体的按码解析继续使用 MachTable 的 `createCachedDictionary` 或业务批量接口，不在完整字典源外重复叠加缓存。

## 状态与失败处理

| 状态      | 含义与呈现                                         |
| --------- | -------------------------------------------------- |
| `idle`    | 尚未加载、已失效或消费暂停                         |
| `loading` | 正在加载；已有同作用域标签继续可读                 |
| `ready`   | 成功加载非空选项                                   |
| `empty`   | 成功返回空数组，提示暂无选项                       |
| `error`   | 接口、超时或校验失败，保留同作用域旧快照并提供重试 |

Store 源的 `getState()` 返回不可变 `{ status, options, error, updatedAt, scope }`。`load()` 拒绝原始错误，状态及共享的 `onError(error, { name, scope })` 同步更新；每次共享失败只通知一次观察者。取消、作用域失效及销毁不会触发 `onError`。

| Store 策略   | 默认值                                            |
| ------------ | ------------------------------------------------- |
| 成功 TTL     | 5 分钟；`ttlMs: 0` 表示显式失效前一直有效         |
| 失败冷却     | 5 秒，避免重复请求造成错误风暴                    |
| 单次加载超时 | 15 秒                                             |
| 手动重试     | `force: true` 绕过 TTL/冷却，正在执行的请求仍共享 |

可通过 Store 的 `ttlMs/retryDelayMs/timeoutMs` 调整，单个远程定义可覆盖 TTL。`source.load()`、`useDictionary().reload()` 的失败需要调用者处理；`useDictionaryLabels().reload()` 与 `store.preload()` 返回 `allSettled` 结果。

## 身份切换与生命周期

```ts
dictionaries.setScope(nextScope);
dictionaries.invalidate("order-status");
```

`scope` 是应用生成的字符串，应包含影响字典结果的用户、租户、公司或语言，不放令牌。切换时同步清空旧远程快照、取消旧请求并阻止迟到回填；静态枚举不重新请求。

`invalidate(name?)` 清除选定远程源的快照，活跃订阅源重新加载；未使用源保持惰性。字典维护在服务端成功且会话仍有效后调用它。页面自有 Store 由页面同步业务 scope 并在卸载时销毁，应用共享 Store 由应用所有者销毁。

一个消费者取消只结束自己的等待，不影响其他消费者共享请求。Vue 作用域卸载自动退订；手写订阅用返回的函数清理。退出登录后是否允许远程调用，由应用认证层及 loader 决定。

## API 速查

### Store 与只读 Provider

| API                                            | 用途                                               |
| ---------------------------------------------- | -------------------------------------------------- |
| `createDictionaryStore(loader, options?)`      | 应用统一接口，远程名称按原码惰性取源               |
| `createDictionaryStore(definitions, options?)` | 显式枚举或专属源；`options.load` 处理其余名称      |
| `createDictionaryProvider(...providers)`       | 按顺序组合只读来源                                 |
| `defineEnum(options)`                          | 校验、复制并冻结可复用枚举                         |
| `store.getDictionary(name)`                    | 返回稳定源；无统一 loader 的未知名称为 `undefined` |
| `store.preload(names?)`                        | 显式预加载并返回 `allSettled` 结果                 |
| `store.setScope(scope)` / `invalidate(name?)`  | 身份切换及数据失效                                 |
| `store.destroy()`                              | 清理本实例及等待；后续加载拒绝                     |

### 源与 Vue

| API                                                      | 用途                                                       |
| -------------------------------------------------------- | ---------------------------------------------------------- |
| `source.getOptions()`                                    | 当前只读选项                                               |
| `source.get(code)`                                       | O(1) 查找，未知返回 `undefined`                            |
| `source.label(value, options?)`                          | 同步翻译；适合脚本、提示与导出准备                         |
| `source.load({ signal?, force? }?)`                      | 加载或复用请求；失败拒绝                                   |
| `source.getState()` / `subscribe(listener)`              | 获取状态、订阅及清理                                       |
| `useDictionaryLabels(provider, model, fields, options?)` | 字段组的 `labels/loading/error/reload`                     |
| `useDictionary(source, options?)`                        | 单个源的 `state/status/options/loading/error/reload/label` |
| `useDictionaryRefresh(sources, refresh)`                 | 按选项快照合并表格刷新                                     |

字段绑定用于详情，表格保持各自的同步列策略。需要一次性同步翻译时，显式加载后读取 `source.label(record.status)`；页面优先使用字段绑定，避免逐字段获取 Source。

## 原码与性能边界

- `0`、`false`、`"0"`、`"false"` 和 `"001"` 都是不同编码，不自动数字化或推断类型。
- 未知值默认回显原码，空值为 `—`；底层 `label()` 可配置 `empty/unknown`。
- 多选数组逐项翻译；逗号串只有显式设置 `{ split: ',' }` 才拆分，结果保持字符串。`separator` 可改多值连接符。
- `disabled` 不影响历史标签，只限制控件中的新选择；提交是否合法仍由业务校验判断。
- 枚举检查重复值、有限数值、字符串标签及 boolean disabled，不递归冻结应用自有 metadata。
- 标签跟随不可变选项快照及绑定字段变化；不在单元格请求，也不为每个单元格创建订阅。
- Store 适合可整份读取的小字典。大型实体、树分页、无限远程搜索使用专用组件或按码 API。

## 验证与许可证

本包 `bun run verify` 覆盖类型、并发及生命周期、Vue 消费、ESM/CJS、声明、SSR 和体积。仓库维护流程见[维护指南](https://github.com/ChenyCHENYU/robot-admin-packages/blob/main/docs/maintenance.md)。

[MIT License](../LICENSE) · Robot Packages

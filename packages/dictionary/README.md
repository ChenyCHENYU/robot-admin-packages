# @robot-admin/dictionary

统一静态枚举、远程字典及字段翻译。根入口没有 Vue、UI 或请求库依赖；`/vue` 提供可选的响应式订阅和表格刷新。

```bash
bun add @robot-admin/dictionary
# 使用 /vue 时同时安装 vue >= 3.4
```

## 一次注册，多处使用

```ts
import { createDictionaryStore, defineEnum } from "@robot-admin/dictionary";

export const dictionaries = createDictionaryStore(
  {
    enabled: defineEnum([
      { value: false, label: "停用" },
      { value: true, label: "启用" },
    ]),
    planStatus: {
      // 返回标准选项；请求客户端、响应解包和后端字段映射由应用负责。
      load: ({ signal, scope }) =>
        request.get("/dict/plan-status", {
          signal,
          silent: true,
          params: { scope },
        }),
    },
  },
  { scope: "tenant-001:zh-CN" },
);

const status = dictionaries.getDictionary("planStatus");
await status.load();
status.label("S1B");
status.label(["S1B", "S1C"], { separator: " / " });
status.label("S1B,S1C", { split: "," }); // 不显式 split 时不会拆分编码
```

字典实例由应用、SSR 请求或独立业务作用域持有，不建立全局单例。`scope` 是应用生成的字符串，应包含影响字典结果的租户、组织、用户权限或语言。切换时执行 `dictionaries.setScope(next)`；注销或销毁宿主时执行 `destroy()`。不要把令牌放入 scope。

## 详情文字：绑定一次，直接读取字段

```ts
import { useDictionaryLabels } from "@robot-admin/dictionary/vue";

// order 是原始记录的 ref、reactive 对象，或 () => 当前记录。
const fields = [
  { prop: "status", type: "select", dictionary: "planStatus" },
  { prop: "enabled", type: "select", dictionary: "enabled" },
] as const;
const { labels, loading, error, reload } = useDictionaryLabels(
  dictionaries,
  order,
  fields,
);
```

```vue
<span>{{ labels.status }}</span>
<span>{{ labels.enabled }}</span>
```

直接复用既有表单、搜索或列配置中的 `prop/key/field` 与 `dictionary`，非字典字段忽略，不另建一份字段映射。原有 `{ status: 'planStatus' }` 映射仍支持，也可直接绑定选项源。配置在 setup 时解析一次；同一字段的矛盾配置通过 `error` 明确报告，不猜测覆盖顺序。仅复用字典元数据，不解释 UI 的 renderer、formatter、显式下拉选项或校验规则。

记录尚未到达时显示 `—`，不解析、订阅或加载远程源；记录、字段原码、远程选项变化后自动更新，原始记录保持不变。字段路径支持自身属性上的点号及数字下标，不读取原型链；原样包含点号的属性优先。换记录使用 ref 或 getter，不需要重新创建绑定。

同名字典只建立一个订阅，标签只跟随选项快照和已绑定的记录字段计算。加载及错误状态单独暴露；`reload()` 返回按字典去重的 `allSettled` 结果，失败仍通过 `error` 明确可见。第四参数 `{ enabled: visible }` 接受 boolean/ref/getter：禁用后退订并取消本消费者等待，保留最后展示快照，重新启用时先读取当前作用域数据；禁用时手动重试也不请求。`{ immediate: false }` 仅延后初次加载。卸载自动归还订阅。此工具用于详情记录，虚拟表格继续使用下面的同步列策略。

## 页面覆盖与既有选项源

```ts
import { createDictionaryProvider } from "@robot-admin/dictionary";

// 页面优先、应用兜底；把同一个 provider 交给所有消费者。
const provider = createDictionaryProvider(pageDictionaries, dictionaries);
```

仅名称未注册时继续查找下一层；已找到源的接口失败仍呈现失败，不用全局同名标签遮盖错误。组合器不创建请求、缓存或全局单例。`useDictionaryLabels` 只需要只读 Provider，不要求完整 Store。

兼容已有 `getOptions()` 选项源，`load/getState/subscribe/label` 可选。标准源复用原有不可变快照及 O(1) 标签索引；旧源在加载/通知边界校验并复制选项，支持原地更新后通知。无状态的异步源也有局部加载/错误与重试；取消本消费者不等待忽略 signal 的迟到 loader。共享缓存、TTL、超时与跨消费者请求合并由数据源负责，推荐使用本包 Store；读取适配不再叠一套数据缓存。

## 下拉、搜索与表格

Store 的 `getDictionary(name)` 和源的 `getOptions/load/subscribe` 结构兼容 Naive UI Components 的 DictionaryProvider。将实例传入现有字典 Provider 后，字段只需声明 `dictionary: 'planStatus'`。本包不依赖组件库或更改业务模型。

MachTable 列策略可直接读取同一个源：

```ts
import { createDictionaryColumn } from "@agile-team/mach-table-vue/business";

const columns = [
  {
    field: "status",
    ...createDictionaryColumn(status, { options: status.getOptions }),
  },
];
```

字典列保持原码与展示分离，默认复制／CSV／XLSX 输出遵循列策略。异步选项变化必须通知表格刷新；Vue 页面可直接组合下面的工具，无需额外 renderer 或缓存。MachTable 的大规模实体编码按需解析器 `createCachedDictionary` 继续适用于另一类场景；不要在完整字典源外再叠同一份缓存。

```ts
import {
  useDictionary,
  useDictionaryRefresh,
} from "@robot-admin/dictionary/vue";

const {
  options,
  loading,
  error,
  status: phase,
  reload,
  label,
} = useDictionary(status);
useDictionaryRefresh([status], () => table.api.value?.view.refreshCells());
```

`useDictionary` 接受源、ref 或 getter，支持联动替换；默认立即加载，`{ immediate: false }` 可延后。组件销毁时取消本消费者等待并退订，不影响其他组件共享请求。`useDictionaryRefresh` 只在不可变 options 快照变化时刷新，使用 Vue post-flush 合并同一轮更新，加载状态变化不重绘单元格。

## 状态与失败体验

`source.getState()` 返回不可变 `{ status, options, error, updatedAt, scope }`：

| status  | 含义                                                   |
| ------- | ------------------------------------------------------ |
| idle    | 尚未加载或已失效                                       |
| loading | 正在加载；同作用域已有选项继续可读                     |
| ready   | 已成功加载非空选项                                     |
| empty   | 成功返回空数组，应提示没有可选项                       |
| error   | 加载／超时／响应验证失败；保留同作用域旧快照，提供重试 |

默认成功 TTL 为 5 分钟（`ttlMs: 0` 表示显式失效前一直有效），失败冷却 5 秒，单次加载超时 15 秒。可在 Store 中设置 `ttlMs/retryDelayMs/timeoutMs`，单个远程定义可覆盖 TTL。手动 `source.load({ force: true })` 或 Vue 的 `reload()` 绕过 TTL／冷却，正在执行的请求仍共享。

不要把加载错误转换成 `[]`：这会混淆失败和真实空字典。`load()` 拒绝原始错误，状态和共享的 `onError(error,{name,scope})` 同步更新；每次共享失败只触发一次观察者。使用 Request Core 时，示例的 `silent: true` 只跳过客户端全局 toast，错误仍由字段／页面的状态与重试展示，不能静默吞掉。取消、作用域失效和销毁不会触发 `onError`。

`preload(['planStatus'])` 使用 `allSettled`，一个字典失败不阻止其余字典可用；它不吞掉失败结果。`invalidate(name?)` 清除远程字典快照，活跃订阅源自动重载；`setScope` 同时隔离所有远程旧数据与迟到响应，静态枚举不重新请求。

## 原始类型与性能边界

- `0`、`false`、`'0'`、`'false'` 和 `'001'` 都是不同编码；不自动数字化对象键或推断后端类型。
- `defineEnum` 只接受选项数组，验证唯一值、有限数值、字符串标签与 boolean disabled，复制并冻结顶层数组及选项；不会递归冻结应用自有的附加 metadata。
- `get()` 为 O(1) 同步查询，未知值返回 `undefined`；`label()` 默认回显原码，空值为 `—`，支持 `empty/unknown` 自定义。
- 多选数组逐项翻译；字符串只有显式 `split` 才拆分并去掉空片段，拆分结果保持字符串。数字后端可在接口映射时统一输入类型。
- `disabled` 不影响历史标签翻译，避免已停用项目在列表、详情中丢失名称。
- 每次成功加载只建立一次 Map，单元格不发请求、不遍历整份字典。
- 本包管理适合整份读取的业务小字典；大型实体检索、树分页、无限远程搜索使用已有专用组件或按码批量 API。

## 验证

```bash
bun run verify
```

包括类型检查、并发及生命周期测试、Vue 订阅测试、ESM／CJS／声明文件和根入口依赖边界、SSR 及体积检查。

[MIT License](./LICENSE)

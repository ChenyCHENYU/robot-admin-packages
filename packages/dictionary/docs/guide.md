[← @robot-admin/dictionary](../README.md)

# 接入与场景指南

SDK 只管理字典数据。具体表单、搜索、表格的组合放在项目，组件库无需识别或安装它。RobotAdmin 已完成项目组合，参见[实际用法](https://github.com/ChenyCHENYU/Robot_Admin/blob/main/docs/dictionaries.md)。

[插件接入](#一插件与配置接入一次) · [接口适配](#二接口适配一次) · [页面场景](#三按场景使用) · [错误](#四空失败与重试) · [身份与清理](#五身份与清理) · [升级](#升级说明)

## 一、插件与配置接入一次

安装 `bun add @robot-admin/dictionary`。Vue 入口使用项目已有 Vue ≥3.4；无 Vue 的脚本使用根入口。

通用接口和默认差异集中在一个可选文件：

```ts
// src/config/dictionary.ts
import { getDictionaryOptionsApi } from "../api/dictionary";

export default { load: getDictionaryOptionsApi };
```

在已有应用创建后、mount 前安装，`app` 是已有 Vue 应用：

```ts
import { createDictionaryPlugin } from "@robot-admin/dictionary/vue";
import dictionaryConfig from "./config/dictionary";

app.use(createDictionaryPlugin(dictionaryConfig));
```

不必逐项注册后台字典码；`useDictionary("order_status")` 会把原码传给通用接口。仅用静态枚举时省略 `load`，无配置安装不会猜测后台地址或请求接口。

| 配置           | 默认值 / 含义                          |
| -------------- | -------------------------------------- |
| `load`         | 可选通用接口，返回标准选项数组         |
| `dictionaries` | 可选静态枚举或专属接口，优先于通用接口 |
| `ttlMs`        | 300000；0 表示显式失效前一直有效       |
| `retryDelayMs` | 5000，失败冷却时间                     |
| `timeoutMs`    | 15000，请求超时                        |
| `scope`        | `"default"`，支持字符串、ref 或 getter |
| `enabled`      | `true`，支持 ref/getter 暂停远程消费   |
| `onError`      | 可选共享请求失败观察者，不在包内弹消息 |

每个 app 独立持有实例；SDK hooks 读取本插件上下文。项目无需手工 provide，不从启动文件反向导入 Store，也不向其他包注册协议。

## 二、接口适配一次

标准结果是 `{ value, label, disabled? }[]`，例如 `[{ value: "1", label: "正常" }]`。请求、响应解包和业务码检查在项目 API 中完成一次：

```ts
// src/api/dictionary.ts：接口直接返回标准数组。
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

真实后台若返回业务对象，替换上面的函数即可。以下假设成功码为数字 `0`、字典原码为字符串；字段与成功码以实际后台为准：

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

两段 API 二选一。已有请求客户端可替换 `fetch`，保留 `signal` 并关闭该请求的重复全局报错，由页面局部呈现。不要 `catch(() => [])`，否则失败会被伪装为成功空字典。

租户、公司、语言由上下文 `scope` 或现有请求层处理；SDK 不猜测后台协议。动态树接口可参考 [RobotAdmin API](https://github.com/ChenyCHENYU/Robot_Admin/blob/main/src/api/dictionary-options.ts)。

## 三、按场景使用

以下 Vue 代码放在组件 setup 或其组合函数中；应用已安装插件。

### 独立下拉

```ts
import { ref } from "vue";
import { useDictionary } from "@robot-admin/dictionary/vue";

const selected = ref("1");
const { options, loading, error, reload } = useDictionary("user_status");
async function retry() {
  try {
    await reload();
  } catch {
    /* error 已保存失败，由下方局部提示呈现。 */
  }
}
```

```vue
<select v-model="selected" :disabled="loading">
  <option v-for="option in options" :key="typeof option.value + ':' + option.value"
    :value="option.value" :disabled="option.disabled">{{ option.label }}</option>
</select>
<p
  v-if="error"
>字典加载失败。<button type="button" @click="retry">重试</button></p>
```

同样可以把 `options/loading` 传给任意 UI 控件已有的 props。控件值仍为原码，SDK 不安装渲染器、不修改字段配置。名称可传 ref/getter；名称变化时清理上一消费者，同码共享请求和缓存。

### 详情与弹窗

详情只声明“记录字段 → 字典码”的普通映射，不接受表单或列配置数组：

```ts
import { ref } from "vue";
import { useDictLabels } from "@robot-admin/dictionary/vue";

const order = ref<{ status: number } | null>(null);
const visible = ref(false);
const { labels, loading, error, reload } = useDictLabels(
  order,
  { status: "order_status" },
  { enabled: visible },
);
function showDetail(record: { status: number }) {
  order.value = record;
  visible.value = true;
}
```

```vue
<section v-if="visible">
  <span>{{ labels.status }}</span>
  <p v-if="error">部分字典暂不可用。</p>
  <button v-if="error" type="button" :disabled="loading" @click="reload">重试</button>
</section>
```

记录未到达或 `enabled: false` 时不解析、订阅或请求。关闭保留标签供离场展示，重开读取当前身份数据。组 `reload()` 返回按源去重的 `allSettled` 结果，不抛出单个字典的失败；翻译不改记录。脚本读取 `labels.value.status`，模板自动解包。

### 搜索与表格

搜索仍传原码；列表用同步标签函数。下面是项目页面组合逻辑，没有组件包 API：

```ts
import { ref } from "vue";
import { useDictionary } from "@robot-admin/dictionary/vue";

const status = useDictionary("order_status");
const query = ref<{ status: string | null }>({ status: null });
const formatStatus = (value: unknown) => status.label(value);
function searchPayload() {
  return { status: query.value.status };
}
```

项目把 `status.options.value` 交给搜索控件，把 `formatStatus` 交给表格已有的 formatter，错误和重试复用上面的模式。日期、校验、分页、状态色、编辑、筛选和导出继续使用各组件的普通配置，SDK 不接管这些能力。

非响应式网格由项目在选项快照变化后调用公开刷新方法；`useDictionaryRefresh(sources, refresh)` 可合并此类回调。不要逐单元格创建消费者或请求，也不要为翻译复制整张大表。实际项目的集中组合见 [RobotAdmin 用法](https://github.com/ChenyCHENYU/Robot_Admin/blob/main/docs/dictionaries.md)。

### 静态枚举与专属接口

在统一配置文件补充差异，安装方式不变：

```ts
import { getDictionaryOptionsApi } from "../api/dictionary";
import type { DictionaryPluginConfig } from "@robot-admin/dictionary/vue";

export default {
  load: getDictionaryOptionsApi,
  dictionaries: {
    urgency: [
      { value: false, label: "普通" },
      { value: true, label: "加急" },
    ],
    special_status: {
      ttlMs: 60_000,
      load: (context) => getDictionaryOptionsApi("special_status", context),
    },
  },
} satisfies DictionaryPluginConfig;
```

`useDictionary("urgency")` 读取静态枚举，其他名称仍走通用接口。需要在其他业务复用同一枚举数组时，可用根入口 `defineEnum(options)` 校验、复制与冻结，注册给 Store 不必额外包装。

局部差异可创建自己的 Store，使用 `useDictionary(localSource)` 或 `useDictLabels(record, mapping, { provider: localStore })`。组合多个来源使用根入口 `createDictionaryProvider(local, fallback)`，只有名称不存在才兜底；项目负责局部 Store 的销毁，不改应用实例。

### 无 Vue 的脚本

根入口不依赖 Vue、组件库或请求库：

```ts
import { createDictionaryStore } from "@robot-admin/dictionary";

const dictionaries = createDictionaryStore({
  order_status: [{ value: 0, label: "待下达" }],
});
try {
  const text = dictionaries.getDictionary("order_status").label(0);
  console.log(text);
} finally {
  dictionaries.destroy();
}
```

远程脚本可把同一个通用 loader 传给 `createDictionaryStore(loader)`，先 `await source.load()` 再同步 `source.label(value)`。多个码用 `preload(names)`，返回逐源 `allSettled`；无参只预热已建立的源，不枚举后台目录。

### 导入值解析

把导入的标签转换回原码，使用纯函数解析器：

```ts
import { createDictionaryParser } from "@robot-admin/dictionary";

const parse = createDictionaryParser([
  { value: 0, label: "待下达" },
  { value: false, label: "停用" },
]);
const values = parse(["待下达", "停用", "未知"]); // [0, false, "未知"]
```

原始类型优先，其后匹配字符串编码，再匹配标签；未知值保留，歧义抛出 `TypeError`，由导入流程就地反馈。空值和前导零不被隐式转换。也可传 `() => options`，按不可变数组快照惰性复用索引，选项变化时替换数组。

## 四、空、失败与重试

| 情况                         | 状态与处理                                        |
| ---------------------------- | ------------------------------------------------- |
| 远程源未消费或认证暂停       | 不请求；认证暂停保持 `idle`，静态枚举仍可读       |
| 成功返回 `[]`                | `empty`，正常按 TTL 缓存，页面显示暂无选项        |
| HTTP、业务码、格式或超时失败 | `error`，保留同身份旧标签，页面显示局部错误和重试 |
| 未知历史编码                 | 保留原码，不改提交数据                            |
| 停用选项                     | 仍能翻译历史值；是否可选、是否合法由项目决定      |

单字典 hook 的 `reload()` 和 `source.load()` 失败会拒绝，事件处理器应捕获；详情组 `reload()` 和 Store `preload()` 返回 `allSettled`。`reload()` 或 `load({ force: true })` 绕过成功缓存与失败冷却，在途请求仍共享。

默认成功缓存 5 分钟、失败冷却 5 秒、超时 15 秒。配置可以覆盖；失败不会变成合法空字典，SDK 不弹全局消息。

## 五、身份与清理

- `scope` 包含影响字典结果的用户、租户、公司或语言，不含令牌；`enabled` 表达是否允许远程消费。ref/getter 引用所属应用的上下文，不每次读取其他应用的全局 Store。
- 插件同步身份与暂停变化，清空旧远程快照、取消旧请求并阻止迟到回填；恢复时只按活跃消费重新加载。静态枚举仍可读。
- 维护保存成功后，在 setup 获取的 `useDictionaries()` 实例上调用 `invalidate(name)`；省略名称失效本实例所有远程源，未消费源继续惰性。
- 客户、物料、组织树等大型实体使用分页检索或批量解析。字典适合整份加载的小型编码集。
- 客户端由插件随 app 卸载清理；页面创建的局部 Store 由页面销毁。SSR 每个请求新建应用与插件，渲染后必须清理：

```ts
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { createDictionaryPlugin } from "@robot-admin/dictionary/vue";
import dictionaryConfig from "./config/dictionary";

export async function renderPage() {
  const app = createSSRApp({ render: () => h("div", "页面") });
  const plugin = createDictionaryPlugin(dictionaryConfig);
  app.use(plugin);
  try {
    return await renderToString(app);
  } finally {
    plugin.dispose(app);
  }
}
```

SSR 不跨请求复用外部可订阅源；低层直接源也由宿主按请求创建和销毁。配置中的身份上下文同样按请求提供，不共享用户状态。

## 六、API 与升级

| API                                                               | 用途                                            |
| ----------------------------------------------------------------- | ----------------------------------------------- |
| `/vue` `createDictionaryPlugin(config?)`                          | 安装独立插件，SSR 使用 `dispose(app)`           |
| `/vue` `useDictionary(nameOrSource, options?)`                    | 单源选项、同步 `label`、状态和重试              |
| `/vue` `useDictLabels(record, mapping, options?)`                 | 字段标签、组状态与重试                          |
| `/vue` `useDictionaries()`                                        | 获取当前应用 Store，预热或失效                  |
| `/vue` `useDictionaryLabels(provider, record, mapping, options?)` | 显式来源的字段翻译                              |
| `/vue` `useDictionaryRefresh(sources, refresh)`                   | 选项快照变化后合并回调，不因 loading/error 刷新 |
| 根入口 `createDictionaryStore(loaderOrDefinitions, options?)`     | 无框架字典实例与缓存                            |
| 根入口 `createDictionaryProvider(...providers)`                   | 按优先顺序组合只读数据来源                      |
| 根入口 `createDictionaryParser(optionsOrGetter)`                  | 将导入标签或字符串编码解析回原码                |
| 根入口 `defineEnum(options)`                                      | 校验、复制、冻结静态枚举                        |
| Store `getDictionary / preload / invalidate / setScope / destroy` | 取源、预热、维护与清理                          |
| 源 `getOptions / get / label / load / getState / subscribe`       | 快照、索引、翻译、加载与订阅                    |

`0`、`false`、`"0"`、`"001"` 保留类型；多选数组逐项翻译。`label(value, { separator, empty, unknown, split })` 可调整显示，只有显式 `split` 才拆分字符串，翻译不回写模型。

### 升级说明

从 0.5 升级到 0.6，插件安装、通用接口和核心 Store 用法不变，项目组合需要迁移：

1. 删除组件包的字典协议接入和手工注入；应用只安装字典自己的插件。
2. `useDictLabels(record, uiFields)` 改为普通映射，如 `useDictLabels(record, { status: "order_status" })`。SDK 不再识别 `prop/key/field` 数组。
3. 旧组件内的自动字典加载、翻译改为项目绑定普通选项、状态、formatter 和刷新。组件字段中不再写 SDK 元数据。
4. 不再导出公开注入 key；局部差异通过显式 source/provider 交给 SDK hook，不影响其他页面。

这不是仅改版本号的无感升级。项目可以集中封装组合，组件包与 SDK 之间不再互相识别；具体迁移见 [RobotAdmin 用法](https://github.com/ChenyCHENYU/Robot_Admin/blob/main/docs/dictionaries.md)。

在本包运行 `bun run verify`；最低 Vue 的独立消费者检查使用 `bun run check:vue-min`。维护流程见[仓库指南](../../../docs/maintenance.md)。

[MIT License](../LICENSE) · Robot Packages

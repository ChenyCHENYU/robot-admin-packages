<!-- 品牌源文件与导出方式：../../docs/assets/README.md -->

![Robot Dictionary](./docs/assets/banner.png)

<div align="center">
  <p><strong>接口接入一次，字段直接声明字典码。</strong></p>
  <p>静态枚举 · 远程字典 · 字段配置复用 · 按需加载 · 作用域隔离</p>
  <p>
    <a href="https://www.npmjs.com/package/@robot-admin/dictionary"><img src="https://img.shields.io/npm/v/@robot-admin/dictionary?style=flat-square&amp;color=F2A990&amp;labelColor=202A3B" alt="npm version"></a>
    <a href="https://github.com/ChenyCHENYU/robot-admin-packages/actions/workflows/ci.yml"><img src="https://github.com/ChenyCHENYU/robot-admin-packages/actions/workflows/ci.yml/badge.svg" alt="Workspace quality gate"></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-64748B?style=flat-square&amp;labelColor=202A3B" alt="MIT License"></a>
  </p>
  <p>
    <a href="#从哪里开始">接入路线</a> ·
    <a href="#按场景使用">场景索引</a> ·
    <a href="./docs/guide.md">完整指南</a> ·
    <a href="https://github.com/ChenyCHENYU/robot-admin-packages">包总览</a>
  </p>
</div>

## 项目定位

**Robot Dictionary** 统一字典选项、加载状态和字段翻译。业务模型保存原始编码，表单、搜索、详情和表格共用同一份来源。

当前仓库版本 **0.4.1**。根入口无框架、UI 或请求库依赖；Vue 能力通过 `/vue` 按需使用。

## 从哪里开始

| 你的项目                               | 需要做什么                              | 阅读入口                                                                                             |
| -------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| RobotAdmin                             | 已完成接入，直接声明字段字典码          | [项目用法](https://github.com/ChenyCHENYU/Robot_Admin/blob/main/docs/dictionaries.md)                |
| 已使用 Naive UI Components 的 Vue 项目 | 接一个通用接口，启动时提供一次实例      | [接入步骤](./docs/guide.md#一接入只做一次)                                                           |
| 其他 Vue 或纯 TypeScript 项目          | 创建 Store；按需使用 Vue 绑定或同步翻译 | [详情绑定](./docs/guide.md#场景四详情和弹窗)、[脚本翻译](./docs/guide.md#场景七脚本提示和导出前准备) |

```bash
bun add @robot-admin/dictionary
# 使用 /vue 时，还需要 vue >= 3.4
```

### RobotAdmin：直接使用

在已有字段配置中声明后台原码，例如表单字段：

```ts
import type { FormOption } from "@robot-admin/naive-ui-components/C_Form";

const user = ref({ account: "1" });
const fields: FormOption<{ account: string }>[] = [
  {
    prop: "account",
    label: "账户状态",
    type: "select",
    dictionary: "user_status",
  },
];
```

`ref` 和下方 `useDictLabels` 在 RobotAdmin 自动导入。详情直接复用上面的记录与字段；已有页面不重复定义：

```ts
const { labels } = useDictLabels(user, fields);
```

```vue
<span>{{ labels.account }}</span>
```

`useDictLabels` 是 **RobotAdmin 的自动导入封装**，不是本包导出。新增远程字典不需要再建注册文件或 loader；字段写后台实际字典码即可。

### 新项目：入口接一次

下面放在已有的应用启动逻辑中，`app` 是已创建的 Vue 应用，`getDictionaryOptionsApi` 是项目自己的接口函数：

```ts
import { createDictionaryStore } from "@robot-admin/dictionary";
import { DICTIONARY_PROVIDER_KEY } from "@robot-admin/naive-ui-components/config";
import { getDictionaryOptionsApi } from "./api";

const dictionaries = createDictionaryStore(getDictionaryOptionsApi);
app.provide(DICTIONARY_PROVIDER_KEY, dictionaries);
app.onUnmount(() => dictionaries.destroy());
```

接口接收 `(字典码, { signal, scope })`，返回 `{ value, label, disabled? }[]`。创建实例和取源都不发请求，实际消费时才加载；同码共享请求、缓存和状态。接口实现、返回格式及业务响应解包见[接入步骤](./docs/guide.md#一接入只做一次)。

## 按场景使用

| 场景                         | 使用方式                                      | 完整示例                                                       |
| ---------------------------- | --------------------------------------------- | -------------------------------------------------------------- |
| 表单下拉                     | `prop/type/dictionary`，提交仍为原码          | [表单](./docs/guide.md#场景一表单下拉)                         |
| 搜索条件                     | `prop/type/dictionary`，搜索传原码            | [搜索](./docs/guide.md#场景二搜索条件)                         |
| C_Table                      | `key/title/dictionary`，异步自动更新标签      | [C_Table](./docs/guide.md#场景三c_table-列表)                  |
| 详情、弹窗                   | 复用字段，读取 `labels.field`；按可见状态启用 | [详情](./docs/guide.md#场景四详情和弹窗)                       |
| MachTable                    | 公共字典列策略，异步合并刷新                  | [MachTable](./docs/guide.md#场景五machtable)                   |
| 静态枚举、专属接口、页面覆盖 | 只声明确有差异的名称                          | [覆盖与枚举](./docs/guide.md#场景六静态枚举专属接口和页面覆盖) |
| 提示、脚本、导出前准备       | 显式加载，再同步 `source.label(value)`        | [脚本翻译](./docs/guide.md#场景七脚本提示和导出前准备)         |

表单、搜索与 C_Table 使用同一个 Provider；MachTable 复用同一个 Store。**枚举翻译与状态配色分别配置**，普通字典不会自动全部变成彩色状态标签。

## 默认行为与边界

- 成功空字典和加载失败分别处理；失败保留同作用域旧标签，并提供局部错误和重试。见[空与失败](./docs/guide.md#三空失败与重试)。
- 默认成功缓存 5 分钟、失败冷却 5 秒、超时 15 秒；同码请求合并，不在单元格内请求或订阅。
- `0`、`false`、`"0"` 和 `"001"` 严格区分；未知值保留原码，翻译不回写模型。
- 多选数组逐项翻译；停用项保留历史标签。身份切换、失效和销毁见[生命周期](./docs/guide.md#四身份切换维护与性能边界)。
- 适合可整份读取的小字典；大型客户、物料、组织树使用分页检索或按码批量查询。

## 文档与维护

| 文档                                                                                             | 内容                                     |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| [完整指南](./docs/guide.md)                                                                      | 接入步骤、七类使用场景、错误恢复与 API   |
| [RobotAdmin 项目用法](https://github.com/ChenyCHENYU/Robot_Admin/blob/main/docs/dictionaries.md) | 已接入项目直接怎么写、配置位置与体验入口 |
| [变更记录](./CHANGELOG.md)                                                                       | 版本变化与兼容性                         |

在本包目录运行 `bun run verify`；工作区完整门禁使用根目录同名命令。

## 许可证

[MIT License](./LICENSE) · Robot Packages

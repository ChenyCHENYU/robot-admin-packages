<!-- 品牌源文件与导出方式：../../docs/assets/README.md -->

![Robot Dictionary](./docs/assets/banner.png)

<div align="center">
  <p><strong>字典定义一次，表单、搜索、详情与表格共用。</strong></p>
  <p>静态枚举 · 远程字典 · 字段配置复用 · 按需加载 · 作用域隔离</p>
  <p>
    <a href="https://www.npmjs.com/package/@robot-admin/dictionary"><img src="https://img.shields.io/npm/v/@robot-admin/dictionary?style=flat-square&amp;color=F2A990&amp;labelColor=202A3B" alt="npm version"></a>
    <a href="https://github.com/ChenyCHENYU/robot-admin-packages/actions/workflows/ci.yml"><img src="https://github.com/ChenyCHENYU/robot-admin-packages/actions/workflows/ci.yml/badge.svg" alt="Workspace quality gate"></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-64748B?style=flat-square&amp;labelColor=202A3B" alt="MIT License"></a>
  </p>
  <p>
    <a href="#快速开始">快速开始</a> ·
    <a href="#能力地图">能力地图</a> ·
    <a href="./docs/guide.md">完整指南</a> ·
    <a href="https://github.com/ChenyCHENYU/robot-admin-packages">包总览</a>
  </p>
</div>

## 项目定位

**Robot Dictionary** 统一枚举选项、远程字典和字段翻译，以 `@robot-admin/dictionary` 发布。使用侧声明字段的 `dictionary`，下拉和详情共用标签，业务模型继续保存原始编码。

当前仓库版本 **0.3.1**。根入口无框架、UI 或请求库依赖；Vue 响应式能力通过 `/vue` 按需使用。

## 能力地图

| 场景       | 提供能力                                        |
| ---------- | ----------------------------------------------- |
| 静态与远程 | 同一份配置支持枚举数组或接口加载函数            |
| 表单与搜索 | 声明 `dictionary`，共用选项、加载状态与局部重试 |
| 详情       | 复用已有字段配置，直接读取 `labels.status`      |
| 两种表格   | C_Table 字典列、MachTable 公开字典列策略        |
| 页面覆盖   | 页面优先、应用兜底，所有消费者共用同一个来源    |
| 生命周期   | 请求合并、缓存、超时、取消等待及身份切换隔离    |

## 入口选择

| 入口   | 用途                                                              |
| ------ | ----------------------------------------------------------------- |
| 根入口 | `createDictionaryStore`、`createDictionaryProvider`、`defineEnum` |
| `/vue` | 字段标签、加载状态、启停控制与表格刷新；需要 Vue ≥3.4             |

## 快速开始

```bash
bun add @robot-admin/dictionary
# Vue 项目同时需要 vue >= 3.4
```

### RobotAdmin：直接复用已有字段

RobotAdmin 已完成应用注册，页面直接使用：

```ts
const { labels } = useDictLabels(order, HEADER_FIELDS);
```

```vue
<NDescriptionsItem label="计划状态">{{ labels.status }}</NDescriptionsItem>
```

`order` 是已有的响应式记录，`HEADER_FIELDS` 是已有的字段配置。`useDictLabels` 是 **RobotAdmin 的自动导入封装**，并非本包导出；其他项目使用下面的公开 API。弹窗按可见状态启用时，补充 `{ enabled: visible }` 即可。

### 其他 Vue 项目：注册一次，再绑定字段

应用集中定义字典：

```ts
// dictionaries.ts
import { createDictionaryStore } from "@robot-admin/dictionary";

export const dictionaries = createDictionaryStore({
  "order-status": [
    { value: 0, label: "待下达" },
    { value: 1, label: "执行中" },
    { value: 2, label: "已完成" },
  ],
});
```

在组件 `setup` 中复用业务记录和字段配置：

```ts
import { ref } from "vue";
import { useDictionaryLabels } from "@robot-admin/dictionary/vue";
import { dictionaries } from "./dictionaries";

const order = ref({ status: 0 });
const fields = [
  {
    prop: "status",
    label: "计划状态",
    type: "select",
    dictionary: "order-status",
  },
]; // 实际项目复用已有 fields
const { labels } = useDictionaryLabels(dictionaries, order, fields);
```

模板同样读取 `{{ labels.status }}`。记录或字典变化后自动更新；接真实接口时，在注册处把选项数组换成 `load`，页面字段配置继续复用，见[远程字典接入](./docs/guide.md#远程字典接入)。

## 组件与表格接入

| 使用位置              | 最小配置                                                           |
| --------------------- | ------------------------------------------------------------------ |
| C_Form / C_FormSearch | `{ prop: 'status', type: 'select', dictionary: 'order-status' }`   |
| C_Table               | `{ key: 'status', title: '计划状态', dictionary: 'order-status' }` |
| 详情文字              | `useDictionaryLabels(provider, record, fields)`                    |
| MachTable             | 同一字典源接入 `createDictionaryColumn`，异步完成后合并刷新        |

NUI 控件通过应用 Provider 取源；MachTable 使用自己的公开列策略。完整初始化及示例见[组件接入](./docs/guide.md#表单搜索与-c_table)、[MachTable 接入](./docs/guide.md#machtable-接入)。普通枚举显示文字，状态颜色由组件单独配置。

## 默认行为与边界

- 缺少记录或 `enabled: false` 时，详情不订阅、不加载；关闭后保留展示快照，重新启用时读取当前作用域。
- 成功空字典与加载失败分别处理；失败保留同作用域旧标签，并提供错误与重试状态。
- `0`、`false`、`"0"` 和 `"001"` 严格区分；未知值回显原码，翻译不回写模型。
- Store 默认缓存 5 分钟、失败冷却 5 秒、加载超时 15 秒；应用持有并销毁实例，SSR 每个请求独立创建。
- 适用于可整份读取的小字典；客户、物料和组织树等大数据使用分页检索或按码查询。

## 文档与维护

| 文档                                                                                         | 内容                                           |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| [完整指南](./docs/guide.md)                                                                  | 真实接口、页面覆盖、启停、表格、错误处理与 API |
| [RobotAdmin 接入](https://github.com/ChenyCHENYU/Robot_Admin/blob/main/docs/dictionaries.md) | 应用封装、已有接口适配与体验入口               |
| [变更记录](./CHANGELOG.md)                                                                   | 版本变化与兼容性                               |

在本包目录运行 `bun run verify`，覆盖类型、测试、构建、ESM / CJS 入口及体积检查；工作区完整门禁使用根目录的同名命令。

## 许可证

[MIT License](./LICENSE) · Robot Packages

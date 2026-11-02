<!-- 品牌源文件与导出方式：../../docs/assets/README.md -->

![Robot Dictionary](./docs/assets/banner.png)

<div align="center">
  <p><strong>一次接入，任意页面直接取字典。</strong></p>
  <p>静态枚举 · 远程字典 · 独立插件 · 按需加载 · 作用域隔离</p>
  <p>
    <a href="https://www.npmjs.com/package/@robot-admin/dictionary"><img src="https://img.shields.io/npm/v/@robot-admin/dictionary?style=flat-square&amp;color=F2A990&amp;labelColor=202A3B" alt="npm version"></a>
    <a href="https://github.com/ChenyCHENYU/robot-admin-packages/actions/workflows/ci.yml"><img src="https://github.com/ChenyCHENYU/robot-admin-packages/actions/workflows/ci.yml/badge.svg" alt="Workspace quality gate"></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-64748B?style=flat-square&amp;labelColor=202A3B" alt="MIT License"></a>
  </p>
  <p>
    <a href="#插件化接入">插件接入</a> ·
    <a href="#按场景使用">场景索引</a> ·
    <a href="./docs/guide.md">完整指南</a> ·
    <a href="https://github.com/ChenyCHENYU/robot-admin-packages">包总览</a>
  </p>
</div>

## 项目定位

**Robot Dictionary** 管理静态枚举、远程字典、加载状态和原码翻译。接口接入项目后，页面直接取选项或标签。

当前仓库版本 **0.6.0**。根入口无框架、UI 或请求库依赖；Vue 插件和 hooks 通过 `/vue` 按需使用。

SDK 不导入、不识别任何组件库的字段或注入协议。项目把普通 `options/loading` 和标签函数绑定到现有控件，组件包无需接入字典 SDK。

## 插件化接入

```bash
bun add @robot-admin/dictionary
# Vue 入口需要项目已有 vue >= 3.4；纯 TypeScript 使用根入口
```

**1. 配置一次**，只覆盖需要调整的默认项：

```ts
// src/config/dictionary.ts
import { getDictionaryOptionsApi } from "../api/dictionary";

export default { load: getDictionaryOptionsApi };
```

`getDictionaryOptionsApi(code, { signal, scope })` 返回 `{ value, label, disabled? }[]`。标准数组和业务响应的适配见[接口指南](./docs/guide.md#二接口适配一次)。普通远程字典按原码加载，不逐项注册。

**2. 安装插件**，`app` 是项目已创建的 Vue 应用：

```ts
import { createDictionaryPlugin } from "@robot-admin/dictionary/vue";
import dictionaryConfig from "./config/dictionary";

app.use(createDictionaryPlugin(dictionaryConfig));
```

插件按应用管理实例、响应式身份和卸载；安装不请求，消费时才加载。仅用静态枚举时不必提供 `load`，也可无配置安装 `createDictionaryPlugin()`。

## 页面怎么用

下拉、搜索或任意自定义控件，只取同一份字典数据：

```ts
import { useDictionary } from "@robot-admin/dictionary/vue";

const status = useDictionary("order_status");
// status.options / loading / error / reload / label
```

项目将 `status.options.value` 绑定控件已有的选项属性，将 `status.label(value)` 用于详情、列表或提示。SDK 不安装组件渲染器，不改变组件字段定义。

详情使用普通记录映射：

```ts
import { ref } from "vue";
import { useDictLabels } from "@robot-admin/dictionary/vue";

const order = ref({ status: 0 });
const { labels } = useDictLabels(order, { status: "order_status" });
```

```vue
<span>{{ labels.status }}</span>
```

## 按场景使用

| 场景               | SDK 提供什么                     | 项目负责什么                           |
| ------------------ | -------------------------------- | -------------------------------------- |
| 下拉、搜索         | `options/loading/error/reload`   | 绑定当前控件的普通 props，查询仍传原码 |
| 详情、弹窗         | `useDictLabels(record, mapping)` | 展示 `labels.status`，按可见状态启用   |
| 列表、网格         | 同步 `label(value)`              | 普通 formatter、筛选、编辑与导出配置   |
| 静态枚举、专属接口 | 配置中的 `dictionaries`          | 只声明确有差异的字典                   |
| 脚本、服务端       | 无框架 Store 和同步翻译          | 显式加载、错误反馈与销毁               |

完整变量和模板见[接入与场景指南](./docs/guide.md)。真实项目组合方式见 [RobotAdmin 用法](https://github.com/ChenyCHENYU/Robot_Admin/blob/main/docs/dictionaries.md)。

## 默认行为

- 成功缓存 5 分钟、失败冷却 5 秒、请求超时 15 秒；同码请求合并。
- 成功空字典与加载失败区分，失败保留同身份旧标签；错误由项目局部呈现和重试。
- `0`、`false`、`"0"`、`"001"` 严格区分；未知值保留原码，翻译不改模型。
- 未消费不请求；暂停保持 `idle`，身份切换取消旧请求并阻止迟到回填。
- 适合可整份读取的小字典；大型客户、物料等使用分页检索或批量解析。

## 从 0.5 升级

插件安装和通用 loader 不变。新版移除跨包自动联动与公开注入 key：

- `useDictLabels` 只接受普通字段映射，不再识别 UI 字段数组。
- 表单、搜索、表格由项目显式绑定普通选项与 formatter，不要求组件包提供字典协议。
- 原有自动接入需要迁移项目组合代码，不能只升级版本而保留旧字段声明。

迁移步骤见[升级说明](./docs/guide.md#升级说明)。

## 文档与维护

[完整指南](./docs/guide.md) · [变更记录](./CHANGELOG.md) · [维护指南](../../docs/maintenance.md)

本包和工作区根目录均可运行 `bun run verify`。`bun run check:vue-min` 独立冷安装声明的最低 Vue 版本，不改变工作区依赖。

## 许可证

[MIT License](./LICENSE) · Robot Packages

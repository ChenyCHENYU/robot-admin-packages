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
    <a href="#接入一次">插件接入</a> ·
    <a href="#页面使用">场景索引</a> ·
    <a href="./docs/guide.md">完整指南</a> ·
    <a href="https://github.com/ChenyCHENYU/robot-admin-packages">包总览</a>
  </p>
</div>

**Robot Dictionary** 是独立的字典与枚举插件。根入口无框架、组件库或请求库依赖，Vue 插件与 hooks 从 `/vue` 导入。项目自由绑定普通选项、状态和标签函数。

当前版本 **0.6.1**。

## 安装

```bash
bun add @robot-admin/dictionary
```

Vue 入口需要项目已有 Vue ≥3.4；无 Vue 的脚本直接使用根入口。

## 接入一次

在项目配置文件声明通用接口：

```ts
// src/config/dictionary.ts
import { getDictionaryOptionsApi } from "../api/dictionary";

export default { load: getDictionaryOptionsApi };
```

在现有 Vue 应用中安装：

```ts
import { createDictionaryPlugin } from "@robot-admin/dictionary/vue";
import dictionaryConfig from "./config/dictionary";

app.use(createDictionaryPlugin(dictionaryConfig));
```

接口签名为 `load(code, { signal, scope })`，返回 `{ value, label, disabled? }[]`。响应解包只做一次，远程字典按后台码加载，无需逐项注册。仅用静态枚举时省略 `load`。见[接口适配](./docs/guide.md#二接口适配一次)与[配置项](./docs/guide.md#一插件与配置接入一次)。

## 页面使用

**取选项或单值标签：**

```ts
import { useDictionary } from "@robot-admin/dictionary/vue";

const status = useDictionary("order_status");
// status.options / loading / error 是响应式值；status.label(value) 同步翻译。
```

**批量绑定详情字段：**

```ts
import { ref } from "vue";
import { useDictLabels } from "@robot-admin/dictionary/vue";

const order = ref({ status: 0 });
const { labels } = useDictLabels(order, { status: "order_status" });
```

```vue
<span>{{ labels.status }}</span>
```

| 场景                           | 用法                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| 下拉、搜索                     | 把 `status.options.value` 绑定控件的普通选项属性，加载和重试用 `loading/error/reload` |
| 列表、提示                     | 调用 `status.label(value)`，保留原始模型                                              |
| 详情、弹窗                     | 普通字段映射配合 `labels.status`，按可见状态启用                                      |
| 静态枚举、专属接口、脚本、导入 | 见[完整场景示例](./docs/guide.md#三按场景使用)                                        |

## 默认行为

- 安装不请求，消费时按需加载；同码请求合并，按应用隔离缓存。
- 成功缓存5分钟、失败冷却5秒、超时15秒，均可在配置文件覆盖。
- 失败保留同身份旧标签，错误局部可见；未知值保留原码，翻译不修改模型。
- 零、布尔值、字符串原码严格区分；身份切换隔离旧请求，插件管理卸载清理。

## 文档

[接入与场景指南](./docs/guide.md) · [0.5升级说明](./docs/guide.md#升级说明) · [变更记录](./CHANGELOG.md) · [RobotAdmin项目组合](https://github.com/ChenyCHENYU/Robot_Admin/blob/main/docs/dictionaries.md)

维护命令与发布约定见[仓库指南](https://github.com/ChenyCHENYU/robot-admin-packages/blob/main/docs/maintenance.md)。

## 许可证

[MIT License](./LICENSE) · Robot Packages

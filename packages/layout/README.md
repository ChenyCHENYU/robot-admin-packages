# @robot-admin/layout

> 布局和设置管理系统 - 为 Robot Admin 提供完整的布局配置管理能力（含 UI 组件）

[![npm version](https://img.shields.io/npm/v/@robot-admin/layout.svg)](https://www.npmjs.com/package/@robot-admin/layout)
[![license](https://img.shields.io/npm/l/@robot-admin/layout.svg)](https://github.com/ChenyCHENYU/robot-admin-packages/blob/main/LICENSE)

当前版本：`3.2.0`。

---

## ✨ 特性

- 🧠 **智能容器模式** - `C_LayoutContainer` 自动分发布局骨架，主项目只需提供业务插槽
- 🎨 **6 种布局模式** - 左侧 / 顶部 / 混合 / 顶部混合 / 反转混合 / 卡片布局
- 🎯 **6 套主题预设** - 科技蓝 / 清新绿 / 商务灰 / 活力橙 / 优雅紫 / 经典红
- 🧩 **开箱即用** - 提供 SettingsDrawer 设置抽屉，覆盖外观 / 布局 / 功能配置
- 🧭 **菜单展开方式** - 内置传统展开 / 右侧面板两种菜单展开模式配置
- 🔌 **插槽系统** - 灵活的 slot 机制，主项目仅关注业务组件
- 🪄 **精简适配** - `provideLayout()` 从最小宿主输入自动创建完整响应式上下文
- 🧱 **分层入口** - `core` / `vue` / `naive` 按依赖边界独立消费
- 🎨 **作用域样式** - 支持带命名空间的 CSS 变量、指定挂载目标与精确清理
- ♿ **键盘与焦点可访问性** - 抽屉/菜单支持 Escape、方向键、焦点恢复与语义属性
- 🛡️ **安全设置导入** - 对枚举、布尔值、数值范围与主题色进行运行时校验
- 🚀 **TypeScript** - 完整类型支持

---

## 🏗️ 架构设计

```
@robot-admin/layout/core
  └─ 设置协议、校验、常量、纯函数（无运行时依赖）

@robot-admin/layout/vue
  └─ Context、Store、Router、Headless Controller（不依赖 UI 组件库）

@robot-admin/layout/naive
  └─ 聚合 vue 层 + 现有 6 种布局、响应式菜单、SettingsDrawer（Naive UI 呈现）

@robot-admin/layout
  └─ 3.x 兼容入口，继续聚合 vue + naive，不改变历史用法
```

未来 Element Plus 适配只复用 `core` 与 `vue` 层并新增呈现入口，不复制设置事务、菜单测量、
缓存或六套布局状态逻辑。

---

## 📁 目录结构

```
src/
├── index.ts                           # 主入口（统一导出）
├── vue/index.ts                       # Vue Headless 入口（无 UI 库）
├── naive/index.ts                     # Naive UI 呈现入口
├── setup.ts                           # 一键初始化 setupLayout()
├── core/                              # 无框架设置协议、校验与纯函数
│   ├── index.ts
│   ├── settings.ts
│   └── types.ts
├── components/
│   ├── C_LayoutContainer/             # 智能布局容器（主入口组件）
│   │   └── index.vue
│   ├── layouts/                       # 📐 6 种布局骨架
│   │   ├── SideLayout/                #   C_SideLayout 左侧菜单布局
│   │   │   ├── index.vue
│   │   │   └── index.scss
│   │   ├── TopLayout/                 #   C_TopLayout 顶部菜单布局
│   │   │   ├── index.vue
│   │   │   └── index.scss
│   │   ├── MixLayout/                 #   C_MixLayout 左侧混合布局
│   │   │   ├── index.vue
│   │   │   └── index.scss
│   │   ├── MixTopLayout/              #   C_MixTopLayout 顶部混合布局
│   │   │   ├── index.vue
│   │   │   └── index.scss
│   │   ├── ReverseHorizontalMixLayout/ #  C_ReverseHorizontalMixLayout
│   │   │   ├── index.vue
│   │   │   └── index.scss
│   │   └── CardLayout/                #   C_CardLayout 卡片布局
│   │       ├── index.vue
│   │       └── index.scss
│   ├── SettingsDrawer/                # ⚙️ 设置抽屉
│   │   ├── index.vue
│   │   └── data.ts
│   ├── BrandLogo/                     # 品牌 Logo
│   ├── ResponsiveMenu/                # 响应式水平菜单
│   ├── IconMenu/                      # 一级图标菜单
│   ├── FloatingMenu/                  # 悬浮二级菜单
│   ├── SideMenu/                      # 右侧二级菜单
│   ├── DrawerMenu/                    # 抽屉式网格菜单
│   └── MenuTrigger/                   # 菜单触发区域
├── composables/
│   ├── useLayoutContext.ts            # LayoutContext provide/inject
│   ├── createLayoutContext.ts         # 最小宿主输入适配助手
│   ├── useLayoutCssVariables.ts       # 作用域 CSS 变量绑定
│   ├── useResponsiveMenu.ts           # UI 无关的菜单测量
│   ├── useSettingsController.ts       # UI 无关的设置事务与副作用
│   ├── useLayoutCache.ts              # 页面缓存管理
│   └── useMenuSplit.ts                # 菜单拆分（一级/二级分离）
├── utils/menu.ts                      # 宿主菜单标准化
├── stores/
│   └── settings.ts                    # 布局设置 Pinia Store
├── styles/
│   ├── layouts.scss                   # 布局骨架公共样式
│   └── settings.scss                  # 设置组件样式
├── constants/
│   └── index.ts                       # 预设常量
└── types/
    ├── index.ts                       # 类型定义
    └── menu.ts                        # 菜单类型
```

---

## 📦 安装

```bash
bun add @robot-admin/layout naive-ui
```

**Peer Dependencies**: `vue ^3.4` · `vue-router ^4.0` · `pinia ^2.0 || ^3.0`。
`naive-ui ^2.38` 仅在使用根入口或 `/naive` 时需要，并已声明为 optional peer。

> `@robot-admin/layout/vue` 不导入 Naive UI 或 Element Plus。当前版本建立了双 UI 适配边界，
> 但尚未发布 Element Plus 呈现组件，避免在没有真实项目验证时制造第二套未使用 UI。

### 入口选择

| 使用场景                     | 唯一推荐入口                  | 说明                                  |
| ---------------------------- | ----------------------------- | ------------------------------------- |
| 新建或升级 Naive UI 项目     | `@robot-admin/layout/naive`   | 聚合组件、Store、Context 和工具       |
| Element Plus 项目复用布局逻辑 | `@robot-admin/layout/vue`     | 无 UI 库依赖，视图暂由宿主实现        |
| Node/服务端只处理设置协议    | `@robot-admin/layout/core`    | 无 Vue、Pinia、Router 和 UI 运行时    |
| 现有 3.x 项目                | `@robot-admin/layout`         | 兼容入口，可继续使用，不要求立即迁移  |

---

## 🚀 快速开始

### 1. 初始化

```typescript
// main.ts
import { createApp } from "vue";
import { createPinia } from "pinia";
import { setupLayout } from "@robot-admin/layout/naive";
import "@robot-admin/layout/naive/style"; // Naive UI 布局样式
import App from "./App.vue";

const app = createApp(App);
app.use(createPinia());

setupLayout(app, {
  // 可选：同步到宿主自己的主题系统
  onThemeModeChange: (mode) => syncAppTheme(mode),
  defaults: {
    layoutMode: "side",
    primaryColor: "#409eff",
  },
});

app.mount("#app");
```

### 2. 提供宿主数据并使用布局容器

```vue
<template>
  <C_LayoutContainer>
    <template #logo><AppLogo /></template>
    <template #menu="{ collapsed }"
      ><AppMenu :collapsed="collapsed"
    /></template>
    <template #header><AppHeader /></template>
    <template #tags-view><AppTags /></template>
    <template #footer><AppFooter /></template>
  </C_LayoutContainer>
</template>

<script setup lang="ts">
import {
  C_LayoutContainer,
  provideLayout,
  useSettingsStore,
  type MenuOptions,
} from "@robot-admin/layout/naive";

const props = defineProps<{
  menus: MenuOptions[];
  isDark: boolean;
}>();

provideLayout({
  settings: useSettingsStore(),
  menus: () => props.menus,
  isDark: () => props.isDark,
  brand: { name: "My Admin", homePath: "/home" },
});
</script>
```

`provideLayout()` 会自动桥接布局模式、折叠状态、尺寸、动画和显示开关。只有需要完全
自定义响应式来源时，才直接构造 `LayoutContext` 并调用 `provideLayoutContext()`。

### 3. 添加设置抽屉

```vue
<script setup lang="ts">
import { ref } from "vue";
import { NDialogProvider, NMessageProvider } from "naive-ui";
import { SettingsDrawer } from "@robot-admin/layout/naive";

const visible = ref(false);
const settingsActions = {
  clearCache: () => localStorage.removeItem("my-app-disposable-cache"),
};
</script>

<template>
  <button @click="visible = true">⚙️ 设置</button>
  <NDialogProvider>
    <NMessageProvider>
      <SettingsDrawer v-model:show="visible" :actions="settingsActions">
        <template #appearance-prepend>
          <AppThemeExtension />
        </template>
      </SettingsDrawer>
    </NMessageProvider>
  </NDialogProvider>
</template>
```

`SettingsDrawer` 使用 Naive UI 的 Message/Dialog API，因此必须位于
`NMessageProvider` 和 `NDialogProvider` 下；应用根部已有 Provider 时无需重复包裹。

`SettingsDrawer` 不再自行清空 `localStorage` / `sessionStorage`。缓存清理由宿主通过
`actions.clearCache` 明确实现，避免误删登录态、语言和业务数据。可用扩展插槽：
`appearance-prepend/append`、`layout-prepend/after-mode/append`、
`features-prepend/append`；插槽均暴露当前 `settings`。

---

## 📐 布局模式

| 模式         | 常量值                   | 一级菜单   | 二级菜单       | 适用场景                 |
| ------------ | ------------------------ | ---------- | -------------- | ------------------------ |
| **左侧菜单** | `side`                   | 左侧栏     | 左侧栏（折叠） | 经典后台管理（ERP、CRM） |
| **顶部菜单** | `top`                    | 顶部横向   | 顶部下拉       | 菜单少，需更宽内容区     |
| **混合布局** | `mix`                    | 左侧图标栏 | 悬浮弹出       | 一级菜单少，二级多       |
| **顶部混合** | `mix-top`                | 左侧图标栏 | 顶部横向       | 全局导航 + 侧边详情      |
| **反转混合** | `reverse-horizontal-mix` | 顶部横向   | 右侧栏         | 特殊需求，右手操作       |
| **卡片布局** | `card-layout`            | hover 抽屉 | 网格铺开       | 应用首页 / 工作台        |

---

## 🎨 主题预设

| 预设   | 主题色    | 图标 |
| ------ | --------- | ---- |
| 科技蓝 | `#409eff` | 💙   |
| 清新绿 | `#52c41a` | 💚   |
| 商务灰 | `#595959` | 🖤   |
| 活力橙 | `#fa8c16` | 🧡   |
| 优雅紫 | `#722ed1` | 💜   |
| 经典红 | `#f5222d` | ❤️   |

---

## ⚙️ Store API

### `useSettingsStore()`

```typescript
import { useSettingsStore } from "@robot-admin/layout/vue";

const settings = useSettingsStore();

// 读取
settings.layoutMode; // 'side' | 'top' | 'mix' | ...
settings.menuExpandMode; // 'inline' | 'panel'
settings.primaryColor; // '#409eff'
settings.themeMode; // 'light' | 'dark' | 'system'

// 修改
settings.layoutMode = "mix";
settings.menuExpandMode = "panel";
settings.updateThemeMode("dark");
settings.applyPreset(THEME_PRESETS[0]);
settings.resetSettings();
```

### 设置属性一览

| 属性                    | 默认值      | 作用方     | 说明                                 |
| ----------------------- | ----------- | ---------- | ------------------------------------ |
| `themeMode`             | `'light'`   | 宿主回调   | 标准主题模式                         |
| `primaryColor`          | `'#409eff'` | 包内       | 主题色与派生 CSS 变量                |
| `borderRadius`          | `'medium'`  | 包内       | 圆角 CSS 变量                        |
| `transitionType`        | `'slide'`   | 包内       | 页面动画类型                         |
| `enableTransition`      | `true`      | 包内       | 是否启用页面动画                     |
| `layoutMode`            | `'side'`    | 包内       | 当前布局模式                         |
| `menuExpandMode`        | `'inline'`  | 宿主菜单   | 菜单展开方式                         |
| `collapsed`             | `false`     | 包内/宿主  | 共享侧栏折叠状态                     |
| `fixedHeader`           | `true`      | 宿主头部   | 固定头部策略                         |
| `showBreadcrumb`        | `true`      | 宿主头部   | 显示面包屑                           |
| `showBreadcrumbIcon`    | `true`      | 宿主头部   | 显示面包屑图标                       |
| `showTagsView`          | `true`      | 包内       | 显示标签页                           |
| `tagsViewHeight`        | `44`        | 包内       | 标签页高度 (px)                      |
| `tagsViewStyle`         | `'default'` | 宿主标签页 | 标签页风格                           |
| `showFooter`            | `true`      | 包内       | 显示页脚                             |
| `sidebarWidth`          | `220`       | 包内       | 侧边栏宽度 (px)                      |
| `sidebarCollapsedWidth` | `64`        | 包内       | 折叠宽度 (px)                        |
| `headerHeight`          | `56`        | 包内/宿主  | 头部高度 (px)                        |
| `enableHotkeys`         | `true`      | 宿主扩展   | 是否启用宿主快捷键                   |
| `version`               | `'3.2.0'`   | 兼容字段   | 已废弃；配置迁移请使用 schemaVersion |

“宿主”字段由 Store 和导入导出协议统一维护，但布局包不会越权修改宿主业务组件；这种边界
避免重复实现面包屑、快捷键和标签页等业务能力。

### CSS 变量

默认 Store 同时维护带命名空间的新变量与 3.x 兼容变量：

```css
--ra-layout-primary-color: #409eff;
--ra-layout-primary-color-hover: #4aa8ff;
--ra-layout-primary-color-pressed: #368af5;
--ra-layout-sidebar-width: 220px;
--ra-layout-sidebar-collapsed-width: 64px;
--ra-layout-header-height: 56px;
--ra-layout-tags-view-height: 44px;
--ra-layout-border-radius: 6px;
```

微前端或嵌入式页面可以关闭默认根节点同步，并绑定到自己的容器；`dispose()` 会恢复目标原值：

```typescript
import {
  bindLayoutCssVariables,
  createSettingsStore,
} from "@robot-admin/layout/vue";

const settings = createSettingsStore({
  id: "workspace-settings",
  syncCssVariables: false,
})();
const cssBinding = bindLayoutCssVariables(settings, {
  target: document.querySelector("#workspace"),
});

// 微前端卸载时
cssBinding.dispose();
```

---

## 🧩 C_LayoutContainer Slots

| Slot 名称       | 说明           | 适用布局                      |
| --------------- | -------------- | ----------------------------- |
| `#logo`         | 品牌 Logo      | 全部                          |
| `#menu`         | 垂直菜单       | Side                          |
| `#header`       | 完整头部       | Side / Mix                    |
| `#header-extra` | 头部右侧操作区 | Top / MixTop / Reverse / Card |
| `#top-menu`     | 水平菜单       | Top / MixTop / Reverse        |
| `#tags-view`    | 标签页         | 全部                          |
| `#footer`       | 页脚           | 全部                          |
| `#brand`        | 顶部品牌区     | MixTop                        |
| `#menu-trigger` | 菜单触发区     | Card                          |
| `#drawer-menu`  | 抽屉菜单       | Card                          |

---

## 📖 类型定义

```typescript
type LayoutMode =
  "side" | "top" | "mix" | "mix-top" | "reverse-horizontal-mix" | "card-layout";
type MenuExpandMode = "inline" | "panel";
type TransitionType = "fade" | "slide" | "zoom" | "none";
type BorderRadiusSize = "small" | "medium" | "large";
type TagsViewStyle = "default" | "card" | "smart";
type ThemeMode = "light" | "dark" | "system";

interface ThemePreset {
  name: string;
  icon: string;
  primaryColor: string;
}
interface SettingsStoreOptions {
  id?: string;
  defaults?: Partial<SettingsState>;
  onThemeModeChange?: (mode: ThemeMode) => void | Promise<void>;
  syncCssVariables?: boolean;
}
```

---

## 🔧 高级用法

### 自定义 Settings Store

```typescript
import { createSettingsStore } from "@robot-admin/layout/vue";

export const useSettingsStore = createSettingsStore({
  // 多实例或微前端中必须保证唯一；单实例可省略
  id: "workspace-settings",
  defaults: { layoutMode: "mix", primaryColor: "#722ed1" },
  onThemeModeChange: async (mode) => {
    const themeStore = useThemeStore();
    await themeStore.setMode(mode);
  },
});
```

### 校验外部设置

从文件、URL 或远端接口加载的设置属于不可信输入，写入 Store 前应先校验：

```typescript
import { sanitizeLayoutSettingsConfig } from "@robot-admin/layout/core";
import { useSettingsStore } from "@robot-admin/layout/vue";

const imported = JSON.parse(await file.text());
// 一次校验完整文件，失败时不会产生部分状态写入。
const config = sanitizeLayoutSettingsConfig(imported);
const safePatch = config.settings ?? {};
const settings = useSettingsStore();

if (safePatch.themeMode !== undefined) {
  await settings.updateThemeMode(safePatch.themeMode);
  delete safePatch.themeMode;
}
settings.$patch(safePatch);
```

未知字段会被忽略以便向前兼容；已知字段类型错误、越界值、非法主题色或旧的
`themeMode: "auto"` 会抛出明确错误。设置抽屉内置的导入功能已执行同一校验。

`useLayoutCache()` 默认不会输出开发日志，也不会向 `window` 暴露调试函数；仅在
受控的本地开发场景显式设置 `enableDevLog` / `exposeToWindow`。

### `C_*Layout` 命名约定

`C_LayoutContainer`、`C_SideLayout`、`C_TopLayout` 等是唯一推荐、持续维护的公开组件名称，
与 Robot_Admin 的全局公共组件规范一致。无前缀名称不再作为第二套用法出现在示例中；它们只为
已发布的 3.1 消费方保留为带 `@deprecated` 标记的 3.x 兼容出口，并指向同一个组件对象，
不会产生第二份实现。新代码统一使用 `C_*`，4.0 再删除无前缀兼容名称。

### 3.2 升级说明

- 新增 `/vue` 与 `/naive` 独立入口；`/naive` 聚合 Vue Headless 能力，Naive 项目只需一个
  脚本入口，3.x 根入口继续完全兼容。
- `createLayoutContext()` 改为依赖结构化 `LayoutSettingsSource`，可接入包内 Pinia Store、
  宿主 Store 或其他 Vue 响应式状态。
- 新增 `useSettingsController()`、`useResponsiveMenu()`、`normalizeLayoutMenus()` 和
  `bindLayoutCssVariables()`，供其他 UI 适配器复用。
- SettingsDrawer 已复用 Headless controller，自定义 Store 的局部重置会恢复该实例自己的默认值。
- 布局样式、动画名和新 CSS 变量使用 `ra-layout` 边界；旧 CSS 变量在 3.x 继续同步。
- `C_SideLayout` 等 `C_*Layout` 重新确立为唯一正式组件名称；无前缀名称仅作为带
  `@deprecated` 标记的 3.x 兼容出口，4.0 移除。

### 3.1 升级说明

- 新增 `createLayoutContext()` 与 `provideLayout()`，用于精简普通项目的上下文桥接代码。
- 原有 `LayoutContext`、`provideLayoutContext()` 和所有组件/插槽继续兼容。
- 3.1 曾建议从 `C_*Layout` 迁移到无前缀名称；3.2 已根据项目统一命名规范纠正该策略。

### 3.0 升级说明

- 现有根入口、6 种布局、组件名、slot 名和 CSS 入口保持兼容。
- `LayoutContext.collapsed` 为可选的双向状态；提供后，侧栏与宿主头部共享同一折叠状态。
- 自定义 Store 可通过 `setupLayout()` 注入，也可用 `SettingsDrawer :store="store"` 显式传入。
- `enableTransition: false` 现在会真正关闭路由过渡，但保留已选择的动画类型。
- 缓存清理改为宿主白名单动作；从 2.x 升级时请传入 `actions.clearCache`。
- `@robot-admin/theme` 不再是 peer dependency；需要主题联动时使用 `onThemeModeChange`。

多 Store 实例可以拥有独立状态。CSS 变量可通过 `bindLayoutCssVariables()` 隔离到宿主容器；
设置抽屉也已支持由 adapter controller 指定视觉根节点和水印容器。默认值仍保持页面级行为，
保证 3.x 现有项目无迁移成本。

### 单独使用布局骨架

```typescript
import {
  C_SideLayout,
  C_TopLayout,
  C_MixLayout,
} from "@robot-admin/layout/naive";
```

> ⚠️ 直接使用骨架组件需自行提供 `LayoutContext`（通过 `provide`），推荐使用 `C_LayoutContainer`

### 样式导入方式

```typescript
// 方式 1：编译后 CSS（推荐）
import "@robot-admin/layout/naive/style";

// 方式 2：SCSS 源文件（可定制）
import "@robot-admin/layout/style.scss";

// 方式 3：仅布局骨架基础样式
import "@robot-admin/layout/layouts.scss";
```

---

## 🔗 相关链接

- [Robot Admin 主项目](https://github.com/ChenyCHENYU/Robot_Admin)
- [@robot-admin/theme](https://www.npmjs.com/package/@robot-admin/theme)
- [Naive UI](https://www.naiveui.com/)

## 📄 License

MIT © ChenYu

# @robot-admin/layout

> 布局和设置管理系统 - 为 Robot Admin 提供完整的布局配置管理能力（含 UI 组件）

---

## ✨ 特性

- 🧠 **智能容器模式** - `C_LayoutContainer` 自动分发布局骨架，主项目只需提供业务插槽
- 🎨 **6 种布局模式** - 左侧 / 顶部 / 混合 / 顶部混合 / 反转混合 / 卡片布局
- 🎯 **6 套主题预设** - 科技蓝 / 清新绿 / 商务灰 / 活力橙 / 优雅紫 / 经典红
- 🧩 **开箱即用** - 提供 SettingsDrawer 设置抽屉，覆盖外观 / 布局 / 功能配置
- 🔌 **插槽系统** - 灵活的 slot 机制，主项目仅关注业务组件
- 🎨 **CSS 变量同步** - 配置变更自动同步到 CSS 变量，样式实时响应
- 🚀 **TypeScript** - 完整类型支持

---

## 🏗️ 架构设计

```
┌──────────────────────────────────────┐
│  主项目 (Robot_Admin)                 │
│  ├─ useLayoutBridge() 适配器          │
│  └─ 提供业务插槽 (Header/Menu/Tags)   │
└──────────────┬───────────────────────┘
               │ LayoutContext (provide/inject)
               ▼
┌──────────────────────────────────────┐
│  @robot-admin/layout                  │
│  ├─ C_LayoutContainer (智能容器)      │
│  │   └─ 根据 layoutMode 自动调度      │
│  ├─ layouts/ (6 种布局骨架)           │
│  │   ├─ SideLayout                    │
│  │   ├─ TopLayout                     │
│  │   ├─ MixLayout                     │
│  │   ├─ MixTopLayout                  │
│  │   ├─ ReverseHorizontalMixLayout    │
│  │   └─ CardLayout                    │
│  └─ SettingsDrawer (设置 UI)          │
└──────────────────────────────────────┘
```

---

## 📁 目录结构

```
src/
├── index.ts                           # 主入口（统一导出）
├── setup.ts                           # 一键初始化 setupLayout()
├── components/
│   ├── C_LayoutContainer/             # 智能布局容器（主入口组件）
│   │   └── index.vue
│   ├── layouts/                       # 📐 6 种布局骨架
│   │   ├── SideLayout/                #   左侧菜单布局
│   │   │   ├── index.vue
│   │   │   └── index.scss
│   │   ├── TopLayout/                 #   顶部菜单布局
│   │   │   ├── index.vue
│   │   │   └── index.scss
│   │   ├── MixLayout/                 #   左侧混合布局
│   │   │   ├── index.vue
│   │   │   └── index.scss
│   │   ├── MixTopLayout/              #   顶部混合布局
│   │   │   ├── index.vue
│   │   │   └── index.scss
│   │   ├── ReverseHorizontalMixLayout/ #  反转混合布局
│   │   │   ├── index.vue
│   │   │   └── index.scss
│   │   └── CardLayout/                #   卡片布局
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
│   ├── useLayoutCache.ts              # 页面缓存管理
│   └── useMenuSplit.ts                # 菜单拆分（一级/二级分离）
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
bun add @robot-admin/layout @robot-admin/theme naive-ui
# or
pnpm add @robot-admin/layout @robot-admin/theme naive-ui
```

**Peer Dependencies**: `vue ^3.4` · `vue-router ^4.0` · `pinia ^2.0 || ^3.0` · `naive-ui ^2.38` · `@robot-admin/theme ^0.1`

---

## 🚀 快速开始

### 1. 初始化

```typescript
// main.ts
import { createApp } from "vue";
import { createPinia } from "pinia";
import { setupLayout } from "@robot-admin/layout";
import { useThemeStore } from "@robot-admin/theme";
import "@robot-admin/layout/style";  // 导入样式
import App from "./App.vue";

const app = createApp(App);
app.use(createPinia());

const themeStore = useThemeStore();
themeStore.init();

setupLayout(app, {
  onThemeModeChange: (mode) => themeStore.setMode(mode),
  defaults: {
    layoutMode: "side",
    primaryColor: "#409eff",
  },
});

app.mount("#app");
```

### 2. 使用布局容器

```vue
<!-- src/components/C_Layout/index.vue -->
<template>
  <C_LayoutContainer>
    <template #logo><AppLogo /></template>
    <template #menu="{ collapsed }"><AppMenu :collapsed="collapsed" /></template>
    <template #header><AppHeader /></template>
    <template #tags-view><AppTags /></template>
    <template #footer><AppFooter /></template>
  </C_LayoutContainer>
</template>

<script setup lang="ts">
import { C_LayoutContainer } from "@robot-admin/layout";
</script>
```

### 3. 添加设置抽屉

```vue
<script setup lang="ts">
import { ref } from "vue";
import { SettingsDrawer } from "@robot-admin/layout";

const visible = ref(false);
</script>

<template>
  <button @click="visible = true">⚙️ 设置</button>
  <SettingsDrawer v-model:show="visible" />
</template>
```

---

## 📐 布局模式

| 模式 | 常量值 | 一级菜单 | 二级菜单 | 适用场景 |
|------|--------|----------|----------|----------|
| **左侧菜单** | `side` | 左侧栏 | 左侧栏（折叠） | 经典后台管理（ERP、CRM） |
| **顶部菜单** | `top` | 顶部横向 | 顶部下拉 | 菜单少，需更宽内容区 |
| **混合布局** | `mix` | 左侧图标栏 | 悬浮弹出 | 一级菜单少，二级多 |
| **顶部混合** | `mix-top` | 左侧图标栏 | 顶部横向 | 全局导航 + 侧边详情 |
| **反转混合** | `reverse-horizontal-mix` | 顶部横向 | 右侧栏 | 特殊需求，右手操作 |
| **卡片布局** | `card-layout` | hover 抽屉 | 网格铺开 | 应用首页 / 工作台 |

---

## 🎨 主题预设

| 预设 | 主题色 | 图标 |
|------|--------|------|
| 科技蓝 | `#409eff` | 💙 |
| 清新绿 | `#52c41a` | 💚 |
| 商务灰 | `#595959` | 🖤 |
| 活力橙 | `#fa8c16` | 🧡 |
| 优雅紫 | `#722ed1` | 💜 |
| 经典红 | `#f5222d` | ❤️ |

---

## ⚙️ Store API

### `useSettingsStore()`

```typescript
import { useSettingsStore } from "@robot-admin/layout";

const settings = useSettingsStore();

// 读取
settings.layoutMode;       // 'side' | 'top' | 'mix' | ...
settings.primaryColor;     // '#409eff'
settings.themeMode;        // 'light' | 'dark' | 'auto'

// 修改
settings.layoutMode = "mix";
settings.updateThemeMode("dark");
settings.applyPreset(THEME_PRESETS[0]);
settings.resetSettings();
```

### 设置属性一览

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `themeMode` | `ThemeMode` | `'light'` | 主题模式 |
| `primaryColor` | `string` | `'#409eff'` | 主题色 |
| `layoutMode` | `LayoutMode` | `'side'` | 布局模式 |
| `borderRadius` | `BorderRadiusSize` | `'medium'` | 圆角大小 |
| `transitionType` | `TransitionType` | `'slide'` | 页面动画 |
| `fixedHeader` | `boolean` | `true` | 固定头部 |
| `showBreadcrumb` | `boolean` | `true` | 显示面包屑 |
| `showTagsView` | `boolean` | `true` | 显示标签页 |
| `showFooter` | `boolean` | `true` | 显示页脚 |
| `sidebarWidth` | `number` | `220` | 侧边栏宽度 (px) |
| `sidebarCollapsedWidth` | `number` | `64` | 折叠宽度 (px) |
| `headerHeight` | `number` | `56` | 头部高度 (px) |

### CSS 变量

配置变更自动同步到以下 CSS 变量：

```css
--primary-color: #409eff;
--primary-color-hover: #66b1ff;
--primary-color-pressed: #3a8ee6;
--sidebar-width: 220px;
--sidebar-collapsed-width: 64px;
--header-height: 56px;
--tags-view-height: 40px;
--border-radius: 6px;
```

---

## 🧩 C_LayoutContainer Slots

| Slot 名称 | 说明 | 适用布局 |
|-----------|------|----------|
| `#logo` | 品牌 Logo | 全部 |
| `#menu` | 垂直菜单 | Side |
| `#header` | 完整头部 | Side / Mix |
| `#header-extra` | 头部右侧操作区 | Top / MixTop / Reverse / Card |
| `#top-menu` | 水平菜单 | Top / MixTop / Reverse |
| `#tags-view` | 标签页 | 全部 |
| `#footer` | 页脚 | 全部 |
| `#brand` | 顶部品牌区 | MixTop |
| `#menu-trigger` | 菜单触发区 | Card |
| `#drawer-menu` | 抽屉菜单 | Card |

---

## 📖 类型定义

```typescript
type LayoutMode = "side" | "top" | "mix" | "mix-top" | "reverse-horizontal-mix" | "card-layout";
type TransitionType = "fade" | "slide" | "zoom" | "none";
type BorderRadiusSize = "small" | "medium" | "large";
type TagsViewStyle = "default" | "card" | "smart";
type ThemeMode = "light" | "dark" | "auto";

interface ThemePreset { name: string; icon: string; primaryColor: string; }
interface SettingsStoreOptions {
  defaults?: Partial<SettingsState>;
  onThemeModeChange?: (mode: ThemeMode) => void | Promise<void>;
}
```

---

## 🔧 高级用法

### 自定义 Settings Store

```typescript
import { createSettingsStore } from "@robot-admin/layout";

export const useSettingsStore = createSettingsStore({
  defaults: { layoutMode: "mix", primaryColor: "#722ed1" },
  onThemeModeChange: async (mode) => {
    const themeStore = useThemeStore();
    await themeStore.setMode(mode);
  },
});
```

### 单独使用布局骨架

```typescript
import { SideLayout, TopLayout, MixLayout } from "@robot-admin/layout";
```

> ⚠️ 直接使用骨架组件需自行提供 `LayoutContext`（通过 `provide`），推荐使用 `C_LayoutContainer`

### 样式导入方式

```typescript
// 方式 1：编译后 CSS（推荐）
import "@robot-admin/layout/style";

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

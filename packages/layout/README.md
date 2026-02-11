# @robot-admin/layout

> 布局和设置管理系统 - 为 Robot Admin 提供完整的布局配置管理能力（含 UI 组件）

## ✨ 特性

- 🎨 **多布局支持** - 左侧/顶部/混合等 6 种布局模式
- 🧠 **智能容器模式** - C_LayoutContainer 自动分发布局骨架，主项目只需提供业务插槽
- 🎯 **主题预设** - 内置 6 套精美主题预设方案
- 🧩 **开箱即用** - 提供完整的设置抽屉 UI 组件
- ⚙️ **丰富配置** - 面包屑、标签页、页脚等多维度配置
- 🎨 **样式灵活** - 支持 SCSS 源文件或编译后 CSS
- 🔌 **高度可配置** - 灵活的初始化选项和插槽系统
- 🚀 **TypeScript** - 完整的类型支持

## 🏗️ 架构设计

### 智能容器模式

包采用**智能容器 + 业务插槽**的分离架构：

```
┌─────────────────────────────────────┐
│  主项目 (Robot_Admin)                │
│  ├─ 提供业务插槽内容 (Header/Menu)   │
│  ├─ useLayoutBridge 适配器           │
│  └─ useLayoutCache 缓存管理          │
└────────────┬────────────────────────┘
             │ 传递 LayoutContext
             ↓
┌─────────────────────────────────────┐
│  @robot-admin/layout 包              │
│  ├─ C_LayoutContainer (智能容器)     │
│  │   └─ 根据 layoutMode 自动调度     │
│  ├─ 6个布局骨架组件                  │
│  │   ├─ SideLayout                   │
│  │   ├─ TopLayout                    │
│  │   ├─ MixLayout                    │
│  │   ├─ MixTopLayout                 │
│  │   ├─ ReverseHorizontalMixLayout   │
│  │   └─ CardLayout                   │
│  └─ SettingsDrawer (设置UI)          │
└─────────────────────────────────────┘
```

**核心组件：**

- **C_LayoutContainer**: 智能容器组件，根据 `layoutMode` 自动选择并渲染对应的布局骨架
- **布局骨架组件**: 6 个预制布局结构，只负责 UI 框架，不包含业务逻辑
- **LayoutContext**: 接口协议，定义主项目需要提供的数据和插槽
- **SettingsDrawer**: 开箱即用的设置面板 UI

**工作流程：**

1. 主项目通过 `useLayoutBridge` 将业务数据（菜单、权限等）转换为 `LayoutContext`
2. C_LayoutContainer 接收 context，根据 `layoutMode` 自动选择布局骨架
3. 布局骨架渲染框架结构，并通过插槽注入主项目的业务组件（Header/Menu）
4. 用户可通过 SettingsDrawer 切换布局模式，无需重启应用

## 📦 安装

```bash
npm install @robot-admin/layout @robot-admin/theme naive-ui
# or
pnpm add @robot-admin/layout @robot-admin/theme naive-ui
# or
bun add @robot-admin/layout @robot-admin/theme naive-ui
```

**依赖说明**:

- `@robot-admin/theme` - 主题管理系统（必需）
- `naive-ui` - UI 组件库（必需，用于 SettingsDrawer）
- `vue` - Vue 3.4+
- `pinia` - 状态管理

## 🚀 快速开始

### 方式一：使用 setupLayout（推荐）

```typescript
// main.ts
import { createApp } from "vue";
import { createPinia } from "pinia";
import { setupLayout } from "@robot-admin/layout";
import { useThemeStore } from "@robot-admin/theme";
import "@robot-admin/layout/style.scss"; // 或 style.css
import App from "./App.vue";

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);

// 初始化主题系统
const themeStore = useThemeStore();
themeStore.init();

// 初始化布局系统（自动同步 theme store）
setupLayout(app, {
  onThemeModeChange: async (mode) => {
    await themeStore.setMode(mode);
  },
  defaults: {
    layoutMode: "side",
    primaryColor: "#409eff",
  },
});

app.mount("#app");
```

### 方式二：手动初始化

```typescript
// main.ts
import { createApp } from "vue";
import { createPinia } from "pinia";
import { useThemeStore } from "@robot-admin/theme";
import { useSettingsStore } from "@robot-admin/layout";
import App from "./App.vue";

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);

// 初始化主题系统
const themeStore = useThemeStore();
themeStore.init();

// 初始化设置系统
const settingsStore = useSettingsStore();
settingsStore.syncCSSVariables();

app.mount("#app");
```

## 🎨 样式导入

### 使用 SCSS（推荐，可定制）

```scss
// 全局 SCSS 文件
@import "@robot-admin/layout/style.scss";

// 可以覆盖变量
:root {
  --app-primary: #409eff;
  --app-border-light: #e5e7eb;
}
```

### 使用编译后的 CSS

```typescript
// main.ts 或组件中
import "@robot-admin/layout/style.css";
```

## 🧩 UI 组件使用

### SettingsDrawer - 设置抽屉

完整的布局配置 UI，包含外观/布局/功能三大模块

```vue
<template>
  <div>
    <!-- 触发按钮 -->
    <button @click="visible = true">⚙️ 打开设置</button>

    <!-- 设置抽屉 -->
    <SettingsDrawer v-model:show="visible" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { SettingsDrawer } from "@robot-admin/layout";

const visible = ref(false);
</script>
```

#### Props

- `show` - 控制抽屉显示/隐藏（支持 v-model）

#### 功能模块

**外观 Tab 🎨**

- 6 种主题预设方案（科技蓝/清新绿/商务灰等）
- 主题模式切换（亮色/暗色/跟随系统）
- 主题色选择器（支持预设色板）
- 圆角大小调节（小/中/大）
- 页面动画效果（淡入/滑动/缩放/无动画）

**布局 Tab 📐**

- 6 种布局模式切换（左侧/顶部/混合/卡片等）
- 固定头部开关
- 面包屑显示/图标配置
- 标签页样式（默认/卡片/智能）
- 侧边栏宽度调节
- 页脚显示开关

**功能 Tab ⚙️**

- 缓存管理（清除全部/仅首页/其他）
- 配置导入/导出（JSON）
- 重置所有配置
- 水印显示开关
- 灰色模式/色弱模式
- 系统信息展示（浏览器/OS/分辨率等）

## 📚 API 文档

### Store

#### `createSettingsStore(options?)`

创建自定义配置的设置 Store

```typescript
import { createSettingsStore } from "@robot-admin/layout";

const useSettingsStore = createSettingsStore({
  defaults: {
    layoutMode: "side", // 默认布局
    primaryColor: "#409eff", // 默认主题色
    showTagsView: true, // 显示标签页
    fixedHeader: true, // 固定头部
  },
  onThemeModeChange: async (mode) => {
    // 主题模式变化回调（同步到 theme store）
    const themeStore = useThemeStore();
    await themeStore.setMode(mode);
  },
});
```

**参数类型：**

```typescript
interface SettingsStoreOptions {
  defaults?: Partial<SettingsState>;
  onThemeModeChange?: (mode: ThemeMode) => void | Promise<void>;
}
```

#### `useSettingsStore()`

获取默认的设置 Store 实例

```typescript
import { useSettingsStore } from "@robot-admin/layout";

const settingsStore = useSettingsStore();
```

### Store 属性

#### 外观设置

| 属性               | 类型               | 默认值      | 说明                           |
| ------------------ | ------------------ | ----------- | ------------------------------ |
| `themeMode`        | `ThemeMode`        | `'light'`   | 主题模式（light/dark/auto）    |
| `primaryColor`     | `string`           | `'#409eff'` | 主题色                         |
| `borderRadius`     | `BorderRadiusSize` | `'medium'`  | 圆角大小（small/medium/large） |
| `transitionType`   | `TransitionType`   | `'slide'`   | 页面动画类型                   |
| `enableTransition` | `boolean`          | `true`      | 启用页面动画                   |

#### 布局设置

| 属性                    | 类型            | 默认值      | 说明                 |
| ----------------------- | --------------- | ----------- | -------------------- |
| `layoutMode`            | `LayoutMode`    | `'side'`    | 布局模式             |
| `fixedHeader`           | `boolean`       | `true`      | 固定头部             |
| `showBreadcrumb`        | `boolean`       | `true`      | 显示面包屑           |
| `showBreadcrumbIcon`    | `boolean`       | `true`      | 显示面包屑图标       |
| `showTagsView`          | `boolean`       | `true`      | 显示标签页           |
| `tagsViewHeight`        | `number`        | `44`        | 标签页高度（px）     |
| `tagsViewStyle`         | `TagsViewStyle` | `'default'` | 标签页风格           |
| `showFooter`            | `boolean`       | `true`      | 显示页脚             |
| `sidebarWidth`          | `number`        | `220`       | 侧边栏宽度（px）     |
| `sidebarCollapsedWidth` | `number`        | `64`        | 侧边栏折叠宽度（px） |
| `headerHeight`          | `number`        | `56`        | 头部高度（px）       |

| `enableHotkeys` | `boolean` | `true` | 启用快捷键 |

#### 计算属性

- `borderRadiusValue` - 圆角值（带单位，如 '6px'）
- `transitionName` - 过渡动画类名
- `shouldEnableTransition` - 是否应该启用过渡
- `settingsState` - 完整的设置状态对象

### Store 方法

#### `syncCSSVariables()`

同步所有配置到 CSS 变量（自动调用，通常不需要手动调用）

```typescript
settingsStore.syncCSSVariables();
```

#### `applyPreset(preset: ThemePreset)`

应用主题预设方案

```typescript
import { THEME_PRESETS } from "@robot-admin/layout";

const techPreset = THEME_PRESETS[0]; // 科技蓝
settingsStore.applyPreset(techPreset);
```

#### `resetSettings()`

重置所有配置为默认值

```typescript
settingsStore.resetSettings();
```

#### `updateThemeMode(mode: ThemeMode)`

更新主题模式（会触发 onThemeModeChange 回调）

```typescript
settingsStore.updateThemeMode("dark");
```

#### `adjustColor(color: string, amount: number): string`

调整颜色亮度（工具函数）

```typescript
import { adjustColor } from "@robot-admin/layout";

const hoverColor = adjustColor("#409eff", 10); // 变亮
const pressedColor = adjustColor("#409eff", -10); // 变暗
```

## 📋 常量

### `THEME_PRESETS`

内置的 6 套主题预设方案：

```typescript
const THEME_PRESETS: ThemePreset[] = [
  { name: "科技蓝", icon: "💙", primaryColor: "#409eff" },
  { name: "清新绿", icon: "💚", primaryColor: "#52c41a" },
  { name: "商务灰", icon: "🖤", primaryColor: "#595959" },
  { name: "活力橙", icon: "🧡", primaryColor: "#fa8c16" },
  { name: "优雅紫", icon: "💜", primaryColor: "#722ed1" },
  { name: "经典红", icon: "❤️", primaryColor: "#f5222d" },
];
```

### `LAYOUT_MODES`

6 种布局模式（含 SVG 图标和描述）：

```typescript
type LayoutMode =
  | "side" // 左侧菜单布局（经典）
  | "top" // 顶部菜单布局
  | "mix" // 左侧混合菜单布局（一级菜单在侧，二级在顶）
  | "mix-top" // 顶部混合菜单布局（一级菜单在顶，二级在侧）
  | "reverse-horizontal-mix" // 反转混合布局
  | "card-layout"; // 卡片布局
```

**布局模式对比：**

| 模式                       | 一级菜单位置 | 二级菜单位置   | 适用场景                   | 状态      |
| -------------------------- | ------------ | -------------- | -------------------------- | --------- |
| **side**                   | 左侧栏       | 左侧栏（折叠） | 经典后台管理，菜单层级多   | ✅ 稳定   |
| **top**                    | 顶部横向     | 顶部下拉       | 菜单较少，需要更宽的内容区 | ✅ 稳定   |
| **mix**                    | 左侧栏       | 顶部横向       | 一级菜单少，二级菜单多     | ✅ 稳定   |
| **mix-top**                | 顶部横向     | 左侧栏         | 需要顶部导航 + 侧边详情    | ✅ 稳定   |
| **reverse-horizontal-mix** | 右侧栏       | 顶部横向       | 特殊需求，右手操作习惯     | 🚧 开发中 |
| **card-layout**            | 卡片网格     | 无             | 应用首页/工作台            | 🚧 开发中 |

**选择建议：**

- **side**: 默认推荐，适合传统后台系统（如 ERP、CRM）
- **top**: 适合菜单少的系统（如博客后台、工具站）
- **mix**: 适合一级模块少、二级功能多的系统（如电商后台）
- **mix-top**: 适合需要顶部全局导航的系统（如多租户平台）

### `COLOR_SWATCHES`

颜色选择器的预设色板（8 种常用颜色）

### `BORDER_RADIUS_MAP`

圆角尺寸映射表：

```typescript
{
  small: '4px',
  medium: '6px',
  large: '8px'
}
```

## 🎨 CSS 变量

Store 会自动将配置同步到以下 CSS 变量，可直接在样式中使用：

```css
/* 主题色相关 */
--primary-color: #409eff;
--primary-color-hover: #66b1ff;
--primary-color-pressed: #3a8ee6;

/* 布局尺寸 */
--sidebar-width: 220px;
--sidebar-collapsed-width: 64px;
--header-height: 56px;
--tags-view-height: 40px;
--border-radius: 6px;

/* 使用示例 */
.my-button {
  background: var(--primary-color);
  border-radius: var(--border-radius);
  height: var(--header-height);
}
```

## 📖 类型定义

```typescript
/** 布局模式 */
type LayoutMode =
  | "side"
  | "top"
  | "mix"
  | "mix-top"
  | "reverse-horizontal-mix"
  | "card-layout";

/** 页面动画类型 */
type TransitionType = "fade" | "slide" | "zoom" | "none";

/** 圆角大小 */
type BorderRadiusSize = "small" | "medium" | "large";

/** 标签页风格 */
type TagsViewStyle = "default" | "card" | "smart";

/** 主题模式（继承自 @robot-admin/theme） */
type ThemeMode = "light" | "dark" | "auto";

/** 主题预设 */
interface ThemePreset {
  name: string;
  icon: string;
  primaryColor: string;
}

/** 设置状态 */
interface SettingsState {
  // 外观
  themeMode: ThemeMode;
  primaryColor: string;
  borderRadius: BorderRadiusSize;
  transitionType: TransitionType;
  enableTransition: boolean;

  // 布局
  layoutMode: LayoutMode;
  fixedHeader: boolean;
  showBreadcrumb: boolean;
  showBreadcrumbIcon: boolean;
  showTagsView: boolean;
  tagsViewHeight: number;
  tagsViewStyle: TagsViewStyle;
  showFooter: boolean;
  sidebarWidth: number;
  sidebarCollapsedWidth: number;
  headerHeight: number;

  // 高级
  enableHotkeys: boolean;
  version: string;
}
```

## 🔧 完整示例

### Robot Admin 项目集成（完整示例）

#### 1. 主项目提供业务适配器

```typescript
// src/composables/useLayoutBridge.ts
import { computed } from 'vue';
import { usePermissionStore } from '@/stores/permission';
import { useThemeStore } from '@robot-admin/theme';
import { useSettingsStore } from '@robot-admin/layout';

/**
 * 布局桥接适配器
 * 将主项目的业务 Stores 数据转换为布局包需要的 LayoutContext 格式
 */
export function useLayoutBridge() {
  const permissionStore = usePermissionStore();
  const themeStore = useThemeStore();
  const settingsStore = useSettingsStore();

  return {
    // 菜单数据
    menus: computed(() => permissionStore.menus),
    
    // 主题状态
    isDark: computed(() => themeStore.isDark),
    
    // 布局配置
    layoutMode: computed(() => settingsStore.layoutMode),
    sidebarCollapsed: computed(() => permissionStore.sidebarCollapsed),
    
    // 尺寸配置
    sidebarWidth: computed(() => settingsStore.sidebarWidth),
    headerHeight: computed(() => settingsStore.headerHeight),
    
    // 可见性配置
    showBreadcrumb: computed(() => settingsStore.showBreadcrumb),
    showTagsView: computed(() => settingsStore.showTagsView),
    showFooter: computed(() => settingsStore.showFooter),
  };
}
```

#### 2. 主项目封装布局容器

```vue
<!-- src/components/global/C_Layout/index.vue -->
<template>
  <C_LayoutContainer v-bind="layoutContext">
    <!-- 业务插槽：头部内容 -->
    <template #header>
      <AppHeader />
    </template>

    <!-- 业务插槽：侧边栏Logo -->
    <template #logo>
      <AppLogo />
    </template>

    <!-- 业务插槽：侧边栏菜单 -->
    <template #menu>
      <AppMenu :menus="layoutContext.menus" />
    </template>

    <!-- 业务插槽：面包屑 -->
    <template #breadcrumb>
      <AppBreadcrumb />
    </template>

    <!-- 业务插槽：标签页 -->
    <template #tags>
      <AppTags />
    </template>

    <!-- 业务插槽：主内容区 -->
    <template #default>
      <router-view v-slot="{ Component, route }">
        <transition :name="transitionName" mode="out-in">
          <keep-alive :include="cacheList">
            <component :is="Component" :key="route.path" />
          </keep-alive>
        </transition>
      </router-view>
    </template>

    <!-- 业务插槽：页脚 -->
    <template #footer>
      <AppFooter />
    </template>
  </C_LayoutContainer>
</template>

<script setup lang="ts">
import { C_LayoutContainer } from '@robot-admin/layout';
import { useLayoutBridge } from '@/composables/useLayoutBridge';
import { useLayoutCache } from '@/composables/useLayoutCache';
import AppHeader from './components/AppHeader.vue';
import AppLogo from './components/AppLogo.vue';
import AppMenu from './components/AppMenu.vue';
import AppBreadcrumb from './components/AppBreadcrumb.vue';
import AppTags from './components/AppTags.vue';
import AppFooter from './components/AppFooter.vue';

// 桥接业务数据
const layoutContext = useLayoutBridge();

// 页面缓存管理
const { cacheList, transitionName } = useLayoutCache();
</script>
```

#### 3. 初始化配置

```typescript
// src/main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { setupLayout } from '@robot-admin/layout';
import { useThemeStore } from '@robot-admin/theme';
import '@robot-admin/layout/style.scss';
import App from './App.vue';
import router from './router';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// 初始化主题
const themeStore = useThemeStore();
themeStore.init();

// 初始化布局（自动同步 theme store）
setupLayout(app, {
  onThemeModeChange: async (mode) => {
    await themeStore.setMode(mode);
  },
  defaults: {
    layoutMode: 'side',
    primaryColor: '#409eff',
    showTagsView: true,
    fixedHeader: true,
  },
});

app.mount('#app');
```

#### 4. 添加设置入口

```vue
<!-- App.vue -->
<template>
  <NConfigProvider :theme="naiveTheme">
    <NMessageProvider>
      <!-- 主布局 -->
      <C_Layout />

      <!-- 设置按钮 -->
      <NButton
        class="settings-trigger"
        circle
        size="large"
        @click="showSettings = true"
      >
        <template #icon>
          <NIcon><SettingsIcon /></NIcon>
        </template>
      </NButton>

      <!-- 设置抽屉 -->
      <SettingsDrawer v-model:show="showSettings" />
    </NMessageProvider>
  </NConfigProvider>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { NConfigProvider, NMessageProvider, NButton, NIcon, darkTheme } from 'naive-ui';
import { Settings as SettingsIcon } from '@vicons/tabler';
import { SettingsDrawer } from '@robot-admin/layout';
import { useThemeStore } from '@robot-admin/theme';
import C_Layout from '@/components/global/C_Layout/index.vue';

const themeStore = useThemeStore();
const showSettings = ref(false);

const naiveTheme = computed(() => themeStore.isDark ? darkTheme : undefined);
</script>

<style>
.settings-trigger {
  position: fixed;
  right: 20px;
  bottom: 80px;
  z-index: 999;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}
</style>
```

**核心要点：**

1. **useLayoutBridge**: 业务数据适配器，将主项目的 Stores 转换为包需要的接口
2. **C_Layout 封装**: 主项目的布局容器，负责提供所有业务插槽内容
3. **C_LayoutContainer**: 包提供的智能容器，根据 layoutMode 自动切换布局骨架
4. **插槽系统**: 主项目通过插槽注入业务组件（Header/Menu/Breadcrumb 等）
5. **SettingsDrawer**: 包提供的开箱即用设置面板，用户可随时切换布局

---

### 基础 Naive UI 项目集成（快速开始）

```typescript
// main.ts
import { createApp } from "vue";
import { createPinia } from "pinia";
import { setupLayout, SettingsDrawer } from "@robot-admin/layout";
import { useThemeStore } from "@robot-admin/theme";
import "@robot-admin/layout/style.scss";
import App from "./App.vue";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

// 初始化主题
const themeStore = useThemeStore();
themeStore.init();

// 初始化布局（一行搞定）
setupLayout(app, {
  onThemeModeChange: async (mode) => {
    await themeStore.setMode(mode);
  },
});

app.mount("#app");
```

```vue
<!-- App.vue -->
<template>
  <NConfigProvider :theme="naiveTheme">
    <NMessageProvider>
      <div class="app-container">
        <!-- 你的布局和内容 -->
        <router-view />

        <!-- 设置按钮 -->
        <NButton
          class="settings-trigger"
          circle
          size="large"
          @click="showSettings = true"
        >
          <template #icon>
            <NIcon><Settings /></NIcon>
          </template>
        </NButton>

        <!-- 设置抽屉（开箱即用）-->
        <SettingsDrawer v-model:show="showSettings" />
      </div>
    </NMessageProvider>
  </NConfigProvider>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import {
  NConfigProvider,
  NMessageProvider,
  NButton,
  NIcon,
  darkTheme,
} from "naive-ui";
import { Settings } from "@vicons/tabler";
import { SettingsDrawer } from "@robot-admin/layout";
import { useThemeStore } from "@robot-admin/theme";

const themeStore = useThemeStore();
const showSettings = ref(false);

const naiveTheme = computed(() => {
  return themeStore.isDark ? darkTheme : undefined;
});
</script>

<style>
.settings-trigger {
  position: fixed;
  right: 20px;
  bottom: 80px;
  z-index: 999;
}
</style>
```

### 高级：自定义配置

```typescript
// stores/settings.ts
import { createSettingsStore } from "@robot-admin/layout";
import { useThemeStore } from "@robot-admin/theme";

export const useSettingsStore = createSettingsStore({
  // 自定义默认值
  defaults: {
    layoutMode: "mix",
    primaryColor: "#722ed1",
    showTagsView: false,
    fixedHeader: true,
  },

  // 主题模式变化回调
  onThemeModeChange: async (mode) => {
    const themeStore = useThemeStore();
    await themeStore.setMode(mode);

    // 额外逻辑：通知后端
    await fetch("/api/user/theme", {
      method: "PUT",
      body: JSON.stringify({ mode }),
    });
  },
});
```

## 🎯 最佳实践

### 1. 样式使用建议

- **推荐使用 SCSS**：可以自定义变量和主题
- **CSS 变量优先**：使用 `var(--primary-color)` 而非硬编码颜色
- **响应式设计**：利用 `var(--sidebar-width)` 等布局变量

### 2. 性能优化

```typescript
// 懒加载设置抽屉（仅在需要时加载）
const SettingsDrawer = defineAsyncComponent(() =>
  import("@robot-admin/layout").then((m) => ({ default: m.SettingsDrawer })),
);
```

### 3. 类型安全

```typescript
import type { LayoutMode, SettingsState } from "@robot-admin/layout";

// 使用类型约束
const handleLayoutChange = (mode: LayoutMode) => {
  settingsStore.layoutMode = mode;
};
```

### 4. 布局切换最佳实践

```typescript
// ✅ 推荐：通过 store 切换（响应式）
settingsStore.layoutMode = 'mix';

// ❌ 不推荐：直接修改 DOM
document.querySelector('.layout')?.setAttribute('data-layout', 'mix');
```

### 5. 插槽使用建议

```vue
<!-- ✅ 推荐：使用具名插槽清晰表达意图 -->
<C_LayoutContainer>
  <template #header><AppHeader /></template>
  <template #menu><AppMenu /></template>
  <template #default><router-view /></template>
</C_LayoutContainer>

<!-- ❌ 不推荐：混用或省略插槽 -->
<C_LayoutContainer>
  <AppHeader />  <!-- 不明确是哪个插槽 -->
</C_LayoutContainer>
```

## 🔍 Troubleshooting

### 1. 样式不生效

**问题描述**：修改主题色或布局配置后，页面样式没有变化

**解决方案**：

```typescript
// 确保调用了 syncCSSVariables
const settingsStore = useSettingsStore();
settingsStore.syncCSSVariables();

// 或使用 setupLayout 自动同步
setupLayout(app);
```

### 2. 布局切换后内容错位

**问题描述**：切换布局模式后，内容区域出现错位或遮挡

**原因分析**：CSS 变量未及时更新或缓存问题

**解决方案**：

```typescript
// 方案一：清除浏览器缓存后刷新页面

// 方案二：手动触发重新计算
import { nextTick } from 'vue';

const switchLayout = async (mode: LayoutMode) => {
  settingsStore.layoutMode = mode;
  await nextTick();
  settingsStore.syncCSSVariables();
};
```

### 3. SettingsDrawer 不显示

**问题描述**：点击设置按钮后，抽屉没有弹出

**排查步骤**：

```vue
<script setup>
import { ref } from 'vue';
import { SettingsDrawer } from '@robot-admin/layout';

const visible = ref(false);

// ✅ 检查一：v-model:show 是否正确绑定
console.log('visible:', visible.value);

// ✅ 检查二：NaiveUI ConfigProvider 是否包裹
// <NConfigProvider>
//   <SettingsDrawer v-model:show="visible" />
// </NConfigProvider>

// ✅ 检查三：z-index 是否被遮挡
// .n-drawer-container { z-index: 1000 !important; }
</script>
```

### 4. 深色模式切换无效

**问题描述**：切换深色模式后，NaiveUI 组件没有跟随变化

**解决方案**：

```vue
<template>
  <NConfigProvider :theme="naiveTheme">
    <!-- 你的内容 -->
  </NConfigProvider>
</template>

<script setup>
import { computed } from 'vue';
import { NConfigProvider, darkTheme } from 'naive-ui';
import { useThemeStore } from '@robot-admin/theme';

const themeStore = useThemeStore();

// ✅ 关键：将 themeStore.isDark 绑定到 naive-ui
const naiveTheme = computed(() => {
  return themeStore.isDark ? darkTheme : undefined;
});
</script>
```

### 5. TypeScript 类型错误

**问题描述**：使用包导出的类型时报错 `Cannot find module`

**解决方案**：

```json
// tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "bundler",  // ✅ 使用 bundler 模式
    "types": ["@robot-admin/layout"], // ✅ 显式声明类型包
    "skipLibCheck": true  // 可选：跳过库文件检查
  }
}
```

### 6. 菜单数据不显示

**问题描述**：布局正常但侧边栏/顶部菜单为空

**原因分析**：LayoutContext 未正确传递菜单数据

**示例检查**：

```typescript
// useLayoutBridge.ts
export function useLayoutBridge() {
  const permissionStore = usePermissionStore();
  
  return {
    // ❌ 错误：返回了空数组
    menus: computed(() => []),
    
    // ✅ 正确：从 store 获取菜单
    menus: computed(() => permissionStore.menus),
  };
}
```

### 7. 开发环境热更新后样式丢失

**问题描述**：Vite HMR 更新后，布局样式消失

**临时解决**：刷新页面

**根本解决**：

```typescript
// vite.config.ts
export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        // ✅ 确保 SCSS 编译正确
        additionalData: `@use "@robot-admin/layout/style.scss" as *;`
      }
    }
  }
});
```

### 8. 构建后样式缺失

**问题描述**：`npm run build` 后部署，页面样式全无

**解决方案**：

```typescript
// main.ts - 确保导入了样式文件
import '@robot-admin/layout/style.scss';  // ✅ SCSS 源文件
// 或
import '@robot-admin/layout/dist/index.css';  // ✅ 编译后的 CSS
```

```json
// vite.config.ts - 确保 CSS 被正确打包
{
  build: {
    cssCodeSplit: true,  // 代码分割
    assetsInlineLimit: 4096  // 小于 4kb 内联
  }
}
```

### 9. 性能问题：频繁切换布局卡顿

**优化方案**：

```typescript
import { debounce } from 'lodash-es';

// ✅ 防抖处理布局切换
const switchLayout = debounce((mode: LayoutMode) => {
  settingsStore.layoutMode = mode;
}, 300);
```

### 10. Console 警告：`Inject key not found`

**问题描述**：控制台出现 `[Vue warn] injection key "xxx" not found`

**原因**：C_LayoutContainer 未正确提供 LayoutContext

**解决方案**：

```vue
<!-- ✅ 确保使用 C_LayoutContainer 包裹 -->
<C_LayoutContainer v-bind="layoutContext">
  <template #default>
    <!-- 子组件可以安全使用 inject -->
  </template>
</C_LayoutContainer>

<!-- ❌ 错误：直接使用布局骨架组件 -->
<SideLayout>  <!-- 缺少 LayoutContext 提供者 -->
  <template #default>...</template>
</SideLayout>
```

---

## 🔗 相关链接

- [Robot Admin 完整项目](https://github.com/ChenyCHENYU/Robot_Admin)
- [@robot-admin/theme](https://www.npmjs.com/package/@robot-admin/theme)
- [Naive UI 文档](https://www.naiveui.com/)
- [Vue 3 官方文档](https://cn.vuejs.org/)

## 📝 更新日志

查看 [CHANGELOG.md](./CHANGELOG.md) 了解详细更新记录。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT © ChenYu

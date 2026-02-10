# @robot-admin/layout

> 布局和设置管理系统 - 为 Robot Admin 提供完整的布局配置管理能力（含 UI 组件）

## ✨ 特性

- 🎨 **多布局支持** - 左侧/顶部/混合等 6 种布局模式
- 🎯 **主题预设** - 内置 6 套精美主题预设方案
- 🧩 **开箱即用** - 提供完整的设置抽屉 UI 组件
- ⚙️ **丰富配置** - 面包屑、标签页、页脚等多维度配置
- 🎨 **样式灵活** - 支持 SCSS 源文件或编译后 CSS
-  **高度可配置** - 灵活的初始化选项
- 🚀 **TypeScript** - 完整的类型支持

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
| `themeMode`        | `ThemeMode`        | `'light'`   | 主题模式（light/dark/auto）   |
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

| `enableHotkeys`         | `boolean` | `true`          | 启用快捷键 |

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
  | "side"
  | "top"
  | "mix"
  | "mix-top"
  | "reverse-horizontal-mix"
  | "card-layout";
```

- **side** - 左侧菜单布局（经典）
- **top** - 顶部菜单布局
- **mix** - 左侧混合菜单布局
- **mix-top** - 顶部混合菜单布局
- **reverse-horizontal-mix** - 反转混合布局（开发中）
- **card-layout** - 卡片布局（开发中）

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

### 基础 Naive UI 项目集成

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

## 🔗 相关链接

- [Robot Admin 完整项目](https://github.com/ChenyCHENYU/Robot_Admin)
- [@robot-admin/theme](https://www.npmjs.com/package/@robot-admin/theme)
- [Naive UI 文档](https://www.naiveui.com/)

## 📝 更新日志

查看 [CHANGELOG.md](./CHANGELOG.md) 了解详细更新记录。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT © ChenYu

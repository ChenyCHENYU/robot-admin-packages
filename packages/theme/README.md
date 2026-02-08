# @robot-admin/theme

> 主题切换和管理系统 - 为 Robot Admin 提供完整的主题管理能力

## 特性

- 🌓 **多模式支持** - Light / Dark / System 三种主题模式
- 🎨 **View Transition API** - 丝滑流畅的主题切换动画
- 💾 **持久化存储** - 自动保存用户的主题偏好
- 🔧 **高度可配置** - 灵活的配置选项
- 📦 **零 UI 依赖** - 纯逻辑包，UI 由业务方实现
- 🚀 **TypeScript** - 完整的类型支持

## 安装

```bash
npm install @robot-admin/theme
# or
pnpm add @robot-admin/theme
# or
bun add @robot-admin/theme
```

## 快速开始

### 1. 初始化 Store

```typescript
import { createApp } from "vue";
import { createPinia } from "pinia";
import { useThemeStore } from "@robot-admin/theme";
import App from "./App.vue";

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);

// 初始化主题系统
const themeStore = useThemeStore();
themeStore.init();

app.mount("#app");
```

### 2. 在组件中使用

```vue
<template>
  <button @click="toggleTheme">
    <span v-if="themeStore.isDark">🌙 深色</span>
    <span v-else>☀️ 浅色</span>
  </button>
</template>

<script setup lang="ts">
import { useThemeStore } from "@robot-admin/theme";

const themeStore = useThemeStore();

const toggleTheme = () => {
  themeStore.toggleMode(); // 循环切换 light -> dark -> system
};
</script>
```

## API 文档

### Store

#### `createThemeStore(options?)`

创建自定义配置的主题 Store

```typescript
import { createThemeStore } from "@robot-admin/theme";

const useThemeStore = createThemeStore({
  defaultMode: "dark", // 默认主题模式
  storageKey: "my-theme-mode", // localStorage 键名
  enableTransition: true, // 启用过渡动画
  transitionDuration: 500, // 动画时长（毫秒）
});
```

#### `useThemeStore()`

获取默认的主题 Store 实例

### Store 属性

- `mode` - 当前主题模式 (`'light'` | `'dark'` | `'system'`)
- `systemIsDark` - 系统是否为暗色模式
- `isDark` - 当前是否为暗色模式（计算属性）

### Store 方法

- `init()` - 初始化主题系统（必须调用）
- `setMode(mode)` - 设置主题模式
- `toggleMode()` - 循环切换主题模式（light → dark → system）
- `toggleDark()` - 在 light 和 dark 之间切换

### Composables

#### `useViewTransition(callback, options?)`

使用 View Transition API 执行过渡动画

```typescript
import { useViewTransition } from "@robot-admin/theme";

await useViewTransition(
  () => {
    // 执行 DOM 更新
    document.body.classList.toggle("dark");
  },
  {
    duration: 500,
    transitioningClass: "theme-transitioning",
  },
);
```

#### `isViewTransitionSupported()`

检查浏览器是否支持 View Transition API

### 常量

- `DEFAULT_THEME_OPTIONS` - 默认配置选项
- `THEME_MODE_LABELS` - 主题模式显示文本
- `THEME_MODE_ICONS` - 主题模式图标类名

## CSS 配置

在你的全局样式中添加：

```css
/* 定义 CSS 变量 */
[data-theme="light"] {
  --bg-color: #ffffff;
  --text-color: #333333;
}

[data-theme="dark"] {
  --bg-color: #1a1a1a;
  --text-color: #ffffff;
}

/* View Transition API 动画 */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.5s;
}

/* 禁用冲突的 CSS transitions */
.theme-transitioning * {
  transition: none !important;
}
```

## 完整示例

查看 [Robot Admin](https://github.com/ChenyCHENYU/Robot_Admin) 项目以获取完整的使用示例。

## License

MIT © ChenYu

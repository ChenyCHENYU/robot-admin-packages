# @robot-admin/theme

> 主题切换和管理系统 — 为 Robot Admin 提供完整的主题管理能力

## 特性

- 🌓 **多模式支持** — Light / Dark / System 三种主题模式
- 🎨 **View Transition API** — 丝滑流畅的主题切换动画
- 🔮 **设计风格系统** — Glass Morphism / Corporate Minimal / Dark Tech 三套风格
-  **持久化存储** — 自动保存用户的主题偏好和设计风格
- 🛡️ **三层解耦** — 基础主题、菜单风格、设计风格互不冲突
-  **高度可配置** — 灵活的配置选项
- 🚀 **TypeScript** — 完整的类型支持

## 安装

```bash
bun add @robot-admin/theme
```

## 快速开始

### 1. 初始化 Store

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useThemeStore } from '@robot-admin/theme'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

// 初始化主题系统
const themeStore = useThemeStore()
themeStore.init()

app.mount('#app')
```

### 2. 引入设计风格 CSS

```typescript
// 方式一：全部引入（推荐，通过 data-design-style 属性自动切换，互不冲突）
import '@robot-admin/theme/styles/glass-morphism.css'
import '@robot-admin/theme/styles/corporate-minimal.css'
import '@robot-admin/theme/styles/dark-tech.css'

// 方式二：按需引入（仅使用单一风格时）
import '@robot-admin/theme/styles/glass-morphism.css'
```

### 3. 在组件中使用

```vue
<template>
  <NSpace>
    <NButton @click="themeStore.toggleMode()">
      {{ themeStore.isDark ? '🌙 深色' : '☀️ 浅色' }}
    </NButton>
    <NButton @click="themeStore.toggleDesignStyle()">
      {{ themeStore.currentDesignStyleConfig.name }}
    </NButton>
  </NSpace>
</template>

<script setup lang="ts">
import { useThemeStore } from '@robot-admin/theme'

const themeStore = useThemeStore()
</script>
```

## 三层架构

```
Layer 1: 基础主题 (ThemeMode)     → 全局明暗        → data-theme         （本包管理）
Layer 2: 菜单风格 (MenuTheme)     → 仅侧边栏菜单   → data-menu-theme    （消费方管理）
Layer 3: 设计风格 (DesignStyle)   → 主内容区组件    → data-design-style  （本包管理）
```

三层之间**互不耦合、互不覆盖**：

- **菜单风格** — 由消费方的扩展 Store 独立管理（`data-menu-theme`），控制 `.n-menu` / `.n-menu-item` 样式
- **设计风格** — 仅作用于主内容区的 Naive UI 组件（`.n-card`、`.n-button`、`.n-input` 等），**绝不涉及**菜单相关组件
- **基础主题** — 为两者提供全局 `dark` / `light` CSS 变量基础

## 设计风格

| 风格 | 标识 | 支持主题 | 推荐菜单风格 | 特征 |
|------|------|---------|-------------|------|
| 拟态玻璃 | `glass-morphism` | Light / Dark | `signature` | 毛玻璃、半透明、内发光、物理感动画 |
| 企业简约 | `corporate-minimal` | Light / Dark | `standard` | 极简、克制装饰、清晰层级、商务色彩 |
| 深邃科技 | `dark-tech` | Dark only | `signature` | 深色渐变、霓虹点缀、发光效果、锐利线条 |

> 选择 `dark-tech` 时，Store 会**自动**将主题切换为暗色模式。

## API 文档

### Store

#### `createThemeStore(options?)`

创建自定义配置的主题 Store：

```typescript
import { createThemeStore } from '@robot-admin/theme'

const useMyThemeStore = createThemeStore({
  defaultMode: 'system',                          // 默认主题模式
  defaultDesignStyle: 'glass-morphism',            // 默认设计风格
  storageKey: 'theme-mode',                        // localStorage 键名（主题）
  designStyleStorageKey: 'robot-admin-design-style', // localStorage 键名（设计风格）
  enableTransition: true,                          // 启用 View Transition 过渡动画
  transitionDuration: 500,                         // 过渡动画时长（毫秒）
})
```

#### `useThemeStore()`

获取默认配置的 Store 实例（开箱即用）。

### Store 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `mode` | `Ref<ThemeMode>` | 当前主题模式 (`'light'` / `'dark'` / `'system'`) |
| `systemIsDark` | `Ref<boolean>` | 系统是否为暗色模式 |
| `isDark` | `ComputedRef<boolean>` | 当前是否为暗色模式（已解析 system） |
| `designStyle` | `Ref<DesignStyle>` | 当前设计风格标识 |
| `currentDesignStyleConfig` | `ComputedRef<DesignStyleConfig>` | 当前设计风格的完整配置对象 |

### Store 方法

| 方法 | 说明 |
|------|------|
| `init()` | 初始化主题系统（必须调用，同步 DOM 属性 + 监听系统偏好） |
| `setMode(mode)` | 设置主题模式（带过渡动画） |
| `toggleMode()` | 循环切换 light → dark → system |
| `toggleDark()` | 仅在 light / dark 之间切换 |
| `setDesignStyle(style)` | 设置设计风格（自动适配不兼容的主题模式） |
| `toggleDesignStyle()` | 循环切换 glass-morphism → corporate-minimal → dark-tech |

### Composables

#### `useViewTransition(callback, options?)`

使用 View Transition API 执行 DOM 更新（自动降级）：

```typescript
import { useViewTransition } from '@robot-admin/theme'

await useViewTransition(
  () => document.documentElement.setAttribute('data-theme', 'dark'),
  { duration: 500, transitioningClass: 'theme-transitioning' },
)
```

#### `isViewTransitionSupported()`

检查浏览器是否支持 View Transition API，返回 `boolean`。

### 常量

| 常量 | 说明 |
|------|------|
| `DEFAULT_THEME_OPTIONS` | 默认配置选项 |
| `THEME_MODE_LABELS` | 主题模式显示文本（`{ light: '浅色', dark: '深色', system: '自动' }`） |
| `THEME_MODE_ICONS` | 主题模式图标类名 |
| `DESIGN_STYLE_CONFIGS` | 设计风格配置映射（名称、描述、支持的主题模式、推荐菜单） |
| `DESIGN_STYLE_LABELS` | 设计风格显示文本 |
| `DESIGN_STYLE_ICONS` | 设计风格图标类名 |

### TypeScript 类型

```typescript
import type {
  ThemeMode,           // 'light' | 'dark' | 'system'
  DesignStyle,         // 'glass-morphism' | 'corporate-minimal' | 'dark-tech'
  ThemeConfig,         // 主题完整配置
  ThemeStoreOptions,   // createThemeStore 选项
  DesignStyleConfig,   // 单个设计风格的配置对象
} from '@robot-admin/theme'
```

## CSS 变量命名空间

设计风格使用 `--dt-*` 前缀，与项目中各层变量**完全隔离**：

| 前缀 | 来源 | 说明 |
|------|------|------|
| `--app-*` | 项目 `theme-variables.scss` | 全局主题变量（背景、文本、边框） |
| `--c-*` | `@robot-admin/naive-ui-components` | 组件库内部变量 |
| `--n-*` | Naive UI 内部 | Naive UI 组件变量（NCard / NButton 等） |
| `--menu-*` | 菜单风格系统 | 菜单装饰效果变量（玻璃、渐变、模糊） |
| `--dt-*` | **本包设计风格** | 设计风格变量（卡片背景、边框、阴影、动画） |

## 在 Robot Admin 中集成

Robot Admin 已有一个扩展 Store（`s_themeStore`）管理基础主题和菜单风格。集成设计风格**无需修改现有代码**，只需以下步骤：

### Step 1：引入 CSS（在 main.ts 或全局入口）

```typescript
// 全部引入，CSS 通过 data-design-style 属性选择器自动隔离
import '@robot-admin/theme/styles/glass-morphism.css'
import '@robot-admin/theme/styles/corporate-minimal.css'
import '@robot-admin/theme/styles/dark-tech.css'
```

### Step 2：在扩展 Store 中透传设计风格（可选）

```typescript
// src/stores/theme/index.ts — 仅需在 return 中透传
import {
  useThemeStore as useBaseThemeStore,
  type ThemeMode,
  type DesignStyle,          // 新增
} from '@robot-admin/theme'

export const s_themeStore = defineStore('theme-extended', () => {
  const baseThemeStore = useBaseThemeStore()
  const { mode, systemIsDark, isDark, designStyle } = storeToRefs(baseThemeStore)
  //                                    ^^^^^^^^^^^^ 新增解构

  // ... 现有菜单风格逻辑完全不变 ...

  return {
    // 现有
    mode, systemIsDark, isDark,
    menuTheme, isMenuLight,
    currentTheme, themeOverrides, customOverrides,
    init, setMode, setMenuTheme, updateThemeOverrides, resetThemeOverrides,

    // 新增（从基础 Store 透传）
    designStyle,
    currentDesignStyleConfig: baseThemeStore.currentDesignStyleConfig,
    setDesignStyle: baseThemeStore.setDesignStyle,
    toggleDesignStyle: baseThemeStore.toggleDesignStyle,
  }
})
```

### Step 3：在设置面板中提供切换入口

```vue
<template>
  <NSelect
    v-model:value="themeStore.designStyle"
    :options="styleOptions"
    @update:value="themeStore.setDesignStyle($event)"
  />
</template>

<script setup lang="ts">
import { DESIGN_STYLE_CONFIGS } from '@robot-admin/theme'

const styleOptions = Object.entries(DESIGN_STYLE_CONFIGS).map(([value, config]) => ({
  label: config.name,
  value,
}))
</script>
```

## 从 v0.1.x 升级

v0.2.0 是**纯增量更新**，不含任何破坏性变更：

| 变更点 | 影响 |
|--------|------|
| `ThemeStoreOptions` 新增 2 个可选字段 | 无影响，全部可选 |
| Store 新增 `designStyle` 状态 | 无影响，不会改变现有属性 |
| Store 新增 4 个方法 | 无影响，不会改变现有方法 |
| `syncThemeAttr()` 多设一个 `data-design-style` 属性 | 无影响，新的 HTML 属性不会触发任何现有样式 |
| `DEFAULT_THEME_OPTIONS` 新增 2 个字段 | 无影响，现有字段值不变 |

**升级步骤：** 更新包版本即可，无需修改任何代码。

```bash
bun add @robot-admin/theme@latest
```

## CSS 配置

在全局样式中添加（Robot Admin 已有 `theme-variables.scss` 覆盖此部分）：

```css
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

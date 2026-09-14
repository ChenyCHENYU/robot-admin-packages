# 主题 Token 设计与接入

`@robot-admin/theme` 把“主题语义”与“组件实现”分开：业务和组件只消费语义 Token，
Naive UI、未来的 Element Plus 适配器负责把同一份 Token 映射到各自的主题 API。
项目换品牌、密度或明暗配色时，只提供增量配置，不需要修改包源码。

## 分层模型

| 层级 | 内容 | 是否随明暗模式变化 | 使用原则 |
|---|---|---:|---|
| 基础色板 `brand` | 50–950 品牌颜色刻度 | 否 | 供主题生成和少量可视化使用，不在业务里表达成功、危险等语义 |
| 语义颜色 `light.color` / `dark.color` | 画布、表面、文字、边框、交互色、反馈色 | 是 | 页面和通用组件的首选入口 |
| 组件语义 `light.component` / `dark.component` | 表头、行状态、标签页等少量跨实现语义 | 是 | 只收录跨项目稳定且无法由通用语义清楚表达的值 |
| 阴影 `light.shadow` / `dark.shadow` | 小、中、大、浮层阴影 | 是 | 根据背景重新校准，不共用一套透明度 |
| 结构 `radius` / `spacing` / `control` | 圆角、间距、控件高度、图标尺寸 | 否 | 形成产品密度和节奏，不绑定具体 UI 框架 |
| 排版 `typography` | 字号、行高、字重 | 否 | 组件层不再私自创建重复字号 |
| 动效 `motion` | 时长和缓动 | 否 | 同时尊重 `prefers-reduced-motion` |

默认值来自唯一的 TypeScript 数据源 `DEFAULT_THEME_TOKENS`。构建时由它生成
`tokens.css`，运行时 CSS Variables、Naive UI overrides 也读取同一份数据，避免三套配置漂移。

## 推荐接入：Naive UI 项目

```ts
// src/theme.ts
import { createThemeStore } from '@robot-admin/theme/naive'
import type { ThemeTokenOverrides } from '@robot-admin/theme/tokens'

export const APP_THEME = {
  brand: { 500: '#6d5dfc', 600: '#5946e8' },
  light: {
    color: {
      primary: '#5946e8',
      primaryHover: '#4938c7',
    },
    component: { tabIndicator: '#6d5dfc' },
  },
  dark: {
    color: { primary: '#a89cff' },
    component: { tabIndicator: '#a89cff' },
  },
  radius: { md: '10px' },
} satisfies ThemeTokenOverrides

export const useAppThemeStore = createThemeStore({
  id: 'app-theme',
  tokens: APP_THEME,
})
```

```ts
// App.vue 或主题 Provider
import { useNaiveTheme } from '@robot-admin/theme/naive'
import { useAppThemeStore } from './theme'
import '@robot-admin/theme/naive/styles'

const themeStore = useAppThemeStore()
const { currentTheme, themeOverrides: naiveOverrides } = useNaiveTheme({
  isDark: () => themeStore.isDark,
  tokens: themeStore.tokens,
})

themeStore.init()
```

```vue
<NConfigProvider :theme="currentTheme" :theme-overrides="naiveOverrides">
  <RouterView />
</NConfigProvider>
```

Store 只在显式传入 `tokens` 时写入项目级 CSS Variables，并在 `destroy()` 时恢复宿主
原值；默认主题直接由静态 CSS 提供，不产生运行时行内样式污染。

## 非 Vue、微应用和未来适配器

只使用 `/tokens`，不会加载 Vue、Pinia 或 Naive UI：

```ts
import {
  applyThemeTokens,
  createThemeTokens,
} from '@robot-admin/theme/tokens'

const tokens = createThemeTokens({
  light: { color: { primary: '#0057b8' } },
})
const restore = applyThemeTokens(
  document.documentElement.style,
  tokens,
  'light',
)

// 微应用卸载或 HMR 清理
restore()
```

纯静态项目可直接引入默认变量：

```ts
import '@robot-admin/theme/tokens.css'
```

未来 Element Plus 适配器应只做 `ThemeTokenSet -> Element Plus variables/config` 的映射，
与 `/naive` 并列；不得复制 Store、模式解析或重新定义品牌色。

## CSS Variables 命名

变量统一使用 `--ra-*`，按稳定语义分组：

```css
.business-card {
  color: var(--ra-color-text-primary);
  background: var(--ra-color-surface);
  border: 1px solid var(--ra-color-border);
  border-radius: var(--ra-radius-md);
  box-shadow: var(--ra-shadow-sm);
  padding: var(--ra-space-4);
  transition: background var(--ra-motion-duration-fast)
    var(--ra-motion-easing-standard);
}
```

常用变量：

- 品牌：`--ra-color-brand-50` 至 `--ra-color-brand-950`
- 表面：`--ra-color-canvas`、`--ra-color-surface`、`--ra-color-elevated`
- 文字：`--ra-color-text-primary`、`--ra-color-text-secondary`、`--ra-color-text-disabled`
- 交互：`--ra-color-primary`、`--ra-color-primary-hover`、`--ra-color-focus-ring`
- 反馈：`--ra-color-success`、`--ra-color-warning`、`--ra-color-danger`、`--ra-color-info`
- 组件语义：`--ra-table-header-bg`、`--ra-table-row-hover`、`--ra-tab-indicator`
- 结构：`--ra-radius-*`、`--ra-space-*`、`--ra-control-height-*`
- 排版与动效：`--ra-type-*`、`--ra-motion-*`

完整字段以导出的 `ThemeTokenSet` 类型和 `DEFAULT_THEME_TOKENS` 为准。

## 约束与治理

1. 项目只提交增量覆盖，未配置项继承默认主题。
2. 未知分组、未知字段和空字符串会立即抛错，避免拼写错误静默失效。
3. 业务代码使用语义颜色，不直接把 `brand.500` 当作成功、危险或文字颜色。
4. 组件私有状态先组合现有语义；只有多个组件/适配器稳定复用时才新增公共 Token。
5. `light` 与 `dark` 必须同时检查对比度、禁用态、焦点态和浮层层级。
6. 自定义 Naive UI `overrides` 是最后一层局部补丁，不复制整套主题。
7. 不在运行时持久化整套 Token；持久化用户模式和设计风格即可，品牌配置随版本发布。

## 合并优先级

从低到高：

1. `DEFAULT_THEME_TOKENS`
2. 项目 `ThemeTokenOverrides`
3. UI 适配器映射（只转换，不改变语义）
4. 页面确有必要时传入的局部组件 override

这个顺序使默认主题可直接使用，项目换肤只有一个配置源，特殊页面仍有明确的最终覆盖点。

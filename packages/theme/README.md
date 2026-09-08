# @robot-admin/theme

> 分层主题基础设施：框架无关解析、Vue/Pinia 状态管理与 Naive UI 适配。

[![npm version](https://img.shields.io/npm/v/@robot-admin/theme.svg)](https://www.npmjs.com/package/@robot-admin/theme)
[![license](https://img.shields.io/npm/l/@robot-admin/theme.svg)](https://github.com/ChenyCHENYU/robot-admin-packages/blob/main/packages/theme/LICENSE)

当前版本：`0.5.1`。

## 能力边界

- Light / Dark / System 模式及系统偏好监听。
- Glass Morphism / Corporate Minimal / Dark Tech 三套设计风格。
- 安全持久化、历史脏值清理和同源标签页同步。
- View Transition 渐进增强、并发切换和 reduced-motion 降级。
- `/core` 不依赖 Vue、Pinia 或任何 UI 框架。
- `/vue` 提供 Pinia Store，不依赖 Naive UI。
- `/naive` 提供 NConfigProvider 所需的响应式主题适配。
- 现有根入口和三个独立 CSS 路径保持兼容。

设计风格 CSS 当前面向 Naive UI 与 Robot `C_*` 体系。Element Plus 项目可以复用
`/core` 的主题语义；等有真实业务项目时再增加独立适配层，不需要复制或改写 Store。

## 安装

```bash
bun add @robot-admin/theme
```

Peer dependencies：

- `/vue`、根入口：`vue ^3.4`、`pinia ^2 || ^3`
- `/naive`：额外需要可选 peer `naive-ui ^2.38`
- `/core`：无框架 peer

## 分层入口

| 入口 | 适用场景 | UI 依赖 |
|---|---|---|
| `@robot-admin/theme/core` | 校验、模式解析、非 Vue 应用或未来 UI 适配 | 无 |
| `@robot-admin/theme/vue` | Vue/Pinia 应用的主题 Store | 无 UI 框架依赖 |
| `@robot-admin/theme/naive` | Naive UI 的 theme/overrides 绑定 | Naive UI |
| `@robot-admin/theme` | 兼容入口，API 与 `/vue` 一致 | 无 UI 框架依赖 |
| `@robot-admin/theme/naive/styles` | 一次引入三套现有设计风格 | Naive UI / Robot C 体系 |

## Vue/Pinia 快速开始

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useThemeStore } from '@robot-admin/theme/vue'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())

const themeStore = useThemeStore()
themeStore.init()

app.mount('#app')
```

`init()` 幂等，会同步 `data-theme`、`data-design-style`，并注册系统偏好和同源
标签页监听。应用卸载、测试或 HMR 清理时调用 `destroy()`。

同一个 document 默认只应存在一个主题所有者。`id` 只是 Pinia Store id，并不代表
DOM 属性和存储空间已经自动隔离。

## Naive UI 接入

```typescript
import { computed } from 'vue'
import {
  type GlobalThemeOverrides,
  useNaiveTheme,
  useThemeStore,
} from '@robot-admin/theme/naive'
import '@robot-admin/theme/naive/styles'

const themeStore = useThemeStore()
const settingsOverrides = computed(() => ({
  common: {
    primaryColor: '#409eff',
    borderRadius: '6px',
  },
}))

const { currentTheme, themeOverrides } = useNaiveTheme({
  isDark: () => themeStore.isDark,
  lightOverrides,
  darkOverrides,
  overrides: settingsOverrides,
})
```

```vue
<NConfigProvider
  :theme="currentTheme"
  :theme-overrides="themeOverrides"
>
  <RouterView />
</NConfigProvider>
```

`overrides` 必须是增量补丁，默认应为 `{}`。不要把完整亮色配置作为自定义补丁，
否则它会覆盖暗色基础配置。设置 Store 已经持久化的颜色、圆角等值，直接通过
computed 派生即可，不要再次写入另一份主题缓存。

如果只使用单一设计风格，也可继续按需引入：

```typescript
import '@robot-admin/theme/styles/glass-morphism.css'
```

以下兼容路径继续有效：

- `@robot-admin/theme/styles/glass-morphism.css`
- `@robot-admin/theme/styles/corporate-minimal.css`
- `@robot-admin/theme/styles/dark-tech.css`

## Store API

### `createThemeStore(options?)`

```typescript
import { createThemeStore } from '@robot-admin/theme/vue'

const useAppThemeStore = createThemeStore({
  id: 'app-theme',
  defaultMode: 'system',
  defaultDesignStyle: 'glass-morphism',
  storageKey: 'theme-mode',
  designStyleStorageKey: 'app-design-style',
  enableTransition: true,
  syncAcrossTabs: true,
  onError: (error, context) => reportThemeDegradation(error, context),
})
```

| 选项 | 默认值 | 说明 |
|---|---|---|
| `id` | `theme` | Pinia Store id，不能为空 |
| `defaultMode` | `system` | 默认用户主题偏好 |
| `defaultDesignStyle` | `glass-morphism` | 默认设计风格 |
| `storageKey` | `theme-mode` | 模式存储键 |
| `designStyleStorageKey` | `robot-admin-design-style` | 设计风格存储键，不得与模式键相同 |
| `enableTransition` | `true` | 是否使用 View Transition 渐进增强 |
| `storage` | 浏览器 localStorage | 可注入兼容 `getItem/setItem/removeItem` 的存储；`null` 禁用持久化 |
| `syncAcrossTabs` | `true` | 使用内置 localStorage 时同步同源标签页 |
| `onError` | — | 存储或系统偏好读取失败时的可选诊断回调 |

### 状态和 getter

Pinia 会自动解包 Store 中的 ref/computed：

| 属性 | 消费侧类型 | 说明 |
|---|---|---|
| `mode` | `ThemeMode` | 用户模式；不兼容当前风格时会安全归一化 |
| `systemIsDark` | `boolean` | 当前系统颜色偏好 |
| `isDark` | `boolean` | 实际是否呈现暗色 |
| `designStyle` | `DesignStyle` | 当前设计风格 |
| `currentDesignStyleConfig` | `DesignStyleConfig` | 只读风格元数据 |

请通过 action 修改状态，避免直接赋值绕过校验、持久化和 DOM 同步。

### Actions

| 方法 | 说明 |
|---|---|
| `init()` | 初始化并同步 DOM，重复调用安全 |
| `destroy()` | 移除系统偏好和 storage 监听 |
| `setMode(mode)` | 设置模式并保持设计风格兼容 |
| `toggleMode()` | 循环 light → dark → system |
| `toggleDark()` | 在 light/dark 间切换 |
| `setDesignStyle(style)` | 设置风格；例如 dark-tech 会归一化到暗色 |
| `toggleDesignStyle()` | 循环三套设计风格 |

## Core API

```typescript
import {
  isThemeMode,
  resolveCompatibleThemeMode,
  resolveThemeMode,
} from '@robot-admin/theme/core'

const mode = isThemeMode(savedMode) ? savedMode : 'system'
const visualMode = resolveThemeMode(mode, prefersDark)
const compatibleMode = resolveCompatibleThemeMode(
  mode,
  prefersDark,
  designStyleConfig,
)
```

`/core` 同时导出主题类型、只读元数据、`THEME_MODES` 和 `DESIGN_STYLES`。

## View Transition

```typescript
import { useViewTransition } from '@robot-admin/theme/vue'

await useViewTransition(() => {
  document.documentElement.dataset.theme = 'dark'
})
```

不支持 API、用户启用 reduced-motion 或浏览器主动中止动画时，会直接执行 DOM
更新；并发调用不会提前移除 `.theme-transitioning`。业务 callback 的错误仍会原样传播。

## CSS 职责

```text
data-theme         -> 实际明暗模式，本包 Store 管理
data-design-style  -> 设计风格，本包 Store 管理
data-menu-theme    -> 菜单呈现，由 layout/消费方管理
```

三套 CSS 均以 `data-design-style` 作为作用域，不控制 `.n-menu`。现有 `C_*` 选择器
继续保留，以维持 Robot 组件体系的呈现和兼容性。

## 从 0.4.x 升级

0.5.x 不删除原 API 或 CSS 路径：

1. 通用 Vue 项目建议从 `/vue` 导入。
2. Naive UI 项目建议从 `/naive` 导入，并用 `/naive/styles` 替代三条样式导入。
3. 原来的根入口仍等价于 `/vue`。
4. `syncAcrossTabs` 默认开启；传入自定义 `storage` 时不会隐式监听 window storage。
5. dark-tech 等受限风格下，后续 `setMode()` 也会继续保持兼容，不会形成非法组合。

0.5.1 额外从 `/naive` 导出 `GlobalTheme` 与 `GlobalThemeOverrides` 类型，消费方
无需再依赖 Naive UI 内部类型路径。

## License

MIT © ChenYu

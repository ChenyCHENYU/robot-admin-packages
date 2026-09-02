# @robot-admin/directives

面向 Vue 3 的通用交互指令集。提供 11 个指令、完整 TypeScript 类型、按需子路径导入、应用级权限与消息适配器，以及可预测的挂载、更新和卸载行为。

[![npm version](https://img.shields.io/npm/v/@robot-admin/directives.svg)](https://www.npmjs.com/package/@robot-admin/directives)
[![license](https://img.shields.io/npm/l/@robot-admin/directives.svg)](./LICENSE)

## 能力与约束

- Vue `>=3.3`，无运行时 UI 框架依赖。
- ESM、CommonJS、完整声明文件和显式子路径导出。
- 指令状态使用 `WeakMap` 隔离；卸载时清理计时器、Observer、全局监听器和临时 DOM。
- 优先采用 Pointer Events，并补齐键盘、ARIA、焦点和 reduced-motion 行为。
- Loading/Tooltip 样式按 `Document` 注入，可通过 `styleNonce` 适配 CSP。
- 权限、复制提示均可在应用安装时注入，适合多应用和微前端场景。

当前主版本：`2.x`。

## 安装

```bash
npm install @robot-admin/directives
# 或
bun add @robot-admin/directives
```

## 注册

推荐使用标准 Vue 插件 API：

```ts
import { createApp } from "vue";
import { createDirectives } from "@robot-admin/directives";

const app = createApp(App);

app.use(
  createDirectives({
    prefix: "", // 可设置为 "ra-"，对应 v-ra-copy
    notify: (type, message) => uiMessage[type](message),
    permission: {
      getAuthData: () => permissionStore.permissionMap,
      onDenied: (reason, element) => auditDenied(reason, element),
    },
  }),
);

app.mount("#app");
```

兼容入口仍可使用：

```ts
import { setupDirectives } from "@robot-admin/directives";

setupDirectives(app, options);
```

按需注册时可从根入口或子路径导入：

```ts
import { vDebounce } from "@robot-admin/directives";
import vPermission from "@robot-admin/directives/permission";

app.directive("debounce", vDebounce);
app.directive("permission", vPermission);
```

可用子路径：`copy`、`debounce`、`throttle`、`drag`、`longpress`、`permission`、`watermark`、`lazy`、`loading`、`tooltip`、`click-outside`。

## 指令一览

| 指令 | 主要用途 | 关键能力 |
| --- | --- | --- |
| `v-copy` | 复制文本 | 动态文本、Clipboard 降级、键盘操作、消息适配 |
| `v-debounce` | 防抖 | handler-owned 模式、leading/trailing、动态事件 |
| `v-throttle` | 节流 | handler-owned 模式、leading/trailing、动态事件 |
| `v-drag` | 拖拽 | Pointer Events、边界、轴向、网格、无侵入清理 |
| `v-longpress` | 长按 | 指针与键盘、移动容差、进度、取消 |
| `v-permission` | 权限控制 | 应用级 Provider、AND/OR、通配符、三种降级 |
| `v-watermark` | 水印 | 多行、高 DPI、缓存、响应更新、可选防删除 |
| `v-lazy` | 懒加载 | 图片/背景、占位与错误图、竞态与请求清理 |
| `v-loading` | 加载遮罩 | 最小展示时长、全屏、ARIA、CSP |
| `v-tooltip` | 提示 | hover/focus/Escape、视口翻转、ellipsis |
| `v-click-outside` | 外部点击 | Shadow DOM、排除项、Document 级共享监听 |

## 推荐事件模式

`v-debounce` 和 `v-throttle` 推荐由指令直接持有 handler，原始事件通过参数传入。这样不会依赖阻断并重新派发 DOM 事件：

```vue
<script setup lang="ts">
const search = (event: Event) => {
  const value = (event.target as HTMLInputElement).value;
  // 请求搜索接口
};

const save = () => {
  // 保存
};
</script>

<template>
  <input
    v-debounce:input="{
      handler: search,
      delay: 300,
      trailing: true,
    }"
  />

  <button
    v-throttle:click="{
      handler: save,
      delay: 1000,
      leading: true,
      trailing: false,
    }"
  >
    保存
  </button>
</template>
```

`v-debounce="300" @click="save"` 与 `v-throttle="300" @click="save"` 仍作为兼容模式保留，新代码建议迁移到 handler-owned 模式。

## 使用示例

### 复制

```vue
<button
  v-copy="{
    text: async () => order.shareUrl,
    successMessage: '链接已复制',
    statusDuration: 500,
    onSuccess: (text) => audit(text),
    onError: (error) => report(error),
  }"
>
  复制链接
</button>
```

普通元素会自动获得 `role="button"`、`tabindex="0"` 和 Enter/Space 键支持；卸载时恢复原属性。`messageInstance` 仅为兼容旧版保留，推荐使用安装级 `notify`。

### 权限

```vue
<button v-permission="'orders:read'">查看订单</button>

<button
  v-permission="{
    permissions: ['orders:read', 'orders:approve'],
    mode: 'AND',
    fallback: 'disable',
    onDenied: (reason) => log(reason),
  }"
>
  审批订单
</button>
```

权限映射示例：

```ts
const permissionMap = {
  "orders:read": true,
  "users:*": true, // 匹配 users:read、users:write 等
};
```

`fallback` 可为：

- `hide`：隐藏元素，默认值。
- `disable`：禁用表单控件；普通元素禁用指针交互。
- `show`：保留可见性，同时使用禁用状态和半透明提示。

未提供权限数据时采用拒绝默认值。权限恢复或指令卸载时只回收指令仍然持有的 `display`、`opacity`、`pointer-events`、`disabled` 和 `aria-disabled`；若业务在指令生效期间更新了这些状态，会保留业务的新值，避免卸载覆盖宿主状态。权限集合发生变化时会重新触发一次拒绝通知，重复渲染同一集合不会重复通知。

### 拖拽与长按

```vue
<section
  v-drag="{
    handle: '.card-title',
    boundary: true,
    axis: 'both',
    grid: [8, 8],
    onEnd: (_element, position) => savePosition(position),
  }"
>
  <header class="card-title">拖动</header>
</section>

<button
  v-longpress="{
    duration: 800,
    movementTolerance: 10,
    onProgress: (progress) => setProgress(progress),
    onTrigger: removeItem,
  }"
>
  长按删除
</button>
```

`v-drag` 的 `boundary` 支持 `true`（父元素）、CSS 选择器或 `HTMLElement`；`axis` 支持 `x`、`y`、`both`。更新或卸载时只恢复仍由指令写入的内联样式，并主动释放 Pointer Capture、动画帧、Document 监听与文本选择锁，不覆盖业务运行期写入的新样式。

### 水印与懒加载

```vue
<div
  v-watermark="{
    text: [user.name, user.employeeNo],
    fontFamily: 'sans-serif',
    fontSize: 15,
    gap: [120, 100],
    rotate: -25,
    opacity: 0.15,
    preventDelete: true,
  }"
>
  敏感内容
</div>

<img
  v-lazy="{
    src: imageUrl,
    loading: '/placeholder.svg',
    error: '/fallback.png',
    rootMargin: '300px 0px',
    threshold: 0.1,
    onError: report,
  }"
/>

<div v-lazy:background="bannerUrl" />
```

水印会按当前 `devicePixelRatio` 生成清晰位图（内部上限为 4），同时保持 CSS 平铺尺寸不变。`preventDelete` 会启用 `MutationObserver`，只建议用于确有防篡改需求的区域。懒加载在不支持 `IntersectionObserver` 时会立即加载，并使用 generation 标记阻止旧异步请求覆盖新绑定值；更新或卸载会断开观察器并移除预加载器属性，不会通过空 `src` 触发额外请求。

### Loading、Tooltip 与外部点击

```vue
<div
  v-loading="{
    value: loading,
    text: '加载中…',
    minDuration: 300,
    spinnerSize: 32,
    ariaLabel: '订单列表加载中',
    styleNonce: cspNonce,
  }"
>
  <!-- content -->
</div>

<button
  v-tooltip="{
    content: '重新同步数据',
    placement: 'top',
    showDelay: 150,
    maxWidth: 320,
    styleNonce: cspNonce,
  }"
>
  同步
</button>

<aside
  v-click-outside="{
    handler: close,
    exclude: ['[data-popover-trigger]', triggerElement],
    onError: report,
  }"
>
  <!-- popover -->
</aside>
```

Loading 文本通过 `textContent` 渲染。Tooltip 使用 `role="tooltip"` 和 `aria-describedby`，支持键盘焦点与 Escape。Click-outside 使用 `composedPath()`，可正确处理 Shadow DOM。

## TypeScript

```ts
import type {
  ClickOutsideOptions,
  CopyOptions,
  DebounceOptions,
  DirectivesPluginOptions,
  DragOptions,
  LazyOptions,
  LoadingOptions,
  LongPressOptions,
  PermissionOptions,
  PermissionProvider,
  ThrottleOptions,
  TooltipOptions,
  WatermarkOptions,
} from "@robot-admin/directives";
```

## SSR、CSP 与浏览器说明

- 指令生命周期只在客户端执行；Nuxt 中应在 `.client.ts` 插件注册。
- 根模块导入不会主动访问 `window` 或 `document`。
- Clipboard API 在安全上下文中使用，失败时回退至浏览器兼容复制路径。
- Loading/Tooltip 的内联样式标签可传 `styleNonce`；水印使用 Canvas data URL，应同步评估站点 CSP。
- Pointer Events、IntersectionObserver、ResizeObserver 和 MutationObserver 均采用能力检测或在卸载时释放。

## 从 1.x 升级到 2.x

| 变化 | 迁移建议 |
| --- | --- |
| 推荐 `app.use(createDirectives(options))` | `setupDirectives(app)` 仍可用，可逐步迁移 |
| 防抖/节流新增 handler-owned 模式 | 使用 `v-debounce:event="{ handler }"`，兼容模式仍保留 |
| 权限支持应用级 Provider，缺失数据时拒绝 | 安装时配置 `permission.getAuthData`，或绑定中传 `authData` |
| 拖拽改用 Pointer Events | 回调事件类型改为 `PointerEvent`；触摸设备不再需要独立适配 |
| 长按回调统一为 `onTrigger` | 直接函数绑定仍可用，旧配置请改为 `onTrigger` |
| 子路径导入正式公开 | 避免访问包内 `src` 或未声明的深层路径 |
| Copy 的 `messageInstance` 标为 deprecated | 使用插件 `notify` 或 `onSuccess`/`onError` |

2.x 会更严格校验负延时、非法尺寸、阈值和网格配置；捕获 `RangeError` 可将配置错误接入应用监控。

## 开发验证

```bash
bun run type-check
bun run test
bun run build
```

测试覆盖权限恢复、事件防抖与清理、外部点击排除、复制与无障碍属性、插件注册以及 Loading 的安全 DOM 构造。

## License

[MIT](./LICENSE) © ChenYu

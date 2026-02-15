# @robot-admin/directives

<div align="center">

🎯 **开箱即用的 Vue3 自定义指令集合**

[![npm version](https://img.shields.io/npm/v/@robot-admin/directives.svg)](https://www.npmjs.com/package/@robot-admin/directives)
[![license](https://img.shields.io/npm/l/@robot-admin/directives.svg)](https://github.com/ChenyCHENYU/robot-admin-packages/blob/main/LICENSE)

</div>

## ✨ 特性

- 🚀 **开箱即用** - 一行代码全局注册 7 个常用指令
- 🎯 **按需引入** - 支持单指令导入，Tree-shaking 友好
- 💪 **TypeScript** - 完整类型定义和智能提示
- 🔌 **零依赖** - 仅依赖 Vue 3.3+
- 📦 **体积小巧** - 打包后 ~30KB (gzip < 10KB)
- 🎨 **灵活配置** - 简单/高级两种用法

---

## 📦 快速开始

### 安装

```bash
npm install @robot-admin/directives
# or
bun add @robot-admin/directives
```

### 全局注册（推荐）

```typescript
// main.ts
import { createApp } from "vue";
import { setupDirectives } from "@robot-admin/directives";

const app = createApp(App);
setupDirectives(app);
app.mount("#app");
```

### 按需引入

```vue
<script setup>
import { vCopy, vDebounce } from "@robot-admin/directives";
</script>

<template>
  <button v-copy="'复制内容'">复制</button>
  <button v-debounce="300" @click="handleClick">防抖按钮</button>
</template>
```

### 快速体验

```vue
<script setup lang="ts">
import { ref } from "vue";

const searchText = ref("");
const handleSearch = (text: string) => {
  console.log("搜索:", text);
};
</script>

<template>
  <div class="demo-container">
    <!-- 复制指令 -->
    <button v-copy="'订单号: 202602150001'">复制订单号</button>

    <!-- 防抖搜索 -->
    <input
      v-model="searchText"
      v-debounce="500"
      @input="handleSearch(searchText)"
      placeholder="防抖搜索"
    />

    <!-- 权限按钮 -->
    <button v-permission="'admin'">管理员功能</button>

    <!-- 水印内容 -->
    <div v-watermark="'机密文件'" style="height: 300px">敏感内容区域</div>
  </div>
</template>
```

---

## 📚 指令列表

| 指令             | 功能             | 使用场景                         |
| ---------------- | ---------------- | -------------------------------- |
| **v-copy**       | 复制文本到剪贴板 | 一键复制订单号、邀请码、分享链接 |
| **v-debounce**   | 防抖处理         | 搜索输入框、表单提交按钮         |
| **v-throttle**   | 节流处理         | 滚动加载、频繁点击的按钮         |
| **v-drag**       | 元素拖拽         | 模态框拖动、看板卡片排序         |
| **v-longpress**  | 长按触发         | 删除操作二次确认、长按复制       |
| **v-permission** | 权限控制         | 按钮/功能的权限显隐              |
| **v-watermark**  | 水印添加         | 敏感内容防截图、版权保护         |

---

## 📖 详细文档

### v-copy - 复制指令

快速复制文本到剪贴板，支持自定义提示和回调。

**基础用法**

```vue
<!-- 复制字符串 -->
<button v-copy="'Hello World'">复制</button>

<!-- 复制元素文本内容 -->
<div v-copy>点击复制这段文本</div>
```

**高级配置**

```vue
<button
  v-copy="{
    text: '要复制的内容',
    successMessage: '复制成功！',
    errorMessage: '复制失败',
    onSuccess: (text) => console.log('已复制:', text),
    onError: (err) => console.error(err),
    messageInstance: message, // naive-ui 的 message 实例
  }"
>
  复制
</button>
```

**参数说明**

| 参数              | 类型                     | 默认值       | 说明                   |
| ----------------- | ------------------------ | ------------ | ---------------------- |
| `text`            | `string`                 | 元素文本     | 要复制的文本内容       |
| `successMessage`  | `string`                 | `'复制成功'` | 成功提示信息           |
| `errorMessage`    | `string`                 | `'复制失败'` | 失败提示信息           |
| `onSuccess`       | `(text: string) => void` | -            | 复制成功回调           |
| `onError`         | `(error: Error) => void` | -            | 复制失败回调           |
| `messageInstance` | `any`                    | -            | UI 组件的 message 实例 |

---

### v-debounce - 防抖指令

防止短时间内重复触发事件，适用于搜索输入、表单提交等场景。

**基础用法**

```vue
<!-- 默认 300ms 防抖 -->
<button v-debounce @click="handleSubmit">提交</button>

<!-- 自定义延迟时间 -->
<button v-debounce="500" @click="handleSubmit">提交</button>
```

**高级配置**

```vue
<button
  v-debounce="{
    delay: 500,
    immediate: true, // 首次立即执行
  }"
  @click="handleSubmit"
>
  立即提交
</button>
```

**参数说明**

| 参数        | 类型      | 默认值  | 说明                 |
| ----------- | --------- | ------- | -------------------- |
| `delay`     | `number`  | `300`   | 防抖延迟时间（毫秒） |
| `immediate` | `boolean` | `false` | 是否首次立即执行     |

---

### v-throttle - 节流指令

限制事件触发频率，适用于滚动、窗口调整大小等高频事件。

**基础用法**

```vue
<!-- 默认 300ms 节流 -->
<button v-throttle @click="handleClick">点击</button>

<!-- 自定义间隔时间 -->
<div v-throttle="1000" @scroll="handleScroll">滚动区域</div>
```

**参数说明**

| 参数    | 类型     | 默认值 | 说明                 |
| ------- | -------- | ------ | -------------------- |
| `delay` | `number` | `300`  | 节流间隔时间（毫秒） |

---

### v-drag - 拖拽指令

使元素可拖拽移动，支持边界限制。

**基础用法**

```vue
<!-- 自由拖拽 -->
<div v-drag>拖动我</div>

<!-- 仅标题栏可拖拽 -->
<div>
  <div v-drag="{ handle: '.header' }">
    <div class="header">拖拽此处</div>
    <div class="body">内容区域</div>
  </div>
</div>
```

**高级配置**

```vue
<div
  v-drag="{
    boundary: true, // 限制在父容器内
    handle: '.drag-handle', // 拖拽手柄选择器
  }"
>
  受限拖拽元素
</div>
```

**参数说明**

| 参数       | 类型      | 默认值  | 说明                  |
| ---------- | --------- | ------- | --------------------- |
| `boundary` | `boolean` | `false` | 是否限制在父容器内    |
| `handle`   | `string`  | -       | 拖拽手柄的 CSS 选择器 |

---

### v-longpress - 长按指令

长按触发回调，适用于删除确认、长按复制等场景。

**基础用法**

```vue
<script setup>
const handleLongPress = () => {
  console.log("长按触发");
};
</script>

<button v-longpress="handleLongPress">长按我</button>
```

**高级配置**

```vue
<button
  v-longpress="{
    duration: 1000, // 长按 1 秒触发
    callback: handleLongPress,
  }"
>
  长按 1 秒
</button>
```

**参数说明**

| 参数       | 类型         | 默认值 | 说明                 |
| ---------- | ------------ | ------ | -------------------- |
| `duration` | `number`     | `500`  | 长按触发时间（毫秒） |
| `callback` | `() => void` | -      | 长按触发的回调函数   |

---

### v-permission - 权限指令

根据用户权限控制元素的显示/隐藏/禁用。

**基础用法**

```vue
<!-- 单个权限 -->
<button v-permission="'admin'">管理员可见</button>

<!-- 多个权限（OR 模式） -->
<button v-permission="['admin', 'editor']">编辑权限可见</button>
```

**高级配置**

```vue
<button
  v-permission="{
    permissions: ['admin', 'super'],
    mode: 'AND', // 需要同时拥有多个权限
    fallback: 'disable', // 无权限时禁用而非隐藏
    authData: userPermissions, // 自定义权限数据源
  }"
>
  需要多权限
</button>
```

**参数说明**

| 参数          | 类型                      | 默认值   | 说明               |
| ------------- | ------------------------- | -------- | ------------------ |
| `permissions` | `string \| string[]`      | -        | 所需权限标识       |
| `mode`        | `'OR' \| 'AND'`           | `'OR'`   | 多权限判断模式     |
| `fallback`    | `'hide' \| 'disable'`     | `'hide'` | 无权限时的处理方式 |
| `authData`    | `Record<string, boolean>` | -        | 自定义权限数据     |

---

### v-watermark - 水印指令

为元素添加防篡改水印，适用于敏感内容保护。

**基础用法**

```vue
<!-- 文本水印 -->
<div v-watermark="'机密文件'">内容区域</div>

<!-- 多行水印 -->
<div v-watermark="['机密文件', '请勿外传']">内容区域</div>
```

**高级配置**

```vue
<div
  v-watermark="{
    text: '内部资料',
    textColor: 'rgba(0, 0, 0, 0.15)',
    fontSize: 16,
    fontFamily: 'Microsoft YaHei',
    rotate: -30, // 旋转角度
    gap: [100, 100], // 水印间距
    zIndex: 9999,
    preventDelete: true, // 防止删除（MutationObserver）
  }"
>
  带水印的内容
</div>
```

**参数说明**

| 参数            | 类型                 | 默认值            | 说明                      |
| --------------- | -------------------- | ----------------- | ------------------------- |
| `text`          | `string \| string[]` | -                 | 水印文本内容              |
| `textColor`     | `string`             | `rgba(0,0,0,.15)` | 水印文字颜色              |
| `fontSize`      | `number`             | `16`              | 水印字体大小              |
| `fontFamily`    | `string`             | `sans-serif`      | 水印字体                  |
| `rotate`        | `number`             | `-30`             | 水印旋转角度              |
| `gap`           | `[number, number]`   | `[100, 100]`      | 水印间距 [x, y]           |
| `zIndex`        | `number`             | `9999`            | 水印层级                  |
| `preventDelete` | `boolean`            | `false`           | 防止删除（监听 DOM 变化） |

---

## � 最佳实践

### 1. 指令组合使用

```vue
<!-- 防抖 + 权限控制 + 复制 -->
<button
  v-permission="'admin'"
  v-debounce="500"
  v-copy="orderNumber"
  @click="handleSubmit"
>
  提交订单
</button>
```

### 2. 与 UI 组件库集成

```typescript
// main.ts - 与 Naive UI 集成
import { createApp } from "vue";
import { createDiscreteApi } from "naive-ui";
import { setupDirectives } from "@robot-admin/directives";

const app = createApp(App);
const { message } = createDiscreteApi(["message"]);

// 全局提供 message 实例供 v-copy 使用
app.provide("$message", message);

setupDirectives(app);
```

```vue
<!-- 在组件中使用 -->
<script setup>
import { inject } from "vue";
const message = inject("$message");
</script>

<template>
  <button v-copy="{ text: '内容', messageInstance: message }">
    复制（使用 Naive UI 提示）
  </button>
</template>
```

### 3. 动态权限控制

```vue
<script setup>
import { computed } from "vue";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();
const userPermissions = computed(() => userStore.permissions);
</script>

<template>
  <!-- 动态权限数据 -->
  <button
    v-permission="{
      permissions: ['delete:user'],
      authData: userPermissions,
      fallback: 'disable',
    }"
  >
    删除用户
  </button>
</template>
```

### 4. 响应式水印

```vue
<script setup>
import { computed } from "vue";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();
const watermarkText = computed(() => [
  userStore.username,
  new Date().toLocaleDateString(),
]);
</script>

<template>
  <!-- 水印会随用户信息自动更新 -->
  <div v-watermark="watermarkText">敏感内容</div>
</template>
```

### 5. 性能优化建议

- ✅ **全局注册推荐**：如果项目中多处使用，推荐全局注册
- ✅ **按需引入优化**：单页应用特定页面可按需引入
- ✅ **防抖节流参数**：根据实际网络延迟和用户体验调整延迟时间
- ✅ **水印防删除**：`preventDelete: true` 会启用 MutationObserver，注意性能影响
- ⚠️ **避免过度使用**：不要在列表循环中使用复杂指令（如水印）

---

## �🔧 TypeScript 支持

完整的类型定义和智能提示：

```typescript
import type {
  CopyOptions,
  CopyBinding,
  DebounceOptions,
  ThrottleOptions,
  DragOptions,
  LongPressOptions,
  PermissionOptions,
  WatermarkOptions,
  WatermarkBinding,
} from "@robot-admin/directives";

// 示例：类型化配置
const copyConfig: CopyOptions = {
  text: "Hello World",
  successMessage: "复制成功",
  onSuccess: (text) => console.log(text),
};
```

---

## 🛠️ 开发与调试

### 本地开发

```bash
# 克隆 monorepo
git clone https://github.com/ChenyCHENYU/robot-admin-packages.git
cd robot-admin-packages/packages/directives

# 安装依赖
bun install

# 开发模式（监听文件变化）
bun run dev

# 构建生产包
bun run build
```

### 在主项目中调试

```bash
# 1. 在 directives 包目录建立链接
cd packages/directives
bun link

# 2. 在主项目中使用链接
cd /path/to/your-project
bun link @robot-admin/directives

# 3. 启动开发服务器（自动使用本地源码）
bun run dev:local
```

**提示**：主项目需配置 Vite alias 解析本地包源码，参考 [viteLocalPackagesConfig.ts](https://github.com/ChenyCHENYU/Robot_Admin/blob/main/src/config/vite/localPackagesAlias.ts)

---

## 🚀 扩展指南

### 添加新指令

1. **创建指令文件** `src/directives/your-directive.ts`

```typescript
import type { Directive, DirectiveBinding } from "vue";

// 定义配置类型
export interface YourDirectiveOptions {
  // 配置选项
}

// 定义指令值类型
export type YourDirectiveBinding = string | YourDirectiveOptions;

// 实现指令逻辑
const vYourDirective: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding<YourDirectiveBinding>) {
    // 指令挂载时的逻辑
  },
  updated(el: HTMLElement, binding: DirectiveBinding<YourDirectiveBinding>) {
    // 指令更新时的逻辑
  },
  unmounted(el: HTMLElement) {
    // 指令卸载时的清理逻辑
  },
};

export default vYourDirective;
```

2. **注册到导出** `src/index.ts`

```typescript
// 导出指令
export { default as vYourDirective } from "./directives/your-directive";
// 导出类型
export type {
  YourDirectiveOptions,
  YourDirectiveBinding,
} from "./directives/your-directive";
```

3. **添加到全局注册** `src/install.ts`

```typescript
import vYourDirective from "./directives/your-directive";

const directivesMap = {
  // ...existing directives
  "your-directive": vYourDirective,
};
```

4. **更新 README 文档** 添加使用示例和说明

5. **构建并测试**

```bash
bun run build
# 在主项目中测试
```

### 贡献新指令

欢迎贡献常用的业务指令！提交前请确保：

- ✅ 指令具有通用性，适用于多种业务场景
- ✅ 完整的 TypeScript 类型定义
- ✅ 清晰的代码注释和 JSDoc 文档
- ✅ 测试验证跨浏览器兼容性
- ✅ 更新 README 文档和使用示例

---

## 🗺️ 路线图

### v1.x（当前版本）

- ✅ 7 个核心指令（copy / debounce / throttle / drag / longpress / permission / watermark）
- ✅ 完整 TypeScript 支持
- ✅ 零依赖设计

### v2.0（规划中）

- [ ] **v-lazy** - 图片懒加载指令
- [ ] **v-infinite-scroll** - 无限滚动指令
- [ ] **v-click-outside** - 点击外部区域触发
- [ ] **v-tooltip** - 轻量级 tooltip 指令
- [ ] **v-loading** - 加载状态指令
- [ ] 支持自定义指令配置（全局默认值）
- [ ] 提供 Vue 模板类型增强（Volar 插件）

### 未来计划

- [ ] 指令组合器（Compose API）
- [ ] 单元测试覆盖
- [ ] 在线 Playground 演示
- [ ] 性能监控和优化

**🎉 欢迎提交 [Issue](https://github.com/ChenyCHENYU/robot-admin-packages/issues) 或 [PR](https://github.com/ChenyCHENYU/robot-admin-packages/pulls) 参与建设！**

---

## ❓ 常见问题

### Q1: 如何解决 TypeScript 类型提示不生效？

**A:** 确保安装了 `@vue/runtime-core` 类型扩展。在项目根目录创建 `global.d.ts`：

```typescript
// global.d.ts
import "@robot-admin/directives";

declare module "@vue/runtime-core" {
  export interface GlobalDirectives {
    vCopy: (typeof import("@robot-admin/directives"))["vCopy"];
    vDebounce: (typeof import("@robot-admin/directives"))["vDebounce"];
    vThrottle: (typeof import("@robot-admin/directives"))["vThrottle"];
    vDrag: (typeof import("@robot-admin/directives"))["vDrag"];
    vLongpress: (typeof import("@robot-admin/directives"))["vLongpress"];
    vPermission: (typeof import("@robot-admin/directives"))["vPermission"];
    vWatermark: (typeof import("@robot-admin/directives"))["vWatermark"];
  }
}
```

### Q2: v-permission 指令如何与 Pinia/Vuex 集成？

**A:** 通过 `authData` 参数传入响应式权限数据：

```vue
<script setup>
import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const permissions = computed(() => authStore.permissions);
</script>

<template>
  <button v-permission="{ permissions: 'admin', authData: permissions }">
    管理功能
  </button>
</template>
```

### Q3: v-copy 复制失败怎么办？

**A:** 可能原因：

1. **HTTPS 要求**：现代浏览器要求 HTTPS 才能使用剪贴板 API
2. **权限问题**：用户未授予剪贴板权限
3. **降级方案**：包已自动降级到 `document.execCommand` 方式

调试方法：

```vue
<button
  v-copy="{
    text: '内容',
    onError: (err) => console.error('复制失败:', err),
  }"
>
  复制
</button>
```

### Q4: 水印被删除怎么办？

**A:** 启用 `preventDelete` 选项：

```vue
<div v-watermark="{ text: '水印', preventDelete: true }">内容</div>
```

**注意**：此功能使用 MutationObserver 监听 DOM 变化，会有轻微性能开销。

### Q5: 如何在 Nuxt/Vite SSR 中使用？

**A:** 指令仅在客户端执行，需添加客户端判断：

```typescript
// plugins/directives.client.ts (Nuxt)
import { setupDirectives } from "@robot-admin/directives";

export default defineNuxtPlugin((nuxtApp) => {
  setupDirectives(nuxtApp.vueApp);
});
```

```typescript
// main.ts (Vite SSR)
import { setupDirectives } from "@robot-admin/directives";

if (typeof window !== "undefined") {
  setupDirectives(app);
}
```

### Q6: 指令性能优化建议？

**A:**

- ✅ 避免在 `v-for` 循环中大量使用复杂指令（如水印）
- ✅ 防抖/节流延迟时间根据实际需求调整（不宜过小）
- ✅ 拖拽指令在长列表中慎用，考虑虚拟滚动
- ✅ 权限指令使用计算属性缓存权限判断结果

---

## 📄 许可证

[MIT](https://github.com/ChenyCHENYU/robot-admin-packages/blob/main/LICENSE) © 2026 [ChenYu](https://github.com/ChenyCHENYU)

---

## 🔗 相关链接

- **NPM**: https://www.npmjs.com/package/@robot-admin/directives
- **GitHub**: https://github.com/ChenyCHENYU/robot-admin-packages
- **主项目**: https://github.com/ChenyCHENYU/Robot_Admin
- **问题反馈**: https://github.com/ChenyCHENYU/robot-admin-packages/issues

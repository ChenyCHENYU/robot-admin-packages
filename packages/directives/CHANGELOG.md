# @robot-admin/directives

## 2.0.1

### Patch Changes

- 678118d: Harden DOM ownership and cleanup for permission, drag and lazy directives, and render watermark tiles sharply on high-DPI displays.

## 2.0.0

### Major Changes

- eba5df3: 将 Vue 指令包升级为可配置、可按需导入且生命周期可预测的 2.x 架构。

  - 新增标准 `createDirectives()` 插件、应用级权限 Provider、复制消息适配器和全部 11 个指令的公开子路径导出。
  - 防抖与节流新增 handler-owned 模式，同时保留旧事件门控兼容层；拖拽和长按统一使用 Pointer Events 并补齐键盘交互。
  - 权限状态、原始样式与 ARIA 属性可准确恢复；Click Outside 共享 Document 监听并支持 Shadow DOM 和排除项。
  - Loading、Tooltip、Lazy 和 Watermark 修复异步竞态、计时器/Observer 泄漏，增加 CSP、reduced-motion、无障碍与安全 DOM 渲染。
  - 增加浏览器生命周期测试、显式类型检查、许可证、安全说明和完整 1.x 迁移文档。

## 1.1.1

### Patch Changes

- Render `v-loading` text with safe DOM APIs instead of interpolating user content into `innerHTML`.
- Cancel delayed `v-click-outside` registration during same-tick unmounts to prevent document listener leaks.
- Make `v-watermark` resize handling use the latest binding options and remove production debug logging.
- Add regression tests for the security and lifecycle contracts.

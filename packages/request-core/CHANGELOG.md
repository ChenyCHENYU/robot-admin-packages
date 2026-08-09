# @robot-admin/request-core

## 0.2.0

### Minor Changes

- Share one AbortController across caller signals, dedupe and route cancellation, and fix stale-request cleanup races.
- Retry only idempotent HTTP methods by default, add configurable method allowlists and ±25% jitter, and make backoff cancellation leak-free.
- Include authorization, tenant and user headers in default cache/dedupe keys to prevent cross-identity reuse.
- Implement shared re-login promises with explicit success/cancel settlement for concurrent 401 responses.
- Add `@robot-admin/request-core/axios` and `/crud` subpath exports, and make Axios a peer dependency to avoid duplicate-instance cancellation issues.
- Add regression tests for cancellation, concurrency, retry safety, cache identity and re-login coordination.

## 0.1.3

### Patch Changes

- 更新 README 文档：
  - 优化文档结构，更清晰直观
  - 添加 30 秒快速上手指南
  - 使用表格展示所有 API 和配置
  - 添加完整示例和最佳实践

## 0.1.2

### Patch Changes

- Initial release of @robot-admin/request-core

  Features:

  - Axios wrapper with 7 built-in plugins (cache, retry, dedupe, cancel, request, response, reLogin)
  - useTableCrud composable for table CRUD operations
  - Full TypeScript support
  - Vue 3 and Naive UI integration

## 0.1.1

### Patch Changes

- Initial release of @robot-admin/request-core

  Features:

  - Axios wrapper with 7 built-in plugins (cache, retry, dedupe, cancel, request, response, reLogin)
  - useTableCrud composable for table CRUD operations
  - Full TypeScript support
  - Vue 3 and Naive UI integration

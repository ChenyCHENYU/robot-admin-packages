# @robot-admin/request-core

> `0.4.0` is the cumulative release candidate. The `0.2.1` and `0.3.0`
> sections below record the internal implementation milestones folded into it;
> they are not separate publication requirements.

## 0.4.0

### Minor Changes

- Add a UI-independent Vue entry with `useRequest`, Client injection and a headless
  `useTableCrud` supporting typed function handlers, filters, sorting and lifecycle
  cancellation.
- Add independent initial/loading/refreshing/create/update/remove state and latest-wins
  protection so stale list responses cannot overwrite current data.
- Prevent canceled/reset `useRequest` executions from committing stale results and
  isolate lifecycle callback failures from real request outcomes.
- Add bounded batch deletion, configurable refresh-after-mutation, `createDraft`,
  search/reset/sort methods and consistent RequestError state.
- Keep local rows and totals consistent when delete refresh is disabled, and isolate
  presentation adapter failures from mutation results.
- Add `/naive` as a thin Message/Dialog compatibility adapter while retaining the root
  and `/crud` APIs for existing applications.
- Rewrite the package and CRUD documentation so every documented API matches the
  implementation and add a migration guide from 0.2.x.

## 0.3.0

### Minor Changes

- Add `createRequestClient()` with an isolated Axios runtime, flat typed methods,
  global policy defaults and explicit default-client opt-in.
- Add `join`, `takeLatest`, `takeFirst` and `allow` concurrency policies, request scopes,
  cache controllers and lifecycle disposal.
- Add single-flight proactive refresh, concurrent 401 recovery and reauthentication
  hooks with one-replay protection.
- Add `RequestError`, business response adapters, raw responses and observational
  request hooks.
- Extend retry with `Retry-After`, maximum delay, elapsed-time budgets, lifecycle hooks
  and unsafe-body protection.

## 0.2.1

### Patch Changes

- Scope cache, dedupe, cancellation and re-login state to each Axios instance, fixing
  cross-backend and cross-tenant contamination.
- Share the selected default instance across root, ESM/CJS and subpath bundles and fix
  the previously unusable standalone `/crud` path.
- Include baseURL and response type in request keys, fingerprint identity headers and
  protect cached values from consumer mutation.
- Register error-only request/response interceptors, make global RegExp cancellation
  whitelists deterministic and restrict implicit dedupe to safe methods.
- Correct direct-array CRUD extraction, null success checks and zero total parsing.
- Add package validation, LICENSE, SECURITY policy and regression coverage.

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

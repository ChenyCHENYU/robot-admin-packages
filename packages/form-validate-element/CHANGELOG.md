# @robot-admin/form-validate-element

## 1.0.1

### Patch Changes

- refactor: 内部优化 —— 消除重复逻辑、补充测试、完善文档

  ## 重构（无 API 变更）

  - compareWith / debouncedAsyncCheck 改为委托 core 实现，消除 naive 与 element 版的重复逻辑
  - mergeTriggers 支持空数组兜底，去除 advanced.ts 中 3 处占位 RuleSpec 代码异味

  ## 测试

  - 新增 vitest 测试套件（63 个用例），覆盖 numeric 五层边界、optional 空值放行、when/some/every 消息透传、compareWith、debouncedAsyncCheck、mergeRules 等

  ## 文档

  - naive README 补充 numeric 数值契约与 optional 非必填校验用法示例

- Updated dependencies
  - @robot-admin/form-validate-core@1.0.1

## 1.0.0

### Major Changes

- feat(form-validate): 抽离框架无关核心层，新增 Element Plus 适配包

  ## 破坏性变更（form-validate v3.0.0）

  - 校验逻辑抽离到 `@robot-admin/form-validate-core`，本包成为 naive-ui 适配层
  - 新增 runtime dependency `@robot-admin/form-validate-core`
  - 对外 API（PRESET_RULES / when / createRule 等）完全兼容，行为无变化

  ## 新增包

  - **@robot-admin/form-validate-core** —— 框架无关核心层，零 UI 依赖
  - **@robot-admin/form-validate-element** —— Element Plus 适配包，与 naive 版 API 一致

  ## 新增能力（core，naive 与 element 版共享）

  - `numeric(contract, field)` —— 数据库 DECIMAL(p,s) 数值精度/范围契约校验
  - `optional(rule)` —— 非必填包装器（空值放行）
  - EP 版产出的规则可用于 el-form / BaseForm / 表格内嵌编辑（advance-table / jh-grid）

### Patch Changes

- Updated dependencies
  - @robot-admin/form-validate-core@1.0.0

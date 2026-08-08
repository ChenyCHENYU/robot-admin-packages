# @robot-admin/form-validate

## 3.4.0

### Minor Changes

- feat: validateRecord 支持嵌套点路径校验

  validateRecord / validateRows 的 ruleMap 字段名现支持点路径嵌套：

  - 对象嵌套：'address.city'
  - 数组索引：'items[0].qty'
  - 深层组合：'a[0].b.c'

  普通平铺字段（不含 . [ ]）行为与 record[key] 完全一致，零副作用。
  主从结构表格、嵌套对象表单的提交校验可直接用路径表达，无需展平。

## 3.3.1

### Patch Changes

- docs: 重写 README，结构化按场景速查

  - 从 578 行精简至 240 行，信息密度提升
  - 新增「30 秒上手」「按场景速查」（7 个高频场景）「API 全景」（表格化）
  - 补全 Element Plus 用法、批量校验 validateRows 用法、数值契约用法
  - 新增「从旧版迁移」对照表
  - 修正 optional 返回 RuleSpec 需经适配器转换的文档准确性

## 3.3.0

### Minor Changes

- feat: 新增批量校验工具 validateValue / validateRecord / validateRows

  ## 新增能力

  - `validateValue(value, rules)` —— 校验单个值，返回第一条失败消息（null 表示通过）
  - `validateRecord(record, ruleMap)` —— 校验一条记录的多字段，返回 { field, message }
  - `validateRows(rows, ruleMap)` —— 表格提交场景，校验多行，返回 { rowIndex, field, message }

  ## 价值

  让「表格提交前批量校验」与「表单实时校验」共用同一份 RuleSpec，
  消除业务侧手写遍历逻辑（如 validateSteelRecord / validateRows）。
  同一套规则定义既可经 toElementRules 喂给 el-form/表格列实时校验，
  也可经 validateRows 在提交时做兜底，零逻辑重复。

  ## 测试

  新增 17 个用例（总计 80），覆盖空规则、异步规则、消息透传、缺失字段、表格多行、startIndex 偏移等。

## 3.2.0

### Minor Changes

- feat: 收敛为单包，内置 Element Plus 适配，废弃 core/element 独立包

  ## 破坏性变更（包结构）

  - 废弃 `@robot-admin/form-validate-core` 和 `@robot-admin/form-validate-element` 两个独立包
  - 收敛为 `@robot-admin/form-validate` 单包，零 UI 框架依赖（不再声明 naive-ui/element-plus peerDep）

  ## 新增能力

  - 内置 `toElementRule` / `toElementRules` 适配器，RuleSpec 可一键转 Element Plus 规则
  - 新增 `ELEMENT_RULES` 预设（element-plus 版）、`ELEMENT_COMBOS` 组合
  - 新增 `whenElement` / `compareWithElement` / `someElement` / `everyElement` 等 element 版高级功能
  - 新增 `createSpec` / `whenSpec` 等框架无关 API，以及 `SPEC_RULES` 预设

  ## 向后兼容

  - `PRESET_RULES` / `RULE_COMBOS` / `createRule` / `when` ... 等全部 naive API 保持不变
  - `FieldRule` 类型别名保留

  ## 技术改进

  - rules 全部产出框架无关 RuleSpec，naive/element 预设仅末尾适配器包装，零逻辑重复
  - 63 个 vitest 用例覆盖

## 3.0.1

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

## 3.0.0

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

## 2.0.0

### Major Changes

- 🎉 首次发布 @robot-admin/form-validate v1.0.0

  ## ✨ 核心特性

  - 48+ 预设验证规则，覆盖企业级常见场景
  - 模块化代码结构，按功能分类便于维护
  - 完整的 TypeScript 类型支持
  - Tree-shaking 优化，按需引入

  ## 📦 包含模块

  - **基础验证** (required, integer, number, boolean, array, date, enum, pattern)
  - **字符串验证** (length, minLength, maxLength, startsWith, endsWith, includes)
  - **数字验证** (range, min, max, between)
  - **数组验证** (array, arrayMinLength, arrayMaxLength, arrayUnique)
  - **日期验证** (date, dateAfter, dateBefore, dateRange)
  - **格式验证** (mobile, email, url, ip, ipv6, mac, domain, hexColor, username, strongPassword)
  - **中国本地化** (idCard, postalCode, bankCard, creditCode, licensePlate, qq, wechat)

  ## 🚀 高级功能

  - `when` - 条件验证
  - `compareWith` - 跨字段比较
  - `debouncedAsyncCheck` - 防抖异步验证
  - `some` - OR 验证（满足一个即可）
  - `every` - AND 验证（全部满足）
  - `transform` - 值转换
  - `mergeRules` - 串行验证

  ## 🎯 预设组合

  - RULE_COMBOS.username, password, email, mobile, confirmPassword, idCard, bankCard, url

  ## 📖 文档

  - 完整的 README 文档，包含使用示例
  - 100% 向后兼容原 @/utils/v_verify

  ## 🏗️ 技术栈

  - TypeScript 5.8.0
  - tsup 8.1.0 (构建工具)
  - Naive UI >= 2.34.0 (peer dependency)

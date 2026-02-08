# @robot-admin/form-validate

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

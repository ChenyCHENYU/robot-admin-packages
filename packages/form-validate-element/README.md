# @robot-admin/form-validate-element

企业级表单验证规则库，专为 **Element Plus** 设计。

与 naive-ui 版（[@robot-admin/form-validate](../form-validate)）**API 完全一致**，底层共享 [@robot-admin/form-validate-core](../form-validate-core) 的全部校验逻辑。

## 安装

```bash
pnpm add @robot-admin/form-validate-element
# peerDependency: element-plus >= 2.0.0
```

## 快速上手

```ts
import { PRESET_RULES, RULE_COMBOS, when, numeric } from "@robot-admin/form-validate-element";

// 1. 直接用于 el-form-item :rules
const rules = {
  name: RULE_COMBOS.username("用户名"),
  phone: RULE_COMBOS.mobile("手机号"),
};

// 2. 数据库数值契约（对标 SQL DECIMAL(p, s)）
const tempRule = numeric(
  { kind: "decimal", totalDigits: 11, fractionDigits: 3, min: 0 },
  "温度",
);

// 3. 非必填格式校验
import { optional, FormatRules } from "@robot-admin/form-validate-element";
const emailRule = optional(FormatRules.email("邮箱")); // 可不填，填了则校验格式
```

## 适用场景

产出的规则为 element-plus `FormItemRule`（基于 async-validator），可直接用于：

| 场景 | 用法 |
|------|------|
| el-form 原生 / BaseForm | `<el-form-item :rules>` |
| 表格内嵌编辑（advance-table） | `column.meta.rules` |
| jh-grid 行内编辑 | `column.rules` |

失焦 / 值改变即触发校验，无需提交才校验。

## 与 naive-ui 版的差异

仅有一点语义差异（由框架本身决定，非库行为）：

| 维度 | naive-ui 版 | element-plus 版 |
|------|------------|----------------|
| 实时触发 | 原生 `input`（逐字符） | `input` 映射为 `change`（值变化触发） |

业务侧写法完全一致：`PRESET_RULES.mobile("手机号")` 在两个库中用法、参数、消息全部相同。

## 完整 API

与 naive-ui 版一一对应，详见 [form-validate README](../form-validate/README.md)。
额外新增：

- `numeric(contract, field)` — 数据库 DECIMAL(p,s) 数值契约校验
- `optional(rule)` — 把任意规则包装为非必填语义（空值放行）
- `toElementRule(spec)` / `toElementRules(specs)` — 手动把 core 的 `RuleSpec` 转为 FormItemRule

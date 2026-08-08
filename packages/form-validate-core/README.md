# @robot-admin/form-validate-core

企业级表单验证规则库**核心层** —— 框架无关的验证逻辑。

本包**不直接面向业务使用**，而是作为以下两个 adapter 包的共享底层：

- [@robot-admin/form-validate](../form-validate) — naive-ui 版
- [@robot-admin/form-validate-element](../form-validate-element) — element-plus 版

## 设计

所有校验逻辑产出框架无关的 `RuleSpec`，由各 adapter 转换为对应 UI 框架的规则对象：

```ts
interface RuleSpec {
  trigger: "blur" | "input" | "change" | ("blur" | "input" | "change")[];
  validate: (value: any) => boolean | string | Promise<boolean | string>;
  message: string;
}
```

- `validate` 返回 `true` 通过；返回 `false` 走 `message`；返回 `string` 直接作为失败消息（供组合规则透传）
- adapter 负责 `trigger` 映射（naive 的 `input` → EP 的 `change`）与 `validator` 风格转换

## 何时直接使用 core？

通常不需要。只有当你需要**自定义 adapter**（接入非 naive/EP 的表单框架）时，才直接依赖 core：

```ts
import { PRESET_RULES, type RuleSpec } from "@robot-admin/form-validate-core";

// 自定义 adapter：把 RuleSpec 转成你的框架规则
function toMyRule(spec: RuleSpec) {
  return {
    trigger: spec.trigger,
    check: (value) => spec.validate(value),
    message: spec.message,
  };
}
```

## 包含的能力

- **正则库** `REGEX_PATTERNS`（手机/邮箱/身份证/车牌/IP 等 40+）
- **原子规则工厂** basic / value / format / china（全部产出 `RuleSpec`）
- **高级组合** when / compareWith / some / every / debouncedAsyncCheck
- **数据库数值契约** `numeric(contract, field)`（DECIMAL(p,s) 精度/范围）
- **非必填包装器** `optional(rule)`
- **预设组合** `RULE_COMBOS`（username / password / email / mobile 等）
- **聚合命名空间** `PRESET_RULES`

## License

MIT

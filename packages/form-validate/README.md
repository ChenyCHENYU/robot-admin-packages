# @robot-admin/form-validate

<p align="center">
  <b>企业级表单验证规则库</b><br>
  单包同时支持 Naive UI 与 Element Plus，一套规则逻辑两套适配输出
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@robot-admin/form-validate"><img src="https://img.shields.io/npm/v/@robot-admin/form-validate.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@robot-admin/form-validate"><img src="https://img.shields.io/npm/dm/@robot-admin/form-validate.svg" alt="npm downloads"></a>
  <a href="https://www.npmjs.com/package/@robot-admin/form-validate"><img src="https://img.shields.io/bundlephobia/minzip/@robot-admin/form-validate" alt="bundle size"></a>
  <a href="https://github.com/ChenyCHENYU/robot-admin-packages/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@robot-admin/form-validate.svg" alt="license"></a>
</p>

---

## 设计理念

所有校验逻辑产出**框架无关的 `RuleSpec`**(一份源真相),再通过适配器输出为各框架规则。**同一套规则定义,既能喂给表单实时校验,也能在提交时批量校验,零逻辑重复。**

```
                  ┌── toNaiveRule  → PRESET_RULES / RULE_COMBOS / when ...   (Naive UI)
RuleSpec(源真相) ──┼── toElementRule → ELEMENT_RULES / ELEMENT_COMBOS / whenElement  (Element Plus)
                  ├── 原样           → SPEC_RULES / whenSpec ...               (框架无关)
                  └── validateValue  → 提交前批量校验                           (任意场景)
```

## ✨ 特性

- 🎯 **开箱即用** — 40+ 预设规则，覆盖企业常见场景
- 🧩 **单包双框架** — 内置 naive / element 双适配，零额外依赖
- 🔢 **数据库契约** — `numeric` 对标 SQL `DECIMAL(p,s)` 精度范围校验
- 📊 **批量校验** — `validateValue/validateRecord/validateRows`，表格提交一行搞定
- 🚀 **高级组合** — 条件验证、跨字段比较、OR/AND 组合、防抖异步
- 🇨🇳 **中国本地化** — 身份证、银行卡、车牌、统一社会信用代码
- 💪 **TypeScript** — 完整类型推导，Tree-shaking 友好
- ✅ **80 测试覆盖** — 行为有保障，不靠肉眼

---

## 📦 安装

```bash
pnpm add @robot-admin/form-validate
# 或
npm i @robot-admin/form-validate
```

> 零 UI 框架依赖。你用 Naive UI 还是 Element Plus 都装同一个包。

---

## 🚀 30 秒上手

### Naive UI 用户（默认导出即 naive 格式）

```ts
import { PRESET_RULES, RULE_COMBOS } from "@robot-admin/form-validate";

const rules = {
  username: RULE_COMBOS.username("用户名"),   // [必填 + 格式]
  phone: RULE_COMBOS.mobile("手机号"),        // [必填 + 格式]
  email: [PRESET_RULES.email("邮箱")],        // 非必填，填了校验格式
};
// 直接用于 <n-form-item :rule>
```

### Element Plus 用户

```ts
import { ELEMENT_RULES, ELEMENT_COMBOS } from "@robot-admin/form-validate";

const rules = {
  username: ELEMENT_COMBOS.username("用户名"),
  phone: ELEMENT_COMBOS.mobile("手机号"),
  email: [ELEMENT_RULES.email("邮箱")],
};
// 直接用于 <el-form-item :rules>
```

> 两边写法完全对称，只是 `PRESET_RULES` ↔ `ELEMENT_RULES`。

---

## 📖 按场景速查

### 场景 1：必填 + 格式（最常用）

```ts
import { RULE_COMBOS } from "@robot-admin/form-validate"; // naive
// 或 ELEMENT_COMBOS（element）

RULE_COMBOS.username("用户名")     // 必填 + 字母数字下划线 3-20 位
RULE_COMBOS.password("密码")       // 必填 + 强密码（大小写+数字）
RULE_COMBOS.email("邮箱")          // 必填 + 邮箱格式
RULE_COMBOS.mobile("手机号")       // 必填 + 手机号格式
RULE_COMBOS.idCard("身份证号")     // 必填 + 身份证格式
RULE_COMBOS.bankCard("银行卡号")   // 必填 + 银行卡格式
RULE_COMBOS.url("链接")            // 必填 + URL 格式
RULE_COMBOS.confirmPassword("确认密码", () => form.password)
```

### 场景 2：非必填，填了才校验格式

```ts
import { optional, toNaiveRule, toElementRule, SPEC_RULES } from "@robot-admin/form-validate";

// optional() 返回 RuleSpec，需经适配器转为框架规则

// naive
toNaiveRule(optional(SPEC_RULES.email("邮箱")))   // 空值放行，有值才校验

// element
toElementRule(optional(SPEC_RULES.email("邮箱")))
```

> `optional` 同样可包装 `numeric`、自定义规则等任意 RuleSpec。

### 场景 3：数据库数值契约（DECIMAL）

```ts
import { numeric, toElementRule } from "@robot-admin/form-validate";

// 对标 DECIMAL(11,3)，温度 ≥ 0
numeric({ kind: "decimal", totalDigits: 11, fractionDigits: 3, min: 0 }, "温度")

// 整数 + 范围
numeric({ kind: "integer", totalDigits: 11, min: 1 }, "处理次数")

// 开区间（必须严格大于 min）
numeric({ kind: "decimal", min: 0, max: 100, minExclusive: true }, "百分比")

// element 版需包一层
toElementRule(numeric({ kind: "integer", min: 1 }, "处理次数"))
```

### 场景 4：跨字段比较（结束日期不早于开始）

```ts
import { compareWith } from "@robot-admin/form-validate";        // naive
import { compareWithElement } from "@robot-admin/form-validate"; // element

compareWith("结束日期", () => form.startDate, "gte", "结束日期不能早于开始日期")
// 操作符：gt | gte | lt | lte | eq | ne
```

### 场景 5：条件验证（类型为公司时才校验公司名称）

```ts
import { when } from "@robot-admin/form-validate";        // naive
import { whenElement } from "@robot-admin/form-validate"; // element

when(
  () => form.userType,
  val => val === "company",
  [PRESET_RULES.required("公司名称")],   // 条件为真
  [],                                     // 条件为假
)
```

### 场景 6：表格提交前批量校验

```ts
import { validateRows, numeric, SPEC_RULES } from "@robot-admin/form-validate";

const ruleMap = {
  steel_code: [SPEC_RULES.required("钢种")],
  work_time:  [numeric({ kind: "integer", min: 1 }, "作业时间")],
};

// 校验整张表，返回第一行错误
const err = await validateRows(detailRows, ruleMap, { startIndex: 1 });
if (err) {
  ElMessage.error(`第 ${err.rowIndex} 行：${err.message}`);
  return;
}
```

### 场景 7：OR 组合（手机号或邮箱任一）

```ts
import { some, PRESET_RULES } from "@robot-admin/form-validate";

some(
  [PRESET_RULES.mobile("联系方式"), PRESET_RULES.email("联系方式")],
  "请填写手机号或邮箱",
)
```

---

## 🧰 API 全景

### 三套预设（共享同一份规则工厂）

| 预设 | 返回类型 | 适用 |
|------|---------|------|
| `PRESET_RULES` | NaiveRule | Naive UI（向后兼容） |
| `ELEMENT_RULES` | ElementRule | Element Plus |
| `SPEC_RULES` | RuleSpec | 框架无关，需手动适配 |

**预设成员（三者一致）：**

| 类别 | 成员 |
|------|------|
| 基础 | `required` `integer` `positiveInteger` `number` `positiveNumber` `boolean` `enumValue` `pattern` `optional` |
| 字符串 | `length` `minLength` `maxLength` `startsWith` `endsWith` `includes` |
| 数字 | `range` `min` `max` `between` |
| 数组 | `array` `arrayMinLength` `arrayMaxLength` `arrayUnique` |
| 日期 | `date` `dateAfter` `dateBefore` `dateRange` |
| 格式 | `mobile` `email` `url` `ip` `ipv6` `mac` `domain` `hexColor` `username` `strongPassword` `confirmPassword` `asyncCheck` |
| 中国 | `idCard` `postalCode` `bankCard` `creditCode` `licensePlate` `qq` `wechat` |
| 数值契约 | `numeric(contract, field)` |

### 高级功能

| 功能 | naive | element | 框架无关 |
|------|-------|---------|---------|
| 条件验证 | `when` | `whenElement` | `whenSpec` |
| 跨字段比较 | `compareWith` | `compareWithElement` | `compareWithSpec` |
| 防抖异步 | `debouncedAsyncCheck` | `debouncedAsyncCheckElement` | `debouncedAsyncCheckSpec` |
| OR 组合 | `some` | `someElement` | `someSpec` |
| AND 组合 | `every` | `everyElement` | `everySpec` |

### 适配器

| 函数 | 作用 |
|------|------|
| `toNaiveRule(spec)` / `toNaiveRules(specs)` | RuleSpec → NaiveRule |
| `toElementRule(spec)` / `toElementRules(specs)` | RuleSpec → ElementRule |

### 规则创建

| 函数 | 返回 | 说明 |
|------|------|------|
| `createSpec(trigger, fn, msg)` | RuleSpec | 创建框架无关规则 |
| `createAsyncSpec(trigger, fn, msg)` | RuleSpec | 异步版本 |
| `createRule(trigger, fn, msg)` | NaiveRule | 向后兼容（= createSpec + toNaiveRule） |

### 批量校验

| 函数 | 入参 | 返回 | 场景 |
|------|------|------|------|
| `validateValue(value, rules)` | 单值 | `string \| null` | 单字段 |
| `validateRecord(record, ruleMap)` | 一条记录 | `{field, message} \| null` | 表单提交 |
| `validateRows(rows, ruleMap, opts?)` | 多行 | `{rowIndex, field, message} \| null` | 表格提交 |

### 工具

| 函数 | 说明 |
|------|------|
| `optional(rule)` | 包装为非必填（空值放行） |
| `transform(fn, rule)` | 校验前转换值（如 trim） |
| `mergeSpecs(specs)` | 串行校验，返回第一条失败 |
| `isBlank(v)` | 空值判断（null/undefined/纯空格） |
| `REGEX_PATTERNS` | 正则常量库（40+） |

---

## 🎓 进阶

### 自定义规则

```ts
import { createSpec, toElementRule } from "@robot-admin/form-validate";

// 同步
const mySpec = createSpec("blur", v => v?.length === 6, "必须6位");

// element 使用
const myRule = toElementRule(mySpec);

// 异步（如查重）
const asyncSpec = createAsyncSpec("blur", async (v) => {
  const res = await checkExists(v);
  return !res.exists;
}, "已存在");
```

### 手动适配任意框架

```ts
import type { RuleSpec } from "@robot-admin/form-validate";

function toMyRule(spec: RuleSpec) {
  return {
    trigger: spec.trigger,
    check: (value) => spec.validate(value),
    message: spec.message,
  };
}
```

### 正则常量库

```ts
import { REGEX_PATTERNS } from "@robot-admin/form-validate";

REGEX_PATTERNS.MOBILE       // 手机号
REGEX_PATTERNS.ID_CARD      // 身份证
REGEX_PATTERNS.BANK_CARD    // 银行卡
REGEX_PATTERNS.LICENSE_PLATE // 车牌
REGEX_PATTERNS.IP / IPV6    // IP 地址
// ... 完整列表见源码 regex.ts
```

---

## 📂 项目结构

```
@robot-admin/form-validate/
├── src/
│   ├── index.ts       # 主入口
│   ├── types.ts       # RuleSpec / NaiveRule / ElementRule
│   ├── adapter.ts     # toNaiveRule / toElementRule
│   ├── utils.ts       # createSpec / optional / transform ...
│   ├── numeric.ts     # 数据库数值契约
│   ├── advanced.ts    # when / compareWith / some / every（三套）
│   ├── validate.ts    # validateValue / validateRecord / validateRows
│   ├── combos.ts      # NAIVE_COMBOS / ELEMENT_COMBOS
│   ├── presets.ts     # PRESET_RULES / ELEMENT_RULES / SPEC_RULES
│   ├── regex.ts       # 正则常量库
│   └── rules/         # basic / value / format / china（产 RuleSpec）
└── test/              # 80 个 vitest 用例
```

---

## 🔄 从旧版迁移

| 旧（v2 / 三包） | 新（v3.2+ 单包） |
|-----------------|------------------|
| `@robot-admin/form-validate-core` | 已废弃，逻辑内联进单包 |
| `@robot-admin/form-validate-element` | 已废弃，改用 `ELEMENT_RULES` |
| `PRESET_RULES.mobile()` | **不变**（向后兼容） |
| `RULE_COMBOS.mobile()` | **不变** |
| `createRule()` | **不变** |
| element 规则 | `toElementRule(spec)` 或 `ELEMENT_RULES.mobile()` |

---

## 📄 License

MIT

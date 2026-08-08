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
- ✅ **84 测试覆盖** — 行为有保障，不靠肉眼

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

### 场景 2：多规则链式校验（数组即链式）

规则数组本身就是**顺序执行**的链 —— 前一条通过才跑下一条，失败立即停止返回错误。
不需要额外的 `.chain()` 语法，数组就是最直观的链。

```ts
import { ELEMENT_RULES } from "@robot-admin/form-validate";

// 密码：先校验非空，通过后再校验长度，再校验强度
password: [
  ELEMENT_RULES.required("密码"),
  ELEMENT_RULES.minLength("密码", 8),
  ELEMENT_RULES.strongPassword("密码"),
]

// 工号：先校验非空，再校验长度
userNo: [
  ELEMENT_RULES.required("工号"),
  ELEMENT_RULES.length("工号", 8),
]
```

> **与手写对比**：Element 原生写法要重复写 `{ required: true, message: "密码不能为空", trigger: "blur" }`，
> 这里一行一个语义，且消息自动带字段名。

### 场景 3：非必填，填了才校验格式

```ts
import { optional, toNaiveRule, toElementRule, SPEC_RULES } from "@robot-admin/form-validate";

// optional() 返回 RuleSpec，需经适配器转为框架规则

// naive
toNaiveRule(optional(SPEC_RULES.email("邮箱")))   // 空值放行，有值才校验

// element
toElementRule(optional(SPEC_RULES.email("邮箱")))
```

> `optional` 同样可包装 `numeric`、自定义规则等任意 RuleSpec。

### 场景 4：数据库数值契约（DECIMAL）

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

### 场景 5：跨字段比较（结束日期不早于开始）

```ts
import { compareWith } from "@robot-admin/form-validate";        // naive
import { compareWithElement } from "@robot-admin/form-validate"; // element

compareWith("结束日期", () => form.startDate, "gte", "结束日期不能早于开始日期")
// 操作符：gt | gte | lt | lte | eq | ne
```

### 场景 6：条件验证（类型为公司时才校验公司名称）

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

### 场景 7：表格提交前批量校验（含嵌套路径）

```ts
import { validateRows, validateValue, numeric, SPEC_RULES } from "@robot-admin/form-validate";

const ruleMap = {
  steel_code: [SPEC_RULES.required("钢种")],
  work_time:  [numeric({ kind: "integer", min: 1 }, "作业时间")],
};

// 表格多行：校验整张表，返回第一行错误
const err = await validateRows(detailRows, ruleMap, { startIndex: 1 });
if (err) {
  ElMessage.error(`第 ${err.rowIndex} 行：${err.message}`);
  return;
}

// 主从结构：字段名支持点路径嵌套
const nestedErr = await validateValue(
  record,
  {
    "address.city":    [SPEC_RULES.required("城市")],
    "items[0].qty":    [numeric({ kind: "integer", min: 1 }, "数量")],
    "items[1].amount": [numeric({ kind: "decimal", min: 0 }, "金额")],
  },
);
```

> 点路径支持 `'a.b.c'`（对象嵌套）、`'items[0].qty'`（数组索引）、深层组合。
> 平铺字段（不含 `.` `[` `]`）行为与 `record[key]` 完全一致，零副作用。

### 场景 8：OR 组合（手机号或邮箱任一）

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

### 多规则组合：AND / OR / 条件

当数组链式不够用时（需要把多条规则**合并成一条**塞进单个 form-item，或做 OR 逻辑），用组合函数：

```ts
import { every, some, when, PRESET_RULES } from "@robot-admin/form-validate";

// AND：全部满足（合并成单条规则，失败返回第一个错误）
every([
  PRESET_RULES.required("密码"),
  PRESET_RULES.minLength("密码", 8),
  PRESET_RULES.strongPassword("密码"),
])

// OR：满足其一即可
some(
  [PRESET_RULES.mobile("联系方式"), PRESET_RULES.email("联系方式")],
  "请填写手机号或邮箱",
)

// 条件：只有企业用户才校验统一信用代码
when(
  () => form.userType,
  val => val === "enterprise",
  [PRESET_RULES.required("统一信用代码"), PRESET_RULES.creditCode("统一信用代码")],
  [],
)
```

> **数组 vs every 的区别**：数组是 form-item 级链式（多条独立规则）；`every` 是把多条合成一条规则。
> 一般场景用数组即可，需要"合成单条"时（如塞进 `some`/`when` 内部）用 `every`。

### 动态规则（响应式）

规则工厂返回的是普通对象，天然支持在 `computed` / `watch` 中按业务状态动态生成：

```ts
import { computed } from "vue";
import { ELEMENT_RULES, numeric, toElementRule } from "@robot-admin/form-validate";

// 根据表单类型动态返回不同规则
const workTimeRules = computed(() => {
  if (form.value.type === "overtime") {
    return [toElementRule(numeric({ kind: "integer", min: 1, max: 10080 }, "加班时长"))];
  }
  return [toElementRule(numeric({ kind: "integer", min: 0, max: 480 }, "工时"))];
});
// :rules="workTimeRules"
```

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
└── test/              # 84 个 vitest 用例
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

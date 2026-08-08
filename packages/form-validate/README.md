# @robot-admin/form-validate

<p align="center">
  <b>企业级表单验证规则库</b><br>
  专为 Naive UI 设计，提供丰富的验证规则和高级功能
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@robot-admin/form-validate"><img src="https://img.shields.io/npm/v/@robot-admin/form-validate.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@robot-admin/form-validate"><img src="https://img.shields.io/npm/dm/@robot-admin/form-validate.svg" alt="npm downloads"></a>
  <a href="https://github.com/ChenyCHENYU/robot-admin-packages/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@robot-admin/form-validate.svg" alt="license"></a>
</p>

---

## ✨ 特性

- 🎯 **开箱即用** - 48+ 预设验证规则，覆盖常见场景
- 🔗 **链式组合** - 支持规则链式调用和自由组合
- 🚀 **高级功能** - 条件验证、跨字段比较、防抖异步验证
- 🇨🇳 **中国本地化** - 身份证、银行卡、车牌号等专属验证
- 📦 **Tree-shaking** - 按需引入，优化打包体积
- 💪 **TypeScript** - 完整的类型定义和类型推导
- 🎨 **Naive UI 优先** - 完美适配 Naive UI 表单组件
- 🧩 **跨框架共享** - 基于 [@robot-admin/form-validate-core](../form-validate-core)，与 Element Plus 版（[@robot-admin/form-validate-element](../form-validate-element)）共享同一套校验逻辑，API 一致
- 🔢 **数据库契约** - 内置 `numeric` 数值精度规则（对标 SQL DECIMAL(p,s)）、`optional` 非必填包装器

---

## � 项目结构

```
@robot-admin/form-validate/
├── src/
│   ├── index.ts           # 主入口，导出所有模块
│   ├── adapter.ts         # naive-ui 适配层（RuleSpec → FormItemRule）
│   ├── regex.ts           # 正则表达式库（re-export core）
│   ├── utils.ts           # 核心工具函数（委托 core + adapter）
│   ├── advanced.ts        # 高级功能（when, compareWith, some, every 等）
│   ├── combos.ts          # 预设规则组合（username, password, email 等）
│   └── rules/
│       ├── basic.ts       # 基础验证规则（薄包装，逻辑来自 core）
│       ├── value.ts       # 值验证规则（字符串、数字、数组、日期）
│       ├── format.ts      # 格式验证规则（email, mobile, url, ip 等）
│       └── china.ts       # 中国本地化规则（idCard, bankCard, licensePlate）
└── dist/
    ├── index.js           # CommonJS 格式
    ├── index.mjs          # ES Module 格式
    └── index.d.ts         # TypeScript 类型声明
```

> **架构说明**：自 v3.0.0 起，框架无关的校验逻辑抽离到 `@robot-admin/form-validate-core`，本包为 naive-ui 适配层，行为与历史版本完全一致。

**设计原则：**

- 📁 **模块化** - 按功能划分为 9 个文件，清晰易维护
- 🎯 **语义化** - 文件名直观表达功能，一看即懂
- 🔧 **可扩展** - 独立模块便于后续功能增强
- 📦 **可优化** - 支持 Tree-shaking，按需打包

---

## �📦 安装

```bash
# npm
npm install @robot-admin/form-validate

# yarn
yarn add @robot-admin/form-validate

# pnpm
pnpm add @robot-admin/form-validate

# bun
bun add @robot-admin/form-validate
```

**注意：** 需要安装 `naive-ui` >= 2.34.0 作为 peer dependency。

---

## 🚀 快速开始

### 基础使用

```vue
<script setup lang="ts">
import { ref } from "vue";
import { PRESET_RULES } from "@robot-admin/form-validate";

const formData = ref({
  username: "",
  email: "",
  age: null,
});

const rules = {
  username: [
    PRESET_RULES.required("用户名"),
    PRESET_RULES.length("用户名", 3, 20),
  ],
  email: [PRESET_RULES.required("邮箱"), PRESET_RULES.email("邮箱")],
  age: [PRESET_RULES.required("年龄"), PRESET_RULES.range("年龄", 1, 120)],
};
</script>

<template>
  <n-form :model="formData" :rules="rules">
    <n-form-item path="username" label="用户名">
      <n-input v-model:value="formData.username" />
    </n-form-item>
    <n-form-item path="email" label="邮箱">
      <n-input v-model:value="formData.email" />
    </n-form-item>
    <n-form-item path="age" label="年龄">
      <n-input-number v-model:value="formData.age" />
    </n-form-item>
  </n-form>
</template>
```

### 使用预设组合

最常用的规则已经预先组合好，可以直接使用：

```typescript
import { RULE_COMBOS } from "@robot-admin/form-validate";

const rules = {
  username: RULE_COMBOS.username("用户名"), // 必填 + 格式验证
  password: RULE_COMBOS.password("密码"), // 必填 + 强密码
  email: RULE_COMBOS.email("邮箱"), // 必填 + 邮箱格式
  mobile: RULE_COMBOS.mobile("手机号"), // 必填 + 手机号格式
  idCard: RULE_COMBOS.idCard("身份证号"), // 必填 + 身份证格式
};
```

---

## 📖 核心 API

### PRESET_RULES - 预设验证规则

#### 基础验证

| 规则                       | 说明       | 参数                       |
| -------------------------- | ---------- | -------------------------- |
| `required(field)`          | 必填验证   | 字段名                     |
| `integer(field)`           | 整数验证   | 字段名                     |
| `positiveInteger(field)`   | 正整数验证 | 字段名                     |
| `number(field)`            | 数字验证   | 字段名                     |
| `positiveNumber(field)`    | 正数验证   | 字段名                     |
| `boolean(field)`           | 布尔值验证 | 字段名                     |
| `array(field, min?, max?)` | 数组验证   | 字段名, 最小长度, 最大长度 |
| `date(field)`              | 日期验证   | 字段名                     |
| `enumValue(field, values)` | 枚举验证   | 字段名, 允许值数组         |
| `pattern(field, regex)`    | 自定义正则 | 字段名, 正则表达式         |

#### 字符串验证

| 规则                         | 说明      | 参数                             |
| ---------------------------- | --------- | -------------------------------- |
| `length(field, min, max?)`   | 长度验证  | 字段名, 最小长度, 最大长度(可选) |
| `minLength(field, min)`      | 最小长度  | 字段名, 最小长度                 |
| `maxLength(field, max)`      | 最大长度  | 字段名, 最大长度                 |
| `startsWith(field, prefix)`  | 以...开头 | 字段名, 前缀                     |
| `endsWith(field, suffix)`    | 以...结尾 | 字段名, 后缀                     |
| `includes(field, substring)` | 包含...   | 字段名, 子字符串                 |

#### 数字验证

| 规则                       | 说明                 | 参数                   |
| -------------------------- | -------------------- | ---------------------- |
| `range(field, min, max)`   | 范围验证（含边界）   | 字段名, 最小值, 最大值 |
| `min(field, minValue)`     | 最小值               | 字段名, 最小值         |
| `max(field, maxValue)`     | 最大值               | 字段名, 最大值         |
| `between(field, min, max)` | 区间验证（不含边界） | 字段名, 最小值, 最大值 |

#### 数组验证

| 规则                         | 说明         | 参数             |
| ---------------------------- | ------------ | ---------------- |
| `arrayMinLength(field, min)` | 数组最小长度 | 字段名, 最小长度 |
| `arrayMaxLength(field, max)` | 数组最大长度 | 字段名, 最大长度 |
| `arrayUnique(field)`         | 数组元素唯一 | 字段名           |

#### 日期验证

| 规则                           | 说明     | 参数                       |
| ------------------------------ | -------- | -------------------------- |
| `dateAfter(field, date)`       | 日期晚于 | 字段名, 比较日期           |
| `dateBefore(field, date)`      | 日期早于 | 字段名, 比较日期           |
| `dateRange(field, start, end)` | 日期范围 | 字段名, 开始日期, 结束日期 |

#### 格式验证

| 规则                               | 说明                              |
| ---------------------------------- | --------------------------------- |
| `mobile(field)`                    | 手机号                            |
| `email(field)`                     | 邮箱                              |
| `url(field)`                       | URL                               |
| `ip(field)`                        | IPv4 地址                         |
| `ipv6(field)`                      | IPv6 地址                         |
| `mac(field)`                       | MAC 地址                          |
| `domain(field)`                    | 域名                              |
| `hexColor(field)`                  | 十六进制颜色                      |
| `username(field)`                  | 用户名（字母数字下划线，3-20位）  |
| `strongPassword(field)`            | 强密码（大小写字母+数字，6-20位） |
| `confirmPassword(field, getValue)` | 确认密码                          |
| `asyncCheck(field, fn, msg?)`      | 异步验证                          |

#### 中国本地化验证

| 规则                  | 说明             |
| --------------------- | ---------------- |
| `idCard(field)`       | 身份证号         |
| `postalCode(field)`   | 邮政编码         |
| `bankCard(field)`     | 银行卡号         |
| `creditCode(field)`   | 统一社会信用代码 |
| `licensePlate(field)` | 车牌号           |
| `qq(field)`           | QQ号             |
| `wechat(field)`       | 微信号           |

### RULE_COMBOS - 预设规则组合

| 组合                               | 说明     | 包含规则          |
| ---------------------------------- | -------- | ----------------- |
| `username(field)`                  | 用户名   | 必填 + 格式验证   |
| `password(field)`                  | 密码     | 必填 + 强密码     |
| `email(field)`                     | 邮箱     | 必填 + 邮箱格式   |
| `mobile(field)`                    | 手机号   | 必填 + 手机号格式 |
| `confirmPassword(field, getValue)` | 确认密码 | 必填 + 一致性验证 |
| `idCard(field)`                    | 身份证   | 必填 + 身份证格式 |
| `bankCard(field)`                  | 银行卡   | 必填 + 银行卡格式 |
| `url(field)`                       | URL      | 必填 + URL格式    |

---

## 🔗 链式使用

### 多规则组合

```typescript
const rules = {
  // 方式1：数组形式
  username: [
    PRESET_RULES.required("用户名"),
    PRESET_RULES.length("用户名", 3, 20),
    PRESET_RULES.pattern("用户名", /^[a-zA-Z0-9_]+$/, "只能包含字母数字下划线"),
  ],

  // 方式2：使用预设组合
  email: RULE_COMBOS.email("邮箱"),

  // 方式3：在预设组合基础上追加
  password: [
    ...RULE_COMBOS.password("密码"),
    PRESET_RULES.minLength("密码", 8), // 额外要求最少8位
  ],
};
```

### mergeRules - 串行验证

默认情况下，多个规则会并行验证并显示所有错误。使用 `mergeRules` 可以串行验证，只显示第一个错误：

```typescript
import { mergeRules, PRESET_RULES } from "@robot-admin/form-validate";

const rules = {
  username: mergeRules([
    PRESET_RULES.required("用户名"),
    PRESET_RULES.length("用户名", 3, 20),
    PRESET_RULES.username("用户名"),
    // 只显示第一个未通过的错误
  ]),
};
```

---

## 🎓 高级用法

### 1. 条件验证 - when

根据其他字段的值决定是否验证：

```typescript
import { when, PRESET_RULES } from "@robot-admin/form-validate";

const formData = ref({
  userType: "personal", // 'personal' | 'company'
  companyName: "",
  creditCode: "",
});

const rules = {
  // 只有当 userType 是 'company' 时才验证公司名称
  companyName: [
    when(
      () => formData.value.userType,
      (val) => val === "company",
      [
        PRESET_RULES.required("公司名称"),
        PRESET_RULES.length("公司名称", 2, 50),
      ],
      [], // userType 不是 'company' 时不验证
    ),
  ],

  creditCode: [
    when(
      () => formData.value.userType,
      (val) => val === "company",
      [PRESET_RULES.required("信用代码"), PRESET_RULES.creditCode("信用代码")],
      [],
    ),
  ],
};
```

### 2. 跨字段比较 - compareWith

比较两个字段的值：

```typescript
import { compareWith, PRESET_RULES } from "@robot-admin/form-validate";

const formData = ref({
  startDate: null,
  endDate: null,
  minPrice: 0,
  maxPrice: 0,
});

const rules = {
  endDate: [
    PRESET_RULES.required("结束日期"),
    compareWith(
      "结束日期",
      () => formData.value.startDate,
      "gte", // gte: >=, gt: >, lte: <=, lt: <, eq: ==, ne: !=
      "结束日期不能早于开始日期",
    ),
  ],

  maxPrice: [
    PRESET_RULES.required("最高价"),
    compareWith(
      "最高价",
      () => formData.value.minPrice,
      "gt",
      "最高价必须大于最低价",
    ),
  ],
};
```

### 3. 防抖异步验证 - debouncedAsyncCheck

实时检查但避免频繁请求：

```typescript
import { debouncedAsyncCheck, PRESET_RULES } from "@robot-admin/form-validate";
import { checkUsernameAvailable } from "@/api/user";

const rules = {
  username: [
    PRESET_RULES.required("用户名"),
    PRESET_RULES.username("用户名"),
    // 输入停止 500ms 后才发起请求
    debouncedAsyncCheck(
      "用户名",
      async (username) => {
        const res = await checkUsernameAvailable(username);
        return res.available; // 返回 true 表示通过
      },
      500, // 防抖延迟
      "用户名已被占用",
    ),
  ],
};
```

### 4. OR 验证 - some

满足其中一个规则即可：

```typescript
import { some, PRESET_RULES } from "@robot-admin/form-validate";

const rules = {
  // 手机号或邮箱至少填写一个
  contact: [
    PRESET_RULES.required("联系方式"),
    some(
      [PRESET_RULES.mobile("联系方式"), PRESET_RULES.email("联系方式")],
      "请填写有效的手机号或邮箱",
    ),
  ],
};
```

### 5. AND 验证 - every

必须全部满足（等效于规则数组）：

```typescript
import { every, PRESET_RULES } from "@robot-admin/form-validate";

const rules = {
  password: [
    every([
      PRESET_RULES.required("密码"),
      PRESET_RULES.minLength("密码", 8),
      PRESET_RULES.strongPassword("密码"),
      // 全部验证通过才算成功
    ]),
  ],
};
```

### 6. 值转换 - transform

验证前转换值（如 trim）：

```typescript
import { transform, PRESET_RULES } from "@robot-admin/form-validate";

const rules = {
  username: [
    // 验证前自动 trim
    transform((v) => v?.trim(), PRESET_RULES.required("用户名")),
    PRESET_RULES.username("用户名"),
  ],
};
```

### 7. 自定义规则

#### 同步自定义规则

```typescript
import { customRule } from "@robot-admin/form-validate";

const rules = {
  age: [
    customRule(
      (value) => {
        return value >= 18 && value <= 60;
      },
      "年龄必须在18-60岁之间",
      "blur",
    ),
  ],
};
```

#### 异步自定义规则

```typescript
import { customAsyncRule } from "@robot-admin/form-validate";

const rules = {
  email: [
    customAsyncRule(
      async (email) => {
        const res = await checkEmailNotInBlacklist(email);
        return !res.inBlacklist;
      },
      "该邮箱已被拉黑",
      "blur",
    ),
  ],
};
```

### 🔢 数据库数值契约校验（numeric）

`numeric` 标杆 SQL `DECIMAL(p, s)` 字段契约，一次性校验整数/小数格式、有限性、总位数、小数位数、取值范围。语义为非必填（空值放行），需必填时与 `required` 组合。

```typescript
import { numeric } from "@robot-admin/form-validate";

// 对标 DECIMAL(11,3)，温度必须 ≥ 0
const tempRules = {
  temperature: [
    numeric({ kind: "decimal", totalDigits: 11, fractionDigits: 3, min: 0 }, "温度"),
  ],
};

// 整数 + 范围
const timesRules = {
  processTimes: [
    numeric({ kind: "integer", totalDigits: 11, min: 1 }, "处理次数"),
  ],
};

// 开区间（必须严格大于 min）
const openRules = {
  value: [
    numeric({ kind: "decimal", min: 0, max: 100, minExclusive: true }, "值"),
  ],
};
```

### 🧩 非必填校验（optional）

把任意格式规则包装为「可不填」语义：值为空时放行，有值时才校验格式。比手写 `!v || regex.test(v)` 更直观。

```typescript
import { optional, FormatRules } from "@robot-admin/form-validate";

// 邮箱可不填，填了则校验格式
const rules = {
  email: [optional(FormatRules.email("邮箱"))],
};

// 手机号可不填
const rules2 = {
  phone: [optional(FormatRules.mobile("手机号"))],
};
```

---

## 🌐 正则表达式库

可以直接使用内置的正则表达式：

```typescript
import { REGEX_PATTERNS } from "@robot-admin/form-validate";

// 基础通用
REGEX_PATTERNS.MOBILE; // 手机号
REGEX_PATTERNS.EMAIL; // 邮箱
REGEX_PATTERNS.USERNAME; // 用户名
REGEX_PATTERNS.PASSWORD; // 强密码
REGEX_PATTERNS.URL; // HTTP/HTTPS

// 网络相关
REGEX_PATTERNS.IP; // IPv4
REGEX_PATTERNS.IPV6; // IPv6
REGEX_PATTERNS.MAC; // MAC地址
REGEX_PATTERNS.DOMAIN; // 域名

// 中国本地化
REGEX_PATTERNS.ID_CARD; // 身份证
REGEX_PATTERNS.POSTAL_CODE; // 邮政编码
REGEX_PATTERNS.BANK_CARD; // 银行卡号
REGEX_PATTERNS.UNIFIED_CREDIT_CODE; // 统一社会信用代码
REGEX_PATTERNS.LICENSE_PLATE; // 车牌号
REGEX_PATTERNS.QQ; // QQ号
REGEX_PATTERNS.WECHAT; // 微信号

// 格式相关
REGEX_PATTERNS.HEX_COLOR; // 十六进制颜色
REGEX_PATTERNS.DATE_ISO; // ISO日期
REGEX_PATTERNS.DATETIME_ISO; // ISO日期时间

// 数字相关
REGEX_PATTERNS.INTEGER; // 整数
REGEX_PATTERNS.POSITIVE_INTEGER; // 正整数
REGEX_PATTERNS.NEGATIVE_INTEGER; // 负整数
REGEX_PATTERNS.DECIMAL; // 小数
```

---

## 📂 模块化导入

支持按需引入，优化打包体积：

```typescript
// 方式1：导入整合的 PRESET_RULES（推荐，最方便）
import { PRESET_RULES } from "@robot-admin/form-validate";

const rules = {
  username: [
    PRESET_RULES.required("用户名"),
    PRESET_RULES.length("用户名", 3, 20),
  ],
  email: [PRESET_RULES.required("邮箱"), PRESET_RULES.email("邮箱")],
};

// 方式2：按模块导入（更精细的控制）
import {
  BasicRules, // 基础验证
  ValueRules, // 值验证（字符串、数字、数组、日期）
  FormatRules, // 格式验证
  ChinaRules, // 中国本地化
} from "@robot-admin/form-validate";

const rules = {
  username: [BasicRules.required("用户名"), ValueRules.length("用户名", 3, 20)],
  email: [BasicRules.required("邮箱"), FormatRules.email("邮箱")],
  age: [BasicRules.required("年龄"), ValueRules.range("年龄", 18, 60)],
};
```

**可用的模块命名空间：**

| 模块          | 说明                               | 包含规则                               |
| ------------- | ---------------------------------- | -------------------------------------- |
| `BasicRules`  | 基础验证                           | required, integer, boolean, pattern 等 |
| `ValueRules`  | 值验证（字符串、数字、数组、日期） | length, range, array, date 等          |
| `FormatRules` | 格式验证                           | email, mobile, url, ip, username 等    |
| `ChinaRules`  | 中国本地化                         | idCard, bankCard, licensePlate, qq 等  |

**为什么合并为 ValueRules？**

- ✅ 字符串、数字、数组、日期都是"值"的不同类型，语义统一
- ✅ 减少模块数量，降低心智负担（从 7 个模块 → 4 个核心模块）
- ✅ 保持代码结构清晰，避免过度拆分

---

## 🛠️ 完整示例

### 复杂表单验证

```vue
<script setup lang="ts">
import { ref } from "vue";
import {
  PRESET_RULES,
  RULE_COMBOS,
  when,
  compareWith,
  debouncedAsyncCheck,
  some,
} from "@robot-admin/form-validate";
import { checkUsernameAvailable } from "@/api/user";

const formData = ref({
  // 基础信息
  username: "",
  password: "",
  confirmPassword: "",

  // 个人信息
  realName: "",
  age: null,
  gender: "",

  // 联系方式
  mobile: "",
  email: "",

  // 企业信息
  userType: "personal",
  companyName: "",
  creditCode: "",

  // 日期范围
  startDate: null,
  endDate: null,
});

const rules = {
  // 用户名：必填 + 格式 + 异步检查
  username: [
    ...RULE_COMBOS.username("用户名"),
    debouncedAsyncCheck(
      "用户名",
      checkUsernameAvailable,
      500,
      "用户名已被占用",
    ),
  ],

  // 密码：预设强密码组合
  password: RULE_COMBOS.password("密码"),

  // 确认密码：预设组合
  confirmPassword: RULE_COMBOS.confirmPassword(
    "确认密码",
    () => formData.value.password,
  ),

  // 年龄：必填 + 范围
  age: [PRESET_RULES.required("年龄"), PRESET_RULES.range("年龄", 1, 120)],

  // 联系方式：手机或邮箱至少填一个
  mobile: [
    some(
      [PRESET_RULES.mobile("手机号"), PRESET_RULES.email("邮箱")],
      "请至少填写手机号或邮箱",
    ),
  ],

  // 企业信息：条件验证
  companyName: [
    when(
      () => formData.value.userType,
      (val) => val === "company",
      [
        PRESET_RULES.required("公司名称"),
        PRESET_RULES.length("公司名称", 2, 50),
      ],
      [],
    ),
  ],

  creditCode: [
    when(
      () => formData.value.userType,
      (val) => val === "company",
      [PRESET_RULES.required("信用代码"), PRESET_RULES.creditCode("信用代码")],
      [],
    ),
  ],

  // 结束日期：必须晚于开始日期
  endDate: [
    PRESET_RULES.required("结束日期"),
    compareWith(
      "结束日期",
      () => formData.value.startDate,
      "gte",
      "结束日期不能早于开始日期",
    ),
  ],
};
</script>

<template>
  <n-form :model="formData" :rules="rules">
    <!-- 表单项... -->
  </n-form>
</template>
```

---

## 🤝 配套使用

本包是 `robot-admin-packages` monorepo 的一部分，可与以下包配合使用：

- **[@robot-admin/request-core](https://www.npmjs.com/package/@robot-admin/request-core)** - Axios 请求封装 + useTableCrud 组合式函数

---

## 📝 向后兼容性

如果你之前使用的是项目内的 `@/utils/v_verify`，迁移非常简单：

```typescript
// 旧代码
import { PRESET_RULES, RULE_COMBOS, _mergeRules } from "@/utils/v_verify";

// 新代码（只需修改导入路径）
import {
  PRESET_RULES,
  RULE_COMBOS,
  mergeRules,
} from "@robot-admin/form-validate";

// _mergeRules 仍然可用（标记为 deprecated）
import { _mergeRules } from "@robot-admin/form-validate";
```

**100% API 兼容**，无需修改任何业务代码。

---

## 📄 License

MIT © [ChenYu](https://github.com/ChenyCHENYU)

---

## 🔗 相关链接

- [GitHub Repository](https://github.com/ChenyCHENYU/robot-admin-packages)
- [Issue Tracker](https://github.com/ChenyCHENYU/robot-admin-packages/issues)
- [Naive UI Documentation](https://www.naiveui.com/)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/ChenyCHENYU">ChenYu</a>
</p>

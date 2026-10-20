/**
 * 类型定义
 *
 * 本包不依赖任何 UI 框架。NaiveRule / ElementRule 是与各框架规则对象
 * 结构兼容的自定义类型，运行时就是普通对象，可被对应框架直接消费。
 */

/**
 * 触发方式。
 * - naive-ui 原生支持 blur / input / change
 * - element-plus 只支持 blur / change（input 会被 toElementRule 映射为 change）
 */
export type Trigger = "blur" | "input" | "change";

/**
 * 验证结果。
 * - true 表示通过
 * - false 表示失败，使用 RuleSpec.message
 * - string 表示失败，并直接使用该字符串作为错误消息（供组合规则透传）
 */
export type ValidateResult = boolean | string;

/**
 * 框架无关的验证规则描述。是所有规则的「源真相」，
 * 由 toNaiveRule / toElementRule 转换为各框架的规则对象。
 */
export interface RuleSpec {
  /** 触发方式 */
  trigger: Trigger | Trigger[];
  /** 是否为必填规则；适配 UI 框架时用于展示必填状态 */
  required?: boolean;
  /**
   * 验证函数。返回 true 通过；返回 false 走 message；返回 string 直接作为失败消息。
   */
  validate: (value: any) => ValidateResult | Promise<ValidateResult>;
  /** 失败消息（validate 返回 false 时使用） */
  message: string;
}

/**
 * Naive UI 适配器的输出，可直接赋给官方 FormItemRule。
 * 适配器不读取框架传入的 rule；使用 unknown 避免递归规则类型导致参数逆变。
 * 同步成功返回 undefined，异步校验通过 Promise<void> 结算。
 */
export interface NaiveRule {
  trigger?: Trigger | Trigger[];
  validator?: (rule: unknown, value: any) => undefined | Promise<void>;
  required?: boolean;
  message?: string;
  [key: string]: any;
}

/**
 * Naive 组合器接受的 error 级别原生自定义规则边界，warning 规则不支持。
 * 输入签名由 UI 框架定义，组合器仅使用 rule / value 两个参数。
 * 同步通过返回 true 或空 Error[]；false / 非空 Error[] / Error / 抛错表示失败。
 * 异步校验通过 Promise<void> 的完成 / 拒绝结算。
 * 不支持 callback（包括 default/rest 参数）、同步 undefined、声明式约束和
 * source / options 上下文；本包生成的 Promise<void> validator 可直接组合。
 */
export interface NativeNaiveRule {
  trigger?: string | string[];
  required?: boolean;
  message?: string | (() => string);
  validator?: (
    ...args: any[]
  ) => boolean | Error | Error[] | Promise<void> | undefined;
  asyncValidator?: (...args: any[]) => Promise<void> | undefined;
  [key: string]: any;
}

/**
 * element-plus 兼容规则类型（与 element-plus FormItemRule / async-validator RuleItem 结构兼容）。
 * validator 为 callback 风格。
 */
export interface ElementRule {
  trigger?: "blur" | "change" | Array<"blur" | "change">;
  validator?: (
    rule: ElementRule,
    value: any,
    callback: (error?: Error | string) => void,
    source?: any,
    options?: any,
  ) => void;
  asyncValidator?: (rule: ElementRule, value: any) => Promise<void>;
  required?: boolean;
  message?: string;
  [key: string]: any;
}

/**
 * @deprecated 历史别名，等同 NaiveRule。保留以向后兼容。
 */
export type FieldRule = NaiveRule;

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
  /**
   * 验证函数。返回 true 通过；返回 false 走 message；返回 string 直接作为失败消息。
   */
  validate: (value: any) => ValidateResult | Promise<ValidateResult>;
  /** 失败消息（validate 返回 false 时使用） */
  message: string;
}

/**
 * naive-ui 兼容规则类型（与 naive-ui FormItemRule 结构兼容）。
 * validator 通过 throw 报错。
 */
export interface NaiveRule {
  trigger?: Trigger | Trigger[];
  validator?: (rule: NaiveRule, value: any) => void | Promise<void>;
  required?: boolean;
  message?: string;
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

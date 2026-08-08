/**
 * 框架无关的类型定义
 * 这是整个验证库的核心抽象：所有验证逻辑都产出 RuleSpec，
 * 由各 UI 框架（naive-ui / element-plus）的 adapter 转换成对应的规则对象。
 */

/**
 * 触发方式。
 * - naive-ui 原生支持 blur / input / change
 * - element-plus 只支持 blur / change（input 会被 adapter 映射为 change）
 */
export type Trigger = "blur" | "input" | "change";

/**
 * 验证结果。
 * - true 表示通过
 * - string 表示失败，并直接使用该字符串作为错误消息（供组合规则透传子规则消息）
 * - false 表示失败，使用 RuleSpec.message 作为消息
 */
export type ValidateResult = boolean | string;

/**
 * 框架无关的验证规则描述。
 * adapter 负责将其转换为 naive-ui 的 FormItemRule 或 element-plus 的 FormItemRule。
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

/**
 * 高级验证功能（element-plus 版）
 * 在 FormItemRule 层完成组合（callback 风格 validator）。
 * trigger 统一用 ["blur", "change"]（EP 无 input 触发）。
 */

import { createRule, debounce } from "./utils";
import type { FormItemRule } from "element-plus";

/**
 * 把一条 FormItemRule 的 validator 执行封装为 Promise
 */
const runRule = (rule: FormItemRule, value: any): Promise<void> =>
  new Promise((resolve, reject) => {
    let settled = false;
    rule.validator?.(
      rule as any,
      value,
      (err?: string | Error) => {
        if (settled) return;
        settled = true;
        err ? reject(err) : resolve();
      },
      {},
      {},
    );
  });

/**
 * 条件验证：根据其他字段值决定是否验证
 *
 * @example
 * when(
 *   () => formData.userType,
 *   val => val === 'company',
 *   [PRESET_RULES.required('公司名称')],
 *   []
 * )
 */
export const when = (
  getDependencyValue: () => any,
  condition: (value: any) => boolean,
  thenRules: FormItemRule[],
  elseRules: FormItemRule[] = [],
): FormItemRule => {
  return {
    trigger: ["blur", "change"],
    asyncValidator: async (_rule, value) => {
      const depValue = getDependencyValue();
      const rules = condition(depValue) ? thenRules : elseRules;
      for (const rule of rules) {
        // eslint-disable-next-line no-await-in-loop
        await runRule(rule, value);
      }
    },
  };
};

/**
 * 跨字段比较验证
 *
 * @example
 * compareWith('结束日期', () => formData.startDate, 'gte', '结束日期不能早于开始日期')
 */
export const compareWith = (
  field: string,
  getCompareValue: () => any,
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "ne",
  message?: string,
): FormItemRule => {
  const operators = {
    gt: (a: number, b: number) => a > b,
    gte: (a: number, b: number) => a >= b,
    lt: (a: number, b: number) => a < b,
    lte: (a: number, b: number) => a <= b,
    eq: (a: any, b: any) => a === b,
    ne: (a: any, b: any) => a !== b,
  };

  const operatorLabels = {
    gt: "大于",
    gte: "不小于",
    lt: "小于",
    lte: "不大于",
    eq: "等于",
    ne: "不等于",
  };

  return createRule(
    "blur",
    (v) => !v || operators[operator](v, getCompareValue()),
    message || `${field}必须${operatorLabels[operator]}比较值`,
  );
};

/**
 * 防抖异步验证（避免频繁请求）
 *
 * @example
 * debouncedAsyncCheck(
 *   '用户名',
 *   async (username) => {
 *     const res = await checkUsernameAvailable(username)
 *     return res.available
 *   },
 *   500,
 *   '用户名已被占用'
 * )
 */
export const debouncedAsyncCheck = (
  field: string,
  asyncFn: (v: any) => Promise<boolean>,
  delay: number = 500,
  message?: string,
): FormItemRule => {
  const debouncedFn = debounce(asyncFn, delay);

  return {
    trigger: "change",
    asyncValidator: async (_rule, value) => {
      if (!value) return;
      const isValid = await debouncedFn(value);
      if (!isValid) throw new Error(message || `${field}验证失败`);
    },
  };
};

/**
 * 规则 OR 组合：满足其中一个即可
 *
 * @example
 * some(
 *   [PRESET_RULES.mobile('联系方式'), PRESET_RULES.email('联系方式')],
 *   '请填写手机号或邮箱'
 * )
 */
export const some = (
  rules: FormItemRule[],
  message: string = "至少满足一个条件",
): FormItemRule => {
  return {
    trigger: ["blur", "change"],
    asyncValidator: async (_rule, value) => {
      for (const rule of rules) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await runRule(rule, value);
          return; // 有一条通过即成功
        } catch {
          // 继续尝试下一条
        }
      }
      throw new Error(message);
    },
  };
};

/**
 * 规则 AND 组合：必须全部满足（串行验证，显示第一个错误）
 *
 * @example
 * every([
 *   PRESET_RULES.required('密码'),
 *   PRESET_RULES.minLength('密码', 8),
 *   PRESET_RULES.strongPassword('密码')
 * ])
 */
export const every = (rules: FormItemRule[]): FormItemRule => {
  return {
    trigger: ["blur", "change"],
    asyncValidator: async (_rule, value) => {
      for (const rule of rules) {
        // eslint-disable-next-line no-await-in-loop
        await runRule(rule, value);
      }
    },
  };
};

/**
 * 批量校验工具
 *
 * 在不依赖 UI 框架的情况下，对「纯数据」执行校验。
 * 与实时表单校验共享同一份 RuleSpec，实现「实时校验」与「提交前批量校验」
 * 用同一套规则定义，消除业务侧手写遍历逻辑（如 validateRecord / validateRows）。
 *
 * 全部基于框架无关的 RuleSpec，naive / element / 其他场景通用。
 */

import type { RuleSpec } from "./types";

/**
 * 校验单个值：依次执行规则，返回第一条失败消息；全部通过返回 null。
 *
 * @param value 待校验值
 * @param rules 规则数组（RuleSpec）
 *
 * @example
 * const err = await validateValue('abc', [SPEC_RULES.mobile('手机号')]);
 * // => '手机号格式错误'
 *
 * @example 空规则或全部通过
 * const err = await validateValue('x', []);
 * // => null
 */
export async function validateValue(
  value: any,
  rules: RuleSpec[],
): Promise<string | null> {
  for (const rule of rules) {
    // eslint-disable-next-line no-await-in-loop
    const result = await rule.validate(value);
    if (result !== true) {
      return typeof result === "string" ? result : rule.message;
    }
  }
  return null;
}

/**
 * 校验一条记录的多个字段。
 *
 * @param record 数据记录
 * @param ruleMap 字段名 → 规则数组（缺失字段视为无规则，跳过）
 * @returns 第一个失败字段 { field, message }；全部通过返回 null
 *
 * @example
 * const err = await validateRecord(form, {
 *   steel_code: [SPEC_RULES.required('钢种')],
 *   work_time:  [numeric({ kind: 'integer', min: 1 }, '作业时间')],
 * });
 * if (err) ElMessage.error(`${err.message}`);
 */
export async function validateRecord(
  record: Record<string, any>,
  ruleMap: Record<string, RuleSpec[]>,
): Promise<{ field: string; message: string } | null> {
  for (const field of Object.keys(ruleMap)) {
    // eslint-disable-next-line no-await-in-loop
    const message = await validateValue(record[field], ruleMap[field]);
    if (message) return { field, message };
  }
  return null;
}

/**
 * 校验多行记录（表格提交场景）。
 *
 * @param rows 行数据数组
 * @param ruleMap 字段名 → 规则数组
 * @param options.startIndex 行号起始偏移（默认 0；展示「第N行」时可传 1）
 * @returns 第一条失败信息 { rowIndex, field, message }；全部通过返回 null
 *
 * @example
 * const err = await validateRows(detailRows, ruleMap, { startIndex: 1 });
 * if (err) return `${title}第${err.rowIndex}行：${err.message}`;
 */
export async function validateRows(
  rows: Record<string, any>[],
  ruleMap: Record<string, RuleSpec[]>,
  options?: { startIndex?: number },
): Promise<{
  rowIndex: number;
  field: string;
  message: string;
} | null> {
  const startIndex = options?.startIndex ?? 0;
  for (let i = 0; i < rows.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const err = await validateRecord(rows[i], ruleMap);
    if (err) {
      return { rowIndex: startIndex + i, field: err.field, message: err.message };
    }
  }
  return null;
}

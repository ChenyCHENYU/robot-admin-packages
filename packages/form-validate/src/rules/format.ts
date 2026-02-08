/**
 * 格式验证规则
 * 包含常用的格式验证（手机号、邮箱、URL等）
 */

import { createRule, createAsyncRule } from "../utils";
import { REGEX_PATTERNS } from "../regex";

/**
 * 手机号验证
 * @param field 字段名
 */
export const mobile = (field: string = "手机号") =>
  createRule(
    "blur",
    (v) => !v || REGEX_PATTERNS.MOBILE.test(v),
    `${field}格式错误`,
  );

/**
 * 邮箱验证
 * @param field 字段名
 */
export const email = (field: string = "邮箱") =>
  createRule(
    "blur",
    (v) => !v || REGEX_PATTERNS.EMAIL.test(v),
    `${field}格式错误`,
  );

/**
 * URL验证
 * @param field 字段名
 */
export const url = (field: string = "链接") =>
  createRule(
    "blur",
    (v) => !v || REGEX_PATTERNS.URL.test(v),
    `${field}格式错误`,
  );

/**
 * IP地址验证（IPv4）
 * @param field 字段名
 */
export const ip = (field: string = "IP地址") =>
  createRule(
    "blur",
    (v) => !v || REGEX_PATTERNS.IP.test(v),
    `${field}格式错误`,
  );

/**
 * IPv6地址验证
 * @param field 字段名
 */
export const ipv6 = (field: string = "IPv6地址") =>
  createRule(
    "blur",
    (v) => !v || REGEX_PATTERNS.IPV6.test(v),
    `${field}格式错误`,
  );

/**
 * MAC地址验证
 * @param field 字段名
 */
export const mac = (field: string = "MAC地址") =>
  createRule(
    "blur",
    (v) => !v || REGEX_PATTERNS.MAC.test(v),
    `${field}格式错误`,
  );

/**
 * 域名验证
 * @param field 字段名
 */
export const domain = (field: string = "域名") =>
  createRule(
    "blur",
    (v) => !v || REGEX_PATTERNS.DOMAIN.test(v),
    `${field}格式错误`,
  );

/**
 * 十六进制颜色验证
 * @param field 字段名
 */
export const hexColor = (field: string = "颜色值") =>
  createRule(
    "blur",
    (v) => !v || REGEX_PATTERNS.HEX_COLOR.test(v),
    `${field}必须是有效的十六进制颜色（如 #FFF 或 #FFFFFF）`,
  );

/**
 * 用户名验证（字母数字下划线，3-20位）
 * @param field 字段名
 */
export const username = (field: string = "用户名") =>
  createRule(
    "blur",
    (v) => !v || REGEX_PATTERNS.USERNAME.test(v),
    `${field}只能包含字母、数字、下划线，长度3-20位`,
  );

/**
 * 强密码验证（包含大小写字母和数字，6-20位）
 * @param field 字段名
 */
export const strongPassword = (field: string = "密码") =>
  createRule(
    "blur",
    (v) => !v || REGEX_PATTERNS.PASSWORD.test(v),
    `${field}必须包含大小写字母和数字，长度6-20位`,
  );

/**
 * 确认密码验证
 * @param field 字段名
 * @param getOriginalValue 获取原密码的函数
 */
export const confirmPassword = (field: string, getOriginalValue: () => any) =>
  createRule("blur", (v) => !v || v === getOriginalValue(), `${field}不一致`);

/**
 * 异步验证（如检查用户名是否存在）
 * @param field 字段名
 * @param asyncCheck 异步检查函数
 * @param message 错误消息
 */
export const asyncCheck = (
  field: string,
  asyncCheck: (v: any) => Promise<boolean>,
  message?: string,
) => createAsyncRule("blur", asyncCheck, message || `${field}验证失败`);

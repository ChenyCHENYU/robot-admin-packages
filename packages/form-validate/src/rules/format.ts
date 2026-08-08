/**
 * 格式验证规则（产出框架无关的 RuleSpec）
 */

import { createSpec, createAsyncSpec } from "../utils";
import { REGEX_PATTERNS } from "../regex";

export const mobile = (field: string = "手机号") =>
  createSpec("blur", (v) => !v || REGEX_PATTERNS.MOBILE.test(v), `${field}格式错误`);

export const email = (field: string = "邮箱") =>
  createSpec("blur", (v) => !v || REGEX_PATTERNS.EMAIL.test(v), `${field}格式错误`);

export const url = (field: string = "链接") =>
  createSpec("blur", (v) => !v || REGEX_PATTERNS.URL.test(v), `${field}格式错误`);

export const ip = (field: string = "IP地址") =>
  createSpec("blur", (v) => !v || REGEX_PATTERNS.IP.test(v), `${field}格式错误`);

export const ipv6 = (field: string = "IPv6地址") =>
  createSpec("blur", (v) => !v || REGEX_PATTERNS.IPV6.test(v), `${field}格式错误`);

export const mac = (field: string = "MAC地址") =>
  createSpec("blur", (v) => !v || REGEX_PATTERNS.MAC.test(v), `${field}格式错误`);

export const domain = (field: string = "域名") =>
  createSpec("blur", (v) => !v || REGEX_PATTERNS.DOMAIN.test(v), `${field}格式错误`);

export const hexColor = (field: string = "颜色值") =>
  createSpec(
    "blur",
    (v) => !v || REGEX_PATTERNS.HEX_COLOR.test(v),
    `${field}必须是有效的十六进制颜色（如 #FFF 或 #FFFFFF）`,
  );

export const username = (field: string = "用户名") =>
  createSpec(
    "blur",
    (v) => !v || REGEX_PATTERNS.USERNAME.test(v),
    `${field}只能包含字母、数字、下划线，长度3-20位`,
  );

export const strongPassword = (field: string = "密码") =>
  createSpec(
    "blur",
    (v) => !v || REGEX_PATTERNS.PASSWORD.test(v),
    `${field}必须包含大小写字母和数字，长度6-20位`,
  );

export const confirmPassword = (field: string, getOriginalValue: () => any) =>
  createSpec("blur", (v) => !v || v === getOriginalValue(), `${field}不一致`);

export const asyncCheck = (
  field: string,
  asyncCheck: (v: any) => Promise<boolean>,
  message?: string,
) => createAsyncSpec("blur", asyncCheck, message || `${field}验证失败`);

/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-15
 * @Description: 指令安装器
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import type { App, Directive } from "vue";
import copy from "./directives/copy";
import debounce from "./directives/debounce";
import throttle from "./directives/throttle";
import drag from "./directives/drag";
import longpress from "./directives/longpress";
import permission from "./directives/permission";
import watermark from "./directives/watermark";
import lazy from "./directives/lazy";
import loading from "./directives/loading";
import tooltip from "./directives/tooltip";
import clickOutside from "./directives/click-outside";

// 指令映射表（未来新增指令加这里）
const directives: Record<string, Directive> = {
  copy,
  debounce,
  throttle,
  drag,
  longpress,
  permission,
  watermark,
  lazy,
  loading,
  tooltip,
  "click-outside": clickOutside,
};

/**
 * 安装所有指令的插件函数
 * @param app Vue 应用实例
 */
export function setupDirectives(app: App): void {
  Object.entries(directives).forEach(([name, directive]) => {
    app.directive(name, directive);
  });
  console.log(
    `✅ @robot-admin/directives 已注册 ${Object.keys(directives).length} 个指令`,
  );
}

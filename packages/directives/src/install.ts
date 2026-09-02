import type { App, Directive, Plugin } from "vue";
import { createCopyDirective } from "./directives/copy";
import debounce from "./directives/debounce";
import throttle from "./directives/throttle";
import drag from "./directives/drag";
import longpress from "./directives/longpress";
import {
  createPermissionDirective,
  type PermissionProvider,
} from "./directives/permission";
import watermark from "./directives/watermark";
import lazy from "./directives/lazy";
import loading from "./directives/loading";
import tooltip from "./directives/tooltip";
import clickOutside from "./directives/click-outside";

export interface DirectivesPluginOptions {
  permission?: PermissionProvider;
  prefix?: string;
  notify?: (type: "success" | "error", message: string) => void;
}

export function createDirectives(
  options: DirectivesPluginOptions = {},
): Plugin {
  const directives: Record<string, Directive> = {
    copy: createCopyDirective({ notify: options.notify }),
    debounce,
    throttle,
    drag,
    longpress,
    permission: createPermissionDirective(options.permission),
    watermark,
    lazy,
    loading,
    tooltip,
    "click-outside": clickOutside,
  };
  return {
    install(app: App) {
      for (const [name, directive] of Object.entries(directives)) {
        app.directive(`${options.prefix ?? ""}${name}`, directive);
      }
    },
  };
}

export function setupDirectives(
  app: App,
  options: DirectivesPluginOptions = {},
): void {
  app.use(createDirectives(options));
}

export const directivesPlugin = createDirectives();
export default directivesPlugin;

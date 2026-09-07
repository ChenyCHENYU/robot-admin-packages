import {
  getCurrentScope,
  onScopeDispose,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from "vue";
import { adjustColor } from "../core/settings";

export interface LayoutCssVariableSource {
  primaryColor: MaybeRefOrGetter<string>;
  borderRadiusValue: MaybeRefOrGetter<string>;
  sidebarWidth: MaybeRefOrGetter<number>;
  sidebarCollapsedWidth: MaybeRefOrGetter<number>;
  headerHeight: MaybeRefOrGetter<number>;
  tagsViewHeight: MaybeRefOrGetter<number>;
}

export interface LayoutStyleDeclaration {
  getPropertyValue(name: string): string;
  removeProperty(name: string): string;
  setProperty(name: string, value: string): void;
}

export interface LayoutCssVariableTarget {
  style: LayoutStyleDeclaration;
}

export interface LayoutCssVariableOptions {
  /** 变量写入目标；默认 document.documentElement。 */
  target?: MaybeRefOrGetter<LayoutCssVariableTarget | null | undefined>;
  /** 同时维护 3.x 无前缀变量，默认 false。 */
  legacyAliases?: boolean;
}

export interface LayoutCssVariableBinding {
  dispose: () => void;
  sync: () => void;
}

const getDefaultTarget = (): LayoutCssVariableTarget | undefined =>
  typeof document === "undefined" ? undefined : document.documentElement;

function createVariableEntries(
  source: LayoutCssVariableSource,
  legacyAliases: boolean,
): Array<readonly [string, string]> {
  const primaryColor = toValue(source.primaryColor);
  const values = {
    "primary-color": primaryColor,
    "primary-color-hover": adjustColor(primaryColor, 10),
    "primary-color-pressed": adjustColor(primaryColor, -10),
    "border-radius": toValue(source.borderRadiusValue),
    "sidebar-width": `${toValue(source.sidebarWidth)}px`,
    "sidebar-collapsed-width": `${toValue(source.sidebarCollapsedWidth)}px`,
    "header-height": `${toValue(source.headerHeight)}px`,
    "tags-view-height": `${toValue(source.tagsViewHeight)}px`,
  };

  return Object.entries(values).flatMap(([name, value]) => {
    const entries: Array<readonly [string, string]> = [
      [`--ra-layout-${name}`, value],
    ];
    if (legacyAliases) entries.push([`--${name}`, value]);
    return entries;
  });
}

/**
 * 将响应式设置绑定到指定样式作用域，并在 dispose 时精确恢复原值。
 */
export function bindLayoutCssVariables(
  source: LayoutCssVariableSource,
  options: LayoutCssVariableOptions = {},
): LayoutCssVariableBinding {
  let activeTarget: LayoutCssVariableTarget | undefined;
  let originalValues = new Map<string, string>();
  let disposed = false;

  const restore = () => {
    if (!activeTarget) return;
    for (const [name, value] of originalValues) {
      if (value) activeTarget.style.setProperty(name, value);
      else activeTarget.style.removeProperty(name);
    }
    activeTarget = undefined;
    originalValues = new Map();
  };

  const sync = () => {
    if (disposed) return;
    const nextTarget = options.target
      ? (toValue(options.target) ?? undefined)
      : getDefaultTarget();
    if (!nextTarget) {
      restore();
      return;
    }

    const entries = createVariableEntries(
      source,
      options.legacyAliases ?? false,
    );
    if (activeTarget !== nextTarget) {
      restore();
      activeTarget = nextTarget;
      originalValues = new Map(
        entries.map(([name]) => [
          name,
          nextTarget.style.getPropertyValue(name),
        ]),
      );
    }
    for (const [name, value] of entries)
      nextTarget.style.setProperty(name, value);
  };

  const stop = watch(
    () => [
      toValue(source.primaryColor),
      toValue(source.borderRadiusValue),
      toValue(source.sidebarWidth),
      toValue(source.sidebarCollapsedWidth),
      toValue(source.headerHeight),
      toValue(source.tagsViewHeight),
      options.target ? toValue(options.target) : undefined,
    ],
    sync,
    { immediate: true },
  );

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    stop();
    restore();
  };

  return { dispose, sync };
}

/** setup 作用域内使用的自动清理版本。 */
export function useLayoutCssVariables(
  source: LayoutCssVariableSource,
  options: LayoutCssVariableOptions = {},
): LayoutCssVariableBinding {
  const binding = bindLayoutCssVariables(source, options);
  if (getCurrentScope()) onScopeDispose(binding.dispose);
  return binding;
}

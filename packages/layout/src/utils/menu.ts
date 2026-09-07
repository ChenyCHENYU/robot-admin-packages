import type { MenuMeta, MenuOptions } from "../types/menu";

/** 布局内置导航可以安全消费的标准菜单项。 */
export type LayoutMenuItem<TMeta extends MenuMeta = MenuMeta> = Omit<
  MenuOptions<TMeta>,
  "children" | "key" | "meta" | "path"
> & {
  key: string;
  path: string;
  meta: TMeta & { title: string };
  children?: LayoutMenuItem<TMeta>[];
};

/**
 * 非破坏地统一 path/key、label/meta.title 与字符串图标来源。
 * 缺少稳定路径或 key 的节点不会进入导航，避免意外跳转到根路由。
 */
export function normalizeLayoutMenus<TMeta extends MenuMeta = MenuMeta>(
  menus: readonly MenuOptions<TMeta>[],
): LayoutMenuItem<TMeta>[] {
  return menus.flatMap((item) => {
    const path = item.path || item.key;
    if (!path) return [];

    const title = item.meta?.title || item.label || item.name || path;
    const stringIcon =
      item.meta?.icon ??
      (typeof item.icon === "string" ? item.icon : undefined);
    const meta = {
      ...item.meta,
      title,
      ...(stringIcon ? { icon: stringIcon } : {}),
    } as TMeta & { title: string };

    return [
      {
        ...item,
        key: item.key || path,
        path,
        meta,
        children: item.children
          ? normalizeLayoutMenus<TMeta>(item.children)
          : undefined,
      },
    ];
  });
}

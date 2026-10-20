import type { MenuMeta, MenuOptions } from "../types/menu";

/** 标准化只保证通用元数据与标题；宿主扩展字段可能因缺少 meta 而不存在。 */
export type LayoutMenuMeta<TMeta extends MenuMeta = MenuMeta> = MenuMeta & {
  [K in keyof TMeta as K extends "title" | "icon" ? never : K]?: TMeta[K];
} & { title: string };

/** 布局内置导航可以安全消费的标准菜单项。 */
export type LayoutMenuItem<TMeta extends MenuMeta = MenuMeta> = Omit<
  MenuOptions<TMeta>,
  "children" | "key" | "meta" | "path"
> & {
  key: string;
  path: string;
  meta: LayoutMenuMeta<TMeta>;
  children?: LayoutMenuItem<TMeta>[];
};

/**
 * 非破坏地统一 path/key、label/meta.title 与字符串图标来源。
 * 缺少稳定路径或 key 的节点不会进入导航，避免意外跳转到根路由。
 * meta 可缺省，因此不会把宿主扩展字段提升为必填；title/icon 会按通用规则补齐。
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
    } as LayoutMenuMeta<TMeta>;

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

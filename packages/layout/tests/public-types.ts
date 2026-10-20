import type {
  LayoutMenuItem as RootMenuItem,
  LayoutMenuMeta as RootMenuMeta,
  ThemePreset as RootPreset,
  ThemePresetSettings as RootPresetSettings,
} from "@robot-admin/layout";
import type {
  ThemePreset,
  ThemePresetSettings,
} from "@robot-admin/layout/core";
import {
  createLayoutContext,
  normalizeLayoutMenus,
  type LayoutContext,
  type LayoutMenuItem,
  type LayoutMenuMeta,
  type LayoutSettingsSource,
  type MenuMeta,
  type MenuOptions,
  type SettingsStoreInstance,
  type ThemePresetSettings as VuePresetSettings,
  type useSettingsController,
} from "@robot-admin/layout/vue";
import type {
  LayoutMenuItem as NaiveMenuItem,
  LayoutMenuMeta as NaiveMenuMeta,
  ThemePresetSettings as NaivePresetSettings,
} from "@robot-admin/layout/naive";
import { computed, ref } from "vue";

type Assert<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

export type PublicEntryContracts = [
  Assert<Equal<RootPreset, ThemePreset>>,
  Assert<Equal<RootPresetSettings, ThemePresetSettings>>,
  Assert<Equal<VuePresetSettings, ThemePresetSettings>>,
  Assert<Equal<NaivePresetSettings, ThemePresetSettings>>,
  Assert<Equal<RootMenuItem, LayoutMenuItem>>,
  Assert<Equal<NaiveMenuItem, LayoutMenuItem>>,
  Assert<Equal<RootMenuMeta, LayoutMenuMeta>>,
  Assert<Equal<NaiveMenuMeta, LayoutMenuMeta>>,
  Assert<
    Equal<
      keyof ThemePresetSettings,
      | "borderRadius"
      | "transitionType"
      | "showBreadcrumb"
      | "showTagsView"
      | "tagsViewStyle"
    >
  >,
];

export function verifyPresets(
  store: SettingsStoreInstance,
  controller: ReturnType<typeof useSettingsController>,
): void {
  const details: ThemePresetSettings = {
    borderRadius: "large",
    transitionType: "none",
    showBreadcrumb: false,
    showTagsView: false,
    tagsViewStyle: "card",
  };
  const preset: ThemePreset = {
    name: "custom",
    description: "Custom appearance",
    icon: "theme",
    primaryColor: "#722ed1",
    settings: details,
  };
  void store.applyPreset(preset);
  void controller.applyPreset(preset);
  void store.applyPreset({
    name: "minimal",
    icon: "theme",
    primaryColor: "#409eff",
  });

  const invalidDetails: ThemePresetSettings = {
    // @ts-expect-error Layout sizing is not part of a theme preset.
    sidebarWidth: 260,
  };
  const invalidTransition: ThemePresetSettings = {
    // @ts-expect-error Supported settings still enforce their value domains.
    transitionType: "spin",
  };
  // @ts-expect-error The theme color belongs to ThemePreset.primaryColor.
  details.primaryColor = "#409eff";
  // @ts-expect-error Presets cannot change the host theme mode.
  details.themeMode = "dark";
  // @ts-expect-error Presets cannot change the layout mode.
  details.layoutMode = "top";
  // @ts-expect-error Unrelated booleans are not accepted as preset details.
  details.enableTransition = false;
  void invalidDetails;
  void invalidTransition;
}

interface PermissionMeta extends MenuMeta {
  permission: string;
}

export function verifyMenus(settings: LayoutSettingsSource): void {
  const source: MenuOptions<PermissionMeta>[] = [
    { path: "/users", meta: { title: "Users", permission: "users:read" } },
    { key: "/home", label: "Home", children: [{ key: "/home/details" }] },
  ];
  // No explicit generic is needed for either base menus or host extensions.
  const normalized = normalizeLayoutMenus(source);
  const permission: string | undefined = normalized[0].meta.permission;
  const title: string = normalized[1].meta.title;
  const childPermission: string | undefined =
    normalized[1].children?.[0].meta.permission;
  // @ts-expect-error Input meta may be absent, so permission is not guaranteed.
  const requiredPermission: string = normalized[1].meta.permission;
  // @ts-expect-error The same optional metadata contract applies recursively.
  const requiredChildPermission: string =
    normalized[1].children![0].meta.permission;

  const minimal: LayoutMenuItem[] = normalizeLayoutMenus([
    { key: "/home", label: "Home" },
  ]);
  const context = createLayoutContext({
    settings,
    menus: ref(normalized),
    isDark: false,
  });
  const existingContext: LayoutContext = {
    ...context,
    menus: computed(() => normalized),
  };
  const baseMenus: MenuOptions[] = normalized;

  // Even a narrow input title/icon may be replaced by label and top-level icon.
  interface NarrowMeta extends MenuMeta {
    title: "";
    icon: "only-this-icon";
    permission: string;
  }
  const narrow: MenuOptions<NarrowMeta>[] = [
    {
      key: "/fallback",
      label: "Fallback",
      icon: "fallback-icon",
    },
  ];
  const fallback = normalizeLayoutMenus(narrow);
  const fallbackTitle: string = fallback[0].meta.title;
  const fallbackIcon: string | undefined = fallback[0].meta.icon;
  // @ts-expect-error Normalization cannot preserve a title literal when meta is absent.
  const emptyTitle: "" = fallback[0].meta.title;
  // @ts-expect-error A fallback icon is not guaranteed to match the host icon literal.
  const narrowIcon: "only-this-icon" | undefined = fallback[0].meta.icon;

  void [
    permission,
    title,
    childPermission,
    requiredPermission,
    requiredChildPermission,
    minimal,
    existingContext,
    baseMenus,
    fallbackTitle,
    fallbackIcon,
    emptyTitle,
    narrowIcon,
  ];
}

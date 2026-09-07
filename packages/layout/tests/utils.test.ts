import { describe, expect, it } from "vitest";
import { nextTick, reactive, ref } from "vue";
import { createPinia, setActivePinia } from "pinia";
import {
  assertLayoutSettingsRelationships,
  sanitizeLayoutSettingsConfig,
  SETTINGS_CONFIG_SCHEMA_VERSION,
} from "../src/core";
import { shouldCacheRoute } from "../src/composables/useLayoutCache";
import { isPathSegmentPrefix } from "../src/composables/useMenuSplit";
import {
  adjustColor,
  createSettingsStore,
  sanitizeSettingsPatch,
} from "../src/stores/settings";
import { createLayoutContext } from "../src/composables/createLayoutContext";
import { bindLayoutCssVariables } from "../src/composables/useLayoutCssVariables";
import {
  calculateVisibleMenuCount,
  estimateMenuItemWidth,
} from "../src/composables/useResponsiveMenu";
import { normalizeLayoutMenus } from "../src/utils/menu";

describe("layout helpers", () => {
  it("matches route segments without prefix false positives", () => {
    expect(isPathSegmentPrefix("/users", "/users/42")).toBe(true);
    expect(isPathSegmentPrefix("users", "/users/42")).toBe(true);
    expect(isPathSegmentPrefix("/users", "/users-admin")).toBe(false);
    expect(isPathSegmentPrefix("/users", "/super-users")).toBe(false);
    expect(isPathSegmentPrefix("/", "/")).toBe(true);
    expect(isPathSegmentPrefix("/", "/users")).toBe(false);
  });

  it("validates and normalizes color inputs", () => {
    expect(adjustColor("#abc", 1)).toBe("#abbccd");
    expect(adjustColor("#000000", -10)).toBe("#000000");
    expect(adjustColor("ab#cdef", 10)).toBe("ab#cdef");
    expect(adjustColor("invalid", 10)).toBe("invalid");
    expect(adjustColor("#ffffff", Number.NaN)).toBe("#ffffff");
  });

  it("validates imported settings without accepting arbitrary state", () => {
    expect(
      sanitizeSettingsPatch({
        themeMode: "system",
        layoutMode: "side",
        sidebarWidth: 240,
        showFooter: false,
        futureOption: "ignored",
      }),
    ).toEqual({
      themeMode: "system",
      layoutMode: "side",
      sidebarWidth: 240,
      showFooter: false,
    });

    expect(() => sanitizeSettingsPatch({ themeMode: "auto" })).toThrow(
      RangeError,
    );
    expect(() => sanitizeSettingsPatch({ sidebarWidth: Infinity })).toThrow(
      RangeError,
    );
    expect(() =>
      sanitizeSettingsPatch({ primaryColor: "url(javascript:alert(1))" }),
    ).toThrow(RangeError);
    expect(() =>
      createSettingsStore({ defaults: { themeMode: "auto" as never } }),
    ).toThrow(RangeError);
  });

  it("validates the complete configuration before it can be applied", () => {
    const source = {
      schemaVersion: SETTINGS_CONFIG_SCHEMA_VERSION,
      settings: { themeMode: "dark", sidebarWidth: 240 },
      gray: true,
      watermark: { enabled: true, text: "Robot Admin" },
      ignoredFutureField: true,
    };

    expect(sanitizeLayoutSettingsConfig(source)).toEqual({
      schemaVersion: SETTINGS_CONFIG_SCHEMA_VERSION,
      settings: { themeMode: "dark", sidebarWidth: 240 },
      gray: true,
      watermark: { enabled: true, text: "Robot Admin" },
    });
    expect(source).toEqual({
      schemaVersion: SETTINGS_CONFIG_SCHEMA_VERSION,
      settings: { themeMode: "dark", sidebarWidth: 240 },
      gray: true,
      watermark: { enabled: true, text: "Robot Admin" },
      ignoredFutureField: true,
    });
    expect(() =>
      sanitizeLayoutSettingsConfig({
        settings: { layoutMode: "side" },
        watermark: { enabled: true, text: 123 },
      }),
    ).toThrow(TypeError);
    expect(() => sanitizeLayoutSettingsConfig({ schemaVersion: 2 })).toThrow(
      RangeError,
    );
    expect(() =>
      assertLayoutSettingsRelationships({
        sidebarWidth: 120,
        sidebarCollapsedWidth: 160,
      }),
    ).toThrow(RangeError);
  });

  it("only auto-caches explicitly named keep-alive routes", () => {
    expect(
      shouldCacheRoute({
        name: "UserList",
        meta: { keepAlive: true },
      } as never),
    ).toBe(true);
    expect(
      shouldCacheRoute({
        name: "UserList",
        meta: { keepAlive: false },
      } as never),
    ).toBe(false);
    expect(
      shouldCacheRoute({
        name: Symbol("UserList"),
        meta: { keepAlive: true },
      } as never),
    ).toBe(false);
  });

  it("disables the transition name without discarding the selected preset", () => {
    setActivePinia(createPinia());
    const store = createSettingsStore({ id: "settings-transition-test" })();

    store.transitionType = "slide";
    store.enableTransition = false;
    expect(store.shouldEnableTransition).toBe(false);
    expect(store.transitionName).toBe("");
    expect(store.transitionType).toBe("slide");
  });

  it("rolls back theme state when the synchronization callback fails", async () => {
    setActivePinia(createPinia());
    const store = createSettingsStore({
      id: "settings-rollback-test",
      onThemeModeChange: async () => {
        throw new Error("sync failed");
      },
    })();

    await expect(store.updateThemeMode("dark")).rejects.toThrow("sync failed");
    expect(store.themeMode).toBe("light");
  });

  it("rejects invalid presets before mutating settings", async () => {
    setActivePinia(createPinia());
    const store = createSettingsStore({ id: "settings-preset-test" })();
    const previousColor = store.primaryColor;

    await expect(
      store.applyPreset({
        name: "invalid",
        icon: "x",
        primaryColor: "not-a-color",
      }),
    ).rejects.toThrow(RangeError);
    expect(store.primaryColor).toBe(previousColor);
  });

  it("creates a reactive layout context from the minimal host contract", () => {
    setActivePinia(createPinia());
    const settings = createSettingsStore({ id: "layout-context-test" })();
    const menus = ref([{ label: "Home", key: "/home" }]);
    const isDark = ref(false);
    const context = createLayoutContext({
      settings,
      menus,
      isDark,
      brand: { name: "Workspace" },
    });

    expect(context.menus.value).toEqual(menus.value);
    expect(context.isDark.value).toBe(false);
    expect(context.layoutMode.value).toBe("side");
    expect(context.brand).toMatchObject({
      name: "Workspace",
      homePath: "/home",
    });

    settings.layoutMode = "mix";
    isDark.value = true;
    context.collapsed!.value = true;

    expect(context.layoutMode.value).toBe("mix");
    expect(context.isDark.value).toBe(true);
    expect(settings.collapsed).toBe(true);
  });

  it("accepts a structural settings source without requiring Pinia", () => {
    const settings = reactive({
      layoutMode: "side" as const,
      collapsed: false,
      menuExpandMode: "inline" as const,
      sidebarWidth: 220,
      sidebarCollapsedWidth: 64,
      showFooter: true,
      showTagsView: true,
      tagsViewHeight: 44,
      headerHeight: 64,
      transitionName: "fade-slide",
      showBreadcrumb: true,
      showBreadcrumbIcon: true,
      fixedHeader: true,
    });
    const context = createLayoutContext({ settings, menus: [], isDark: false });

    context.collapsed!.value = true;
    settings.sidebarWidth = 260;

    expect(settings.collapsed).toBe(true);
    expect(context.sidebarWidth.value).toBe(260);
  });

  it("measures responsive menus without depending on a UI component library", () => {
    const items = [
      { path: "/home", meta: { title: "系统管理" } },
      { path: "/users", meta: { title: "Users" } },
    ];

    expect(estimateMenuItemWidth(items[0])).toBeGreaterThan(
      estimateMenuItemWidth(items[1]),
    );
    expect(calculateVisibleMenuCount(items, 1000)).toBe(2);
    expect(calculateVisibleMenuCount(items, 80)).toBe(1);
    expect(calculateVisibleMenuCount([], 80)).toBe(0);
  });

  it("normalizes host menus without mutating or inventing invalid routes", () => {
    const source = [
      { key: "/home", label: "Home", icon: "home-icon" },
      { label: "Missing route" },
    ];
    const normalized = normalizeLayoutMenus(source);

    expect(normalized).toEqual([
      {
        key: "/home",
        path: "/home",
        label: "Home",
        icon: "home-icon",
        meta: { title: "Home", icon: "home-icon" },
        children: undefined,
      },
    ]);
    expect(source).toEqual([
      { key: "/home", label: "Home", icon: "home-icon" },
      { label: "Missing route" },
    ]);
  });

  it("scopes CSS variables and restores the target on disposal", async () => {
    const values = new Map<string, string>([
      ["--ra-layout-primary-color", "#fff"],
    ]);
    const target = {
      style: {
        getPropertyValue: (name: string) => values.get(name) ?? "",
        removeProperty: (name: string) => {
          const previous = values.get(name) ?? "";
          values.delete(name);
          return previous;
        },
        setProperty: (name: string, value: string) => values.set(name, value),
      },
    };
    const primaryColor = ref("#409eff");
    const binding = bindLayoutCssVariables(
      {
        primaryColor,
        borderRadiusValue: "6px",
        sidebarWidth: 220,
        sidebarCollapsedWidth: 64,
        headerHeight: 64,
        tagsViewHeight: 44,
      },
      { target },
    );

    expect(values.get("--ra-layout-primary-color")).toBe("#409eff");
    expect(values.has("--primary-color")).toBe(false);
    primaryColor.value = "#722ed1";
    await nextTick();
    expect(values.get("--ra-layout-primary-color")).toBe("#722ed1");

    binding.dispose();
    expect(values.get("--ra-layout-primary-color")).toBe("#fff");
    expect(values.has("--ra-layout-sidebar-width")).toBe(false);
  });

  it("restores a detached CSS-variable target and stays inert after disposal", async () => {
    const values = new Map<string, string>();
    const target = {
      style: {
        getPropertyValue: (name: string) => values.get(name) ?? "",
        removeProperty: (name: string) => {
          const previous = values.get(name) ?? "";
          values.delete(name);
          return previous;
        },
        setProperty: (name: string, value: string) => values.set(name, value),
      },
    };
    const activeTarget = ref<typeof target | null>(target);
    const binding = bindLayoutCssVariables(
      {
        primaryColor: "#409eff",
        borderRadiusValue: "6px",
        sidebarWidth: 220,
        sidebarCollapsedWidth: 64,
        headerHeight: 64,
        tagsViewHeight: 44,
      },
      { target: activeTarget },
    );

    expect(values.get("--ra-layout-primary-color")).toBe("#409eff");
    activeTarget.value = null;
    await nextTick();
    expect(values.has("--ra-layout-primary-color")).toBe(false);

    binding.dispose();
    activeTarget.value = target;
    binding.sync();
    expect(values.has("--ra-layout-primary-color")).toBe(false);
  });
});

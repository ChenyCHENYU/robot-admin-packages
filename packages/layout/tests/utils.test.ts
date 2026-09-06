import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
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
});

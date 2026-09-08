import { createPinia, setActivePinia } from "pinia";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createThemeStore } from "../src/stores/theme";

afterEach(() => vi.unstubAllGlobals());

describe("theme store lifecycle", () => {
  it("survives unavailable storage and manages one media listener per lifecycle", async () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    const setAttribute = vi.fn();

    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn(() => {
          throw new DOMException("blocked", "SecurityError");
        }),
        setItem: vi.fn(() => {
          throw new DOMException("quota", "QuotaExceededError");
        }),
        removeItem: vi.fn(),
      },
      matchMedia: vi.fn(() => ({
        matches: false,
        addEventListener,
        removeEventListener,
      })),
    });
    vi.stubGlobal("document", { documentElement: { setAttribute } });

    setActivePinia(createPinia());
    const useStore = createThemeStore({
      id: "theme-lifecycle-test",
      enableTransition: false,
    });
    const store = useStore();

    expect(store.mode).toBe("system");
    store.init();
    store.init();
    expect(addEventListener).toHaveBeenCalledTimes(1);

    await expect(store.setMode("dark")).resolves.toBeUndefined();
    expect(store.mode).toBe("dark");

    store.destroy();
    expect(removeEventListener).toHaveBeenCalledTimes(1);
    store.init();
    expect(addEventListener).toHaveBeenCalledTimes(2);
    store.destroy();
    expect(removeEventListener).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid runtime modes and invalid factory defaults", async () => {
    expect(() =>
      createThemeStore({ defaultMode: "invalid" as never }),
    ).toThrow(RangeError);
    expect(() =>
      createThemeStore({ defaultDesignStyle: "invalid" as never }),
    ).toThrow(RangeError);

    setActivePinia(createPinia());
    const store = createThemeStore({ id: "theme-validation-test" })();
    await expect(store.setMode("invalid" as never)).rejects.toThrow(RangeError);
    await expect(store.setDesignStyle("invalid" as never)).rejects.toThrow(
      RangeError,
    );
  });

  it("cleans invalid persisted values and validates store namespaces", () => {
    const removeItem = vi.fn();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn((key: string) =>
          key === "invalid-mode" ? "sepia" : "legacy-style",
        ),
        setItem: vi.fn(),
        removeItem,
      },
    });

    setActivePinia(createPinia());
    const store = createThemeStore({
      id: "theme-invalid-storage-test",
      storageKey: "invalid-mode",
      designStyleStorageKey: "invalid-style",
    })();

    expect(store.mode).toBe("system");
    expect(store.designStyle).toBe("glass-morphism");
    expect(removeItem).toHaveBeenCalledWith("invalid-mode");
    expect(removeItem).toHaveBeenCalledWith("invalid-style");
    expect(() => createThemeStore({ id: " " })).toThrow(TypeError);
    expect(() =>
      createThemeStore({
        storageKey: "same-key",
        designStyleStorageKey: "same-key",
      }),
    ).toThrow(TypeError);
  });

  it("resolves system mode before init and applies compatible design styles", async () => {
    const attributes = new Map<string, string>();
    const setItem = vi.fn();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn(() => null),
        setItem,
        removeItem: vi.fn(),
      },
      matchMedia: vi.fn(() => ({ matches: true })),
    });
    vi.stubGlobal("document", {
      documentElement: {
        setAttribute: (name: string, value: string) =>
          attributes.set(name, value),
      },
    });

    setActivePinia(createPinia());
    const store = createThemeStore({
      id: "theme-system-before-init-test",
      enableTransition: false,
    })();

    await store.setMode("system");
    expect(store.isDark).toBe(true);
    expect(attributes.get("data-theme")).toBe("dark");

    await store.setMode("light");
    await store.setDesignStyle("dark-tech");
    expect(store.mode).toBe("dark");
    expect(attributes.get("data-design-style")).toBe("dark-tech");
    expect(setItem).toHaveBeenCalledWith("theme-mode", "dark");

    await store.setMode("light");
    expect(store.mode).toBe("dark");
    expect(attributes.get("data-theme")).toBe("dark");
  });

  it("supports legacy media listeners and removes them on destroy", () => {
    const addListener = vi.fn();
    const removeListener = vi.fn();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      matchMedia: vi.fn(() => ({
        matches: false,
        addListener,
        removeListener,
      })),
    });
    vi.stubGlobal("document", {
      documentElement: { setAttribute: vi.fn() },
    });

    setActivePinia(createPinia());
    const store = createThemeStore({ id: "theme-legacy-listener-test" })();
    store.init();
    store.destroy();

    expect(addListener).toHaveBeenCalledOnce();
    expect(removeListener).toHaveBeenCalledOnce();
  });

  it("supports injected storage and observable runtime degradation", async () => {
    const errors: string[] = [];
    const storage = {
      getItem: vi.fn(() => {
        throw new Error("read failed");
      }),
      setItem: vi.fn(() => {
        throw new Error("write failed");
      }),
      removeItem: vi.fn(),
    };

    setActivePinia(createPinia());
    const store = createThemeStore({
      id: "theme-injected-storage-test",
      enableTransition: false,
      storage,
      onError: (_error, context) => errors.push(context.operation),
    })();

    await expect(store.setMode("dark")).resolves.toBeUndefined();
    expect(store.mode).toBe("dark");
    expect(errors).toEqual([
      "storage-read",
      "storage-read",
      "storage-write",
    ]);
  });

  it("synchronizes valid preferences across tabs and releases the listener", () => {
    let storageHandler: ((event: StorageEvent) => void) | undefined;
    const addEventListener = vi.fn(
      (type: string, handler: (event: StorageEvent) => void) => {
        if (type === "storage") storageHandler = handler;
      },
    );
    const removeEventListener = vi.fn();
    const attributes = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      matchMedia: vi.fn(() => ({ matches: false })),
      addEventListener,
      removeEventListener,
    });
    vi.stubGlobal("document", {
      documentElement: {
        setAttribute: (name: string, value: string) =>
          attributes.set(name, value),
      },
    });

    setActivePinia(createPinia());
    const store = createThemeStore({ id: "theme-storage-sync-test" })();
    store.init();
    storageHandler?.({ key: "theme-mode", newValue: "dark" } as StorageEvent);
    storageHandler?.({
      key: "robot-admin-design-style",
      newValue: "corporate-minimal",
    } as StorageEvent);
    storageHandler?.({ key: "theme-mode", newValue: "invalid" } as StorageEvent);

    expect(store.mode).toBe("dark");
    expect(store.designStyle).toBe("corporate-minimal");
    expect(attributes.get("data-theme")).toBe("dark");

    storageHandler?.({ key: null, newValue: null } as StorageEvent);
    expect(store.mode).toBe("system");
    expect(store.designStyle).toBe("glass-morphism");
    store.destroy();
    expect(removeEventListener).toHaveBeenCalledWith(
      "storage",
      expect.any(Function),
    );
  });
});

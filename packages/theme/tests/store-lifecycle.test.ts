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
  });
});

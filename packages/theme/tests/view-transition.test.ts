import { afterEach, describe, expect, it, vi } from "vitest";
import { useViewTransition } from "../src/composables/useViewTransition";

interface TestViewTransition {
  finished: Promise<void>;
}

function installDocument(
  startViewTransition: (
    callback: () => Promise<void>,
  ) => TestViewTransition,
) {
  const classes = new Set<string>();
  vi.stubGlobal("window", {
    matchMedia: () => ({ matches: false }),
  });
  vi.stubGlobal("document", {
    documentElement: {
      classList: {
        add: (name: string) => classes.add(name),
        remove: (name: string) => classes.delete(name),
      },
    },
    startViewTransition,
  });
  return classes;
}

afterEach(() => vi.unstubAllGlobals());

describe("useViewTransition", () => {
  it("propagates async callback failures and always removes the marker class", async () => {
    const classes = installDocument((callback) => ({
      finished: Promise.resolve().then(callback),
    }));

    await expect(
      useViewTransition(async () => {
        throw new Error("theme update failed");
      }),
    ).rejects.toThrow("theme update failed");
    expect(classes.size).toBe(0);
  });

  it("falls back to a direct update if the transition aborts before callback", async () => {
    const classes = installDocument(() => {
      throw new DOMException("skipped", "InvalidStateError");
    });
    const callback = vi.fn();

    await useViewTransition(callback);
    expect(callback).toHaveBeenCalledOnce();
    expect(classes.size).toBe(0);
  });

  it("falls back for arbitrary transition failures without running the callback twice", async () => {
    const classes = installDocument(() => {
      throw new Error("browser transition unavailable");
    });
    const callback = vi.fn();

    await expect(useViewTransition(callback)).resolves.toBeUndefined();
    expect(callback).toHaveBeenCalledOnce();
    expect(classes.size).toBe(0);
  });

  it("ignores reduced-motion media query failures", async () => {
    const callback = vi.fn();
    vi.stubGlobal("window", {
      matchMedia: () => {
        throw new DOMException("blocked", "SecurityError");
      },
    });
    vi.stubGlobal("document", {
      documentElement: {
        classList: { add: vi.fn(), remove: vi.fn() },
      },
      startViewTransition: (update: () => Promise<void>) => ({
        finished: update(),
      }),
    });

    await expect(useViewTransition(callback)).resolves.toBeUndefined();
    expect(callback).toHaveBeenCalledOnce();
  });

  it("keeps the marker class until all concurrent transitions finish", async () => {
    const releases: Array<() => void> = [];
    const callbacks: Array<() => Promise<void>> = [];
    const classes = installDocument((callback) => ({
      finished: new Promise<void>((resolve) => {
        callbacks.push(callback);
        releases.push(resolve);
      }).then(callback),
    }));

    const first = useViewTransition(vi.fn());
    const second = useViewTransition(vi.fn());
    expect(classes.has("theme-transitioning")).toBe(true);

    releases[0]();
    await callbacks[0]();
    await Promise.resolve();
    expect(classes.has("theme-transitioning")).toBe(true);

    releases[1]();
    await Promise.all([first, second]);
    expect(classes.size).toBe(0);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { useViewTransition } from "../src/composables/useViewTransition";

function installDocument(startViewTransition: (callback: () => Promise<void>) => any) {
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
});

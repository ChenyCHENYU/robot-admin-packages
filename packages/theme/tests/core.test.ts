import { describe, expect, it } from "vitest";
import {
  isDesignStyle,
  isThemeMode,
  resolveCompatibleThemeMode,
  resolveThemeMode,
} from "../src/entries/core";
import { DESIGN_STYLE_CONFIGS } from "../src/constants";

describe("theme core", () => {
  it("validates and resolves theme values without framework state", () => {
    expect(isThemeMode("system")).toBe(true);
    expect(isThemeMode("sepia")).toBe(false);
    expect(isDesignStyle("glass-morphism")).toBe(true);
    expect(isDesignStyle(null)).toBe(false);
    expect(resolveThemeMode("system", true)).toBe("dark");
    expect(resolveThemeMode("system", false)).toBe("light");
  });

  it("enforces design-style compatibility", () => {
    expect(
      resolveCompatibleThemeMode(
        "light",
        false,
        DESIGN_STYLE_CONFIGS["dark-tech"],
      ),
    ).toBe("dark");
    expect(
      resolveCompatibleThemeMode(
        "system",
        true,
        DESIGN_STYLE_CONFIGS["dark-tech"],
      ),
    ).toBe("system");
  });
});

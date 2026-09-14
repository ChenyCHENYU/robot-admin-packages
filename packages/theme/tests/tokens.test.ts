import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME_TOKENS,
  applyThemeTokens,
  createThemeCss,
  createThemeTokens,
  getThemeCssVariables,
} from "../src/entries/tokens";
import type { ThemeStyleTarget } from "../src/entries/tokens";

function createStyleTarget(initial: Record<string, string> = {}): ThemeStyleTarget {
  const values = new Map(Object.entries(initial));
  const priorities = new Map<string, string>();
  return {
    getPropertyPriority: name => priorities.get(name) ?? "",
    getPropertyValue: name => values.get(name) ?? "",
    removeProperty: name => {
      const previous = values.get(name) ?? "";
      values.delete(name);
      priorities.delete(name);
      return previous;
    },
    setProperty: (name, value, priority = "") => {
      values.set(name, value);
      priorities.set(name, priority);
    },
  };
}

describe("theme tokens", () => {
  it("creates an immutable project theme from small semantic overrides", () => {
    const tokens = createThemeTokens({
      light: { color: { primary: "#6750a4" } },
      dark: { component: { tabIndicator: "#d0bcff" } },
      radius: { md: "10px" },
    });

    expect(tokens.light.color.primary).toBe("#6750a4");
    expect(tokens.light.color.canvas).toBe(DEFAULT_THEME_TOKENS.light.color.canvas);
    expect(tokens.dark.component.tabIndicator).toBe("#d0bcff");
    expect(tokens.radius.md).toBe("10px");
    expect(Object.isFrozen(tokens.light.color)).toBe(true);
  });

  it("rejects unknown and empty overrides instead of silently shipping typos", () => {
    expect(() =>
      createThemeTokens({ light: { color: { primary: "  " } } }),
    ).toThrow("tokens.light.color.primary");
    expect(() =>
      createThemeTokens({ unknown: {} } as never),
    ).toThrow("tokens.unknown");
  });

  it("uses the same source for CSS generation and runtime variables", () => {
    const variables = getThemeCssVariables(DEFAULT_THEME_TOKENS, "light");
    const css = createThemeCss();

    expect(variables["--ra-color-primary"]).toBe("#1767d2");
    expect(variables["--ra-table-header-bg"]).toBe("#f4f7fc");
    expect(variables["--ra-control-height-mini"]).toBe("28px");
    expect(css).toContain("[data-theme=\"dark\"]");
    expect(css).toContain("--ra-color-primary: #1767d2");
  });

  it("restores pre-existing inline variables without leaking application state", () => {
    const target = createStyleTarget({ "--ra-color-primary": "#123456" });
    const restore = applyThemeTokens(target, DEFAULT_THEME_TOKENS, "dark");

    expect(target.getPropertyValue("--ra-color-primary")).toBe("#60a5fa");
    expect(target.getPropertyValue("--ra-color-canvas")).toBe("#0b1020");
    restore();
    restore();
    expect(target.getPropertyValue("--ra-color-primary")).toBe("#123456");
    expect(target.getPropertyValue("--ra-color-canvas")).toBe("");
  });
});

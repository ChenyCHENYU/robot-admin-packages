import { ref } from "vue";
import { darkTheme, lightTheme } from "naive-ui";
import { describe, expect, it } from "vitest";
import {
  createNaiveThemeOverrides,
  mergeNaiveThemeOverrides,
  useNaiveTheme,
} from "../src/entries/naive";
import { createThemeTokens } from "../src/entries/core";

describe("Naive UI theme adapter", () => {
  it("maps semantic tokens without leaking framework names into core", () => {
    const tokens = createThemeTokens({
      light: { color: { primary: "#6750a4" } },
    });
    const overrides = createNaiveThemeOverrides(tokens, "light");

    expect(overrides.common?.primaryColor).toBe("#6750a4");
    expect(overrides.DataTable?.thColor).toBe(tokens.light.component.tableHeaderBg);
    expect(overrides.Tabs?.barColor).toBe(tokens.light.component.tabIndicator);
    expect(overrides.Tabs).toMatchObject({
      colorSegment: tokens.light.color.surfaceMuted,
      tabColorSegment: tokens.light.color.surface,
      tabBorderColor: tokens.light.color.border,
    });
  });

  it("merges component overrides without replacing sibling properties", () => {
    expect(
      mergeNaiveThemeOverrides(
        { common: { primaryColor: "#111111" }, Button: { heightMedium: "32px" } },
        { common: { borderRadius: "8px" }, Button: { borderRadiusMedium: "6px" } },
      ),
    ).toEqual({
      common: { primaryColor: "#111111", borderRadius: "8px" },
      Button: { heightMedium: "32px", borderRadiusMedium: "6px" },
    });
  });

  it("exposes reactive NConfigProvider bindings", () => {
    const isDark = ref(false);
    const tokens = createThemeTokens();
    const overrides = ref({ common: { borderRadius: "8px" } });
    const binding = useNaiveTheme({
      isDark,
      lightOverrides: { common: { primaryColor: "#2080f0" } },
      darkOverrides: { common: { primaryColor: "#409eff" } },
      overrides,
      tokens,
    });

    expect(binding.currentTheme.value).toBe(lightTheme);
    expect(binding.themeOverrides.value.common).toMatchObject({
      primaryColor: "#2080f0",
      borderRadius: "8px",
    });

    isDark.value = true;
    expect(binding.currentTheme.value).toBe(darkTheme);
    expect(binding.themeOverrides.value.common?.primaryColor).toBe("#409eff");
  });
});

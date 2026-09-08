import { ref } from "vue";
import { darkTheme, lightTheme } from "naive-ui";
import { describe, expect, it } from "vitest";
import {
  mergeNaiveThemeOverrides,
  useNaiveTheme,
} from "../src/entries/naive";

describe("Naive UI theme adapter", () => {
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
    const overrides = ref({ common: { borderRadius: "8px" } });
    const binding = useNaiveTheme({
      isDark,
      lightOverrides: { common: { primaryColor: "#2080f0" } },
      darkOverrides: { common: { primaryColor: "#409eff" } },
      overrides,
    });

    expect(binding.currentTheme.value).toBe(lightTheme);
    expect(binding.themeOverrides.value.common).toEqual({
      primaryColor: "#2080f0",
      borderRadius: "8px",
    });

    isDark.value = true;
    expect(binding.currentTheme.value).toBe(darkTheme);
    expect(binding.themeOverrides.value.common?.primaryColor).toBe("#409eff");
  });
});

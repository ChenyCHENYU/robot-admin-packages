import type {
  ThemeMode,
  ThemeStorage,
  ThemeTokenOverrides,
} from "../src/entries/core";
import { createThemeTokens, resolveThemeMode } from "../src/entries/core";
import { createThemeStore } from "../src/entries/vue";
import type { GlobalThemeOverrides } from "../src/entries/naive";
import { mergeNaiveThemeOverrides } from "../src/entries/naive";

const storage: ThemeStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const tokenOverrides: ThemeTokenOverrides = {
  light: { color: { primary: "#6750a4" } },
};

function verifyPublicTypes(mode: ThemeMode): GlobalThemeOverrides {
  const resolved: "light" | "dark" = resolveThemeMode(mode, false);
  const useStore = createThemeStore({
    id: `theme-${resolved}`,
    storage,
    syncAcrossTabs: false,
    tokens: tokenOverrides,
  });
  void useStore;
  void createThemeTokens(tokenOverrides);
  return mergeNaiveThemeOverrides({ common: { borderRadius: "6px" } });
}

void verifyPublicTypes;

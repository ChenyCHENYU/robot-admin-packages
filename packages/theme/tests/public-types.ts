import type { GlobalThemeOverrides } from "naive-ui";
import type { ThemeMode, ThemeStorage } from "../src/entries/core";
import { resolveThemeMode } from "../src/entries/core";
import { createThemeStore } from "../src/entries/vue";
import { mergeNaiveThemeOverrides } from "../src/entries/naive";

const storage: ThemeStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

function verifyPublicTypes(mode: ThemeMode): GlobalThemeOverrides {
  const resolved: "light" | "dark" = resolveThemeMode(mode, false);
  const useStore = createThemeStore({
    id: `theme-${resolved}`,
    storage,
    syncAcrossTabs: false,
  });
  void useStore;
  return mergeNaiveThemeOverrides({ common: { borderRadius: "6px" } });
}

void verifyPublicTypes;

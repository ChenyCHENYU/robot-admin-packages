// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import { createPinia } from "pinia";
import { NDialogProvider, NMessageProvider } from "naive-ui";
import SettingsDrawer from "../src/components/SettingsDrawer/index.vue";
import { createSettingsStore } from "../src/stores/settings";
import type {
  SettingsDrawerActions,
  SettingsStoreOptions,
} from "../src/types";

const wrappers: VueWrapper[] = [];

function findButton(text: string): HTMLButtonElement {
  const button = [...document.body.querySelectorAll("button")].find((item) =>
    item.textContent?.includes(text),
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`未找到按钮：${text}`);
  }
  return button;
}

async function openFeaturesTab() {
  const tab = [...document.body.querySelectorAll(".n-tabs-tab")].find((item) =>
    item.textContent?.includes("功能"),
  );
  if (!(tab instanceof HTMLElement)) {
    throw new Error("未找到功能页签");
  }
  tab.click();
  await nextTick();
  await flushPromises();
}

function mountDrawer({
  actions,
  storeOptions = {},
}: {
  actions?: SettingsDrawerActions;
  storeOptions?: SettingsStoreOptions;
} = {}) {
  const pinia = createPinia();
  const store = createSettingsStore({
    id: `settings-drawer-${Math.random()}`,
    ...storeOptions,
  })(pinia);
  const Host = defineComponent({
    setup() {
      return () =>
        h(NDialogProvider, null, {
          default: () =>
            h(NMessageProvider, null, {
              default: () =>
                h(SettingsDrawer, {
                  show: true,
                  store,
                  actions,
                }),
            }),
        });
    },
  });
  const wrapper = mount(Host, {
    attachTo: document.body,
    global: { plugins: [pinia] },
  });
  wrappers.push(wrapper);
  return { wrapper, store };
}

async function confirmDialog() {
  await nextTick();
  await flushPromises();
  findButton("确认").click();
  await flushPromises();
}

beforeEach(() => {
  document.documentElement.classList.remove("gray-mode", "color-weak-mode");
  localStorage.clear();
});

afterEach(() => {
  while (wrappers.length > 0) wrappers.pop()?.unmount();
  document.body.innerHTML = "";
  document.documentElement.classList.remove("gray-mode", "color-weak-mode");
  vi.restoreAllMocks();
});

describe("SettingsDrawer browser interactions", () => {
  it("fails fast without the required Naive UI providers", () => {
    const pinia = createPinia();
    expect(() =>
      mount(SettingsDrawer, {
        props: { show: true },
        global: { plugins: [pinia] },
      }),
    ).toThrow(/message-provider/);
  });

  it("mounts normally with message and dialog providers", async () => {
    mountDrawer();
    await flushPromises();
    expect(document.body.textContent).toContain("布局配置");
  });

  it("delegates cache clearing to the host without touching unrelated storage", async () => {
    localStorage.setItem("auth-token", "keep");
    localStorage.setItem("disposable-cache", "remove");
    const clearCache = vi.fn(() => {
      localStorage.removeItem("disposable-cache");
    });
    mountDrawer({ actions: { clearCache } });
    await openFeaturesTab();

    findButton("清除缓存").click();
    await confirmDialog();

    expect(clearCache).toHaveBeenCalledOnce();
    expect(localStorage.getItem("auth-token")).toBe("keep");
    expect(localStorage.getItem("disposable-cache")).toBeNull();
  });

  it("applies valid imports and rejects invalid files atomically", async () => {
    const { store } = mountDrawer();
    await openFeaturesTab();
    store.layoutMode = "side";
    store.sidebarWidth = 220;

    let selectedFile = new File(
      [
        JSON.stringify({
          schemaVersion: 1,
          settings: { layoutMode: "mix", sidebarWidth: 240 },
        }),
      ],
      "valid-layout.json",
      { type: "application/json" },
    );
    const nativeCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(
      (tagName: string, options?: ElementCreationOptions) => {
        const element = nativeCreateElement(tagName, options);
        if (tagName === "input" && element instanceof HTMLInputElement) {
          Object.defineProperty(element, "files", { value: [selectedFile] });
          element.click = () => element.dispatchEvent(new Event("change"));
        }
        return element;
      },
    );

    findButton("导入配置").click();
    await flushPromises();

    expect(store.layoutMode).toBe("mix");
    expect(store.sidebarWidth).toBe(240);

    selectedFile = new File(
      [
        JSON.stringify({
          schemaVersion: 1,
          settings: { layoutMode: "top", sidebarWidth: 9999 },
        }),
      ],
      "invalid-layout.json",
      { type: "application/json" },
    );
    findButton("导入配置").click();
    await flushPromises();

    expect(store.layoutMode).toBe("mix");
    expect(store.sidebarWidth).toBe(240);
  });

  it("rolls all settings back when reset theme synchronization fails", async () => {
    const { store } = mountDrawer({
      storeOptions: {
        defaults: { themeMode: "dark", layoutMode: "mix" },
        onThemeModeChange: async () => {
          throw new Error("theme sync failed");
        },
      },
    });
    await openFeaturesTab();

    findButton("重置所有配置").click();
    await confirmDialog();

    expect(store.themeMode).toBe("dark");
    expect(store.layoutMode).toBe("mix");
  });

  it("removes only its own global visual effects when unmounted", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      font: "",
      fillStyle: "",
      rotate: vi.fn(),
      fillText: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
      "data:image/png;base64,layout-watermark",
    );
    const { wrapper } = mountDrawer();
    await openFeaturesTab();
    const switches = [...document.body.querySelectorAll('[role="switch"]')];
    expect(switches.length).toBeGreaterThanOrEqual(3);

    for (const item of switches.slice(-3)) {
      if (item instanceof HTMLElement) item.click();
    }
    await nextTick();

    expect(document.documentElement.classList.contains("gray-mode")).toBe(true);
    expect(document.documentElement.classList.contains("color-weak-mode")).toBe(
      true,
    );
    expect(
      document.querySelector('[data-robot-admin-layout-watermark="true"]'),
    ).not.toBeNull();

    wrapper.unmount();

    expect(document.documentElement.classList.contains("gray-mode")).toBe(false);
    expect(document.documentElement.classList.contains("color-weak-mode")).toBe(
      false,
    );
    expect(
      document.querySelector('[data-robot-admin-layout-watermark="true"]'),
    ).toBeNull();
  });

  it("preserves visual-effect classes that were owned by the host", () => {
    document.documentElement.classList.add("gray-mode", "color-weak-mode");
    const { wrapper } = mountDrawer();

    wrapper.unmount();

    expect(document.documentElement.classList.contains("gray-mode")).toBe(true);
    expect(document.documentElement.classList.contains("color-weak-mode")).toBe(
      true,
    );
  });
});

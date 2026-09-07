// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { computed, defineComponent, h, inject, nextTick } from "vue";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import C_LayoutContainer from "../src/components/C_LayoutContainer/index.vue";
import { createSettingsStore } from "../src/stores/settings";
import { provideLayout } from "../src/composables/createLayoutContext";
import {
  MENU_COLLAPSE_KEY,
  type MenuCollapseHandlers,
} from "../src/composables/useLayoutContext";
import type { LayoutMode } from "../src/types";

const wrappers: VueWrapper[] = [];

async function createRouterForTest(): Promise<Router> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/",
        name: "Home",
        component: defineComponent({
          name: "HomeView",
          render: () => h("main", { "data-route-content": true }, "content"),
        }),
      },
    ],
  });
  await router.push("/");
  await router.isReady();
  return router;
}

async function mountMode(mode: LayoutMode) {
  const pinia = createPinia();
  const router = await createRouterForTest();
  const settings = createSettingsStore({
    id: `layout-browser-${mode}`,
    syncCssVariables: false,
  })(pinia);
  settings.layoutMode = mode;

  const Host = defineComponent({
    setup() {
      provideLayout({
        settings,
        menus: [],
        isDark: false,
        brand: { name: "Workspace" },
      });
      return () =>
        h(C_LayoutContainer, null, {
          footer: () => h("footer", { "data-slot": "footer" }, "footer"),
          header: () => h("header", { "data-slot": "header" }, "header"),
          "header-extra": () =>
            h("aside", { "data-slot": "header-extra" }, "extra"),
          menu: () => h("nav", { "data-slot": "menu" }, "menu"),
          "tags-view": () => h("div", { "data-slot": "tags" }, "tags"),
        });
    },
  });
  const wrapper = mount(Host, {
    attachTo: document.body,
    global: { plugins: [pinia, router] },
  });
  wrappers.push(wrapper);
  await nextTick();
  await flushPromises();
  return { settings, wrapper };
}

afterEach(() => {
  while (wrappers.length > 0) wrappers.pop()?.unmount();
  document.body.innerHTML = "";
});

describe("layout container browser contract", () => {
  const modes: LayoutMode[] = [
    "side",
    "top",
    "mix",
    "mix-top",
    "reverse-horizontal-mix",
    "card-layout",
  ];

  for (const mode of modes) {
    it(`mounts ${mode} with the shared route renderer`, async () => {
      const { wrapper } = await mountMode(mode);
      expect(wrapper.find("[data-ra-layout]").exists()).toBe(true);
      expect(wrapper.find("[data-route-content]").text()).toBe("content");
      expect(wrapper.find('[data-slot="footer"]').exists()).toBe(true);
    });
  }

  it("keeps typed and legacy collapse injections synchronized", async () => {
    const pinia = createPinia();
    const router = await createRouterForTest();
    const settings = createSettingsStore({
      id: "layout-collapse-browser",
      syncCssVariables: false,
    })(pinia);
    const Consumer = defineComponent({
      setup() {
        const typed = inject(MENU_COLLAPSE_KEY);
        const legacy = inject<MenuCollapseHandlers>("menuCollapse");
        if (!typed || !legacy) throw new Error("collapse injection missing");
        return () =>
          h(
            "button",
            {
              "data-collapse": String(typed.isCollapsed.value),
              onClick: () => legacy.handleCollapsedChange(true),
            },
            "collapse",
          );
      },
    });
    const Host = defineComponent({
      setup() {
        provideLayout({ settings, menus: [], isDark: false });
        return () =>
          h(C_LayoutContainer, null, {
            header: () => h(Consumer),
            menu: () => h("nav"),
          });
      },
    });
    const wrapper = mount(Host, {
      attachTo: document.body,
      global: { plugins: [pinia, router] },
    });
    wrappers.push(wrapper);
    await flushPromises();

    const button = wrapper.get("button");
    expect(button.attributes("data-collapse")).toBe("false");
    await button.trigger("click");
    expect(settings.collapsed).toBe(true);
    expect(computed(() => settings.collapsed).value).toBe(true);
  });
});

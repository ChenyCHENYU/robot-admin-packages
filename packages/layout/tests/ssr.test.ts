import { describe, expect, it } from "vitest";
import { computed, createSSRApp, defineComponent, h, ref } from "vue";
import { renderToString } from "@vue/server-renderer";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import C_LayoutContainer from "../src/components/C_LayoutContainer/index.vue";
import { provideLayoutContext } from "../src/composables/useLayoutContext";
import type { LayoutMode } from "../src/types";

const modes: LayoutMode[] = [
  "side",
  "top",
  "mix",
  "mix-top",
  "reverse-horizontal-mix",
  "card-layout",
];

async function createRouterForTest(): Promise<Router> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/",
        name: "Home",
        component: defineComponent({
          name: "HomeView",
          render: () => h("main", "content"),
        }),
        meta: { keepAlive: true },
      },
    ],
  });
  await router.push("/");
  await router.isReady();
  return router;
}

describe("layout SSR compatibility", () => {
  for (const mode of modes) {
    it(`renders the ${mode} layout without browser globals`, async () => {
      const router = await createRouterForTest();
      const collapsed = ref(false);
      const app = createSSRApp(
        defineComponent({
          setup() {
            provideLayoutContext({
              menus: computed(() => []),
              isDark: computed(() => false),
              layoutMode: computed(() => mode),
              collapsed: computed({
                get: () => collapsed.value,
                set: (value) => {
                  collapsed.value = value;
                },
              }),
              menuExpandMode: computed(() => "inline"),
              sidebarWidth: computed(() => 220),
              sidebarCollapsedWidth: computed(() => 64),
              showFooter: computed(() => true),
              showTagsView: computed(() => true),
              tagsViewHeight: computed(() => 40),
              headerHeight: computed(() => 56),
              transitionName: computed(() => "slide-fade"),
              showBreadcrumb: computed(() => true),
              showBreadcrumbIcon: computed(() => true),
              fixedHeader: computed(() => true),
              brand: { name: "Robot Admin", homePath: "/" },
            });
            return () => h(C_LayoutContainer);
          },
        }),
      );
      app.use(createPinia());
      app.use(router);

      const html = await renderToString(app);
      expect(html).toContain("layout-container");
    });
  }
});

<!--
 * @robot-admin/layout
 *
 * C_CardLayout - 卡片式布局骨架
 * 顶部导航 + hover 触发的抽屉式菜单 + 内容区
 *
 * Slots:
 *   #logo         - Logo/品牌区域（导航栏左侧）
 *   #menu-trigger - 菜单触发区域（导航栏左侧，hover 触发抽屉）
 *   #drawer-menu  - 抽屉式菜单内容（网格布局的菜单卡片）
 *   #header-extra - 导航栏右侧操作区
 *   #tags-view    - 标签页区域
 *   #default      - 页面内容（自动包含 RouterView + KeepAlive + Transition）
 *   #footer       - 页脚区域
-->
<template>
  <div class="c-card-layout" :class="themeClass">
    <!-- 顶部导航栏 -->
    <header class="c-card-layout__navbar" :style="navbarStyle">
      <div class="c-card-layout__navbar-left">
        <div class="c-card-layout__menu-trigger">
          <slot name="menu-trigger" />
        </div>
        <slot name="logo" />
      </div>
      <div class="c-card-layout__navbar-right">
        <slot name="header-extra" />
      </div>
    </header>

    <!-- 标签页 -->
    <div
      v-if="ctx.showTagsView.value"
      class="c-card-layout__tags"
      :style="tagsStyle"
    >
      <slot name="tags-view" />
    </div>

    <!-- 抽屉式菜单 -->
    <div class="c-card-layout__drawer">
      <slot name="drawer-menu" />
    </div>

    <!-- 内容区 -->
    <main class="c-card-layout__content">
      <RouterView v-slot="{ Component, route }">
        <Transition :name="ctx.transitionName.value" mode="out-in">
          <KeepAlive :include="cachedViews" :max="maxCacheCount">
            <component :is="Component" :key="route.path" />
          </KeepAlive>
        </Transition>
      </RouterView>
    </main>

    <!-- 页脚 -->
    <footer v-if="ctx.showFooter.value" class="c-card-layout__footer">
      <slot name="footer" />
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useLayoutContext } from "../../composables/useLayoutContext";
import { useLayoutCache } from "../../composables/useLayoutCache";

defineOptions({ name: "CardLayout" });

const ctx = useLayoutContext();
const { cachedViews, maxCacheCount } = useLayoutCache();

const themeClass = computed(() =>
  ctx.isDark.value ? "dark-theme" : "light-theme",
);

const navbarStyle = computed(() => ({
  height: `${ctx.headerHeight.value}px`,
}));

const tagsStyle = computed(() => ({
  height: `${ctx.tagsViewHeight.value}px`,
}));
</script>

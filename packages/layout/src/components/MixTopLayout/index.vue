<!--
 * @robot-admin/layout
 *
 * C_MixTopLayout - 顶部混合布局骨架（侧边优先）
 * 左侧一级菜单图标栏 + 顶部二级水平菜单 + 内容区
 *
 * Slots:
 *   #logo        - Logo 区域（一级菜单栏顶部）
 *   #first-menu  - 一级菜单区域（左侧窄栏）
 *   #brand       - 品牌信息区域（顶部导航栏左侧）
 *   #top-menu    - 顶部水平菜单区域（二/三级菜单）
 *   #header-extra - 导航栏右侧操作区
 *   #tags-view   - 标签页区域
 *   #default     - 页面内容（自动包含 RouterView + KeepAlive + Transition）
 *   #footer      - 页脚区域
-->
<template>
  <div class="c-mix-top-layout" :class="themeClass">
    <!-- 左侧一级菜单栏 -->
    <aside class="c-mix-top-layout__first-sider">
      <div class="c-mix-top-layout__logo">
        <slot name="logo" />
      </div>
      <div class="c-mix-top-layout__first-menu">
        <slot name="first-menu" />
      </div>
    </aside>

    <!-- 右侧主区域 -->
    <div class="c-mix-top-layout__main">
      <!-- 顶部导航栏 -->
      <header class="c-mix-top-layout__navbar" :style="navbarStyle">
        <div class="c-mix-top-layout__navbar-left">
          <slot name="brand" />
        </div>
        <div class="c-mix-top-layout__navbar-center">
          <slot name="top-menu" />
        </div>
        <div class="c-mix-top-layout__navbar-right">
          <slot name="header-extra" />
        </div>
      </header>

      <!-- 标签页 -->
      <div
        v-if="ctx.showTagsView.value"
        class="c-mix-top-layout__tags"
        :style="tagsStyle"
      >
        <slot name="tags-view" />
      </div>

      <!-- 内容区 -->
      <main class="c-mix-top-layout__content">
        <RouterView v-slot="{ Component, route }">
          <Transition :name="ctx.transitionName.value" mode="out-in">
            <KeepAlive :include="cachedViews" :max="maxCacheCount">
              <component :is="Component" :key="route.path" />
            </KeepAlive>
          </Transition>
        </RouterView>
      </main>

      <!-- 页脚 -->
      <footer v-if="ctx.showFooter.value" class="c-mix-top-layout__footer">
        <slot name="footer" />
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useLayoutContext } from "../../composables/useLayoutContext";
import { useLayoutCache } from "../../composables/useLayoutCache";

defineOptions({ name: "MixTopLayout" });

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

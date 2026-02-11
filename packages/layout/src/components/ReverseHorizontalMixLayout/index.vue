<!--
 * @robot-admin/layout
 *
 * C_ReverseHorizontalMixLayout - 反转混合布局骨架
 * 顶部一级水平菜单 + 右侧二级侧边栏 + 左侧内容
 *
 * Slots:
 *   #logo        - Logo/品牌区域（导航栏左侧）
 *   #top-menu    - 顶部水平菜单区域（一级菜单）
 *   #header-extra - 导航栏右侧操作区
 *   #tags-view   - 标签页区域
 *   #side-menu   - 右侧二级菜单侧边栏
 *   #default     - 页面内容（自动包含 RouterView + KeepAlive + Transition）
 *   #footer      - 页脚区域
-->
<template>
  <div class="c-reverse-mix-layout" :class="themeClass">
    <!-- 顶部导航栏 -->
    <header class="c-reverse-mix-layout__navbar" :style="navbarStyle">
      <div class="c-reverse-mix-layout__navbar-left">
        <slot name="logo" />
      </div>
      <div class="c-reverse-mix-layout__navbar-center">
        <slot name="top-menu" />
      </div>
      <div class="c-reverse-mix-layout__navbar-right">
        <slot name="header-extra" />
      </div>
    </header>

    <!-- 标签页 -->
    <div
      v-if="ctx.showTagsView.value"
      class="c-reverse-mix-layout__tags"
      :style="tagsStyle"
    >
      <slot name="tags-view" />
    </div>

    <!-- 主区域：左侧内容 + 右侧二级菜单 -->
    <div class="c-reverse-mix-layout__body">
      <!-- 左侧：主内容 -->
      <main class="c-reverse-mix-layout__content">
        <RouterView v-slot="{ Component, route }">
          <Transition :name="ctx.transitionName.value" mode="out-in">
            <KeepAlive :include="cachedViews" :max="maxCacheCount">
              <component :is="Component" :key="route.path" />
            </KeepAlive>
          </Transition>
        </RouterView>

        <!-- 页脚 -->
        <footer
          v-if="ctx.showFooter.value"
          class="c-reverse-mix-layout__footer"
        >
          <slot name="footer" />
        </footer>
      </main>

      <!-- 右侧：二级菜单侧边栏 -->
      <aside class="c-reverse-mix-layout__sider" :style="siderStyle">
        <slot name="side-menu" />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useLayoutContext } from "../../composables/useLayoutContext";
import { useLayoutCache } from "../../composables/useLayoutCache";

defineOptions({ name: "ReverseHorizontalMixLayout" });

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

const siderStyle = computed(() => ({
  width: `${ctx.sidebarWidth.value}px`,
}));
</script>

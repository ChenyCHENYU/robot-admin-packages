<!--
 * @robot-admin/layout
 *
 * C_TopLayout - 顶部菜单布局骨架
 * 顶部导航栏 + 下方内容区域
 *
 * Slots:
 *   #logo        - Logo/品牌区域（导航栏左侧）
 *   #menu        - 水平菜单区域（导航栏中间）
 *   #header-extra - 导航栏右侧操作区（用户头像、设置等）
 *   #tags-view   - 标签页区域
 *   #default     - 页面内容（自动包含 RouterView + KeepAlive + Transition）
 *   #footer      - 页脚区域
-->
<template>
  <div class="c-top-layout" :class="themeClass">
    <!-- 顶部导航栏 -->
    <header class="c-top-layout__navbar" :style="navbarStyle">
      <div class="c-top-layout__navbar-left">
        <slot name="logo" />
      </div>
      <div class="c-top-layout__navbar-center">
        <slot name="menu" />
      </div>
      <div class="c-top-layout__navbar-right">
        <slot name="header-extra" />
      </div>
    </header>

    <!-- 标签页 -->
    <div
      v-if="ctx.showTagsView.value"
      class="c-top-layout__tags"
      :style="tagsStyle"
    >
      <slot name="tags-view" />
    </div>

    <!-- 内容区 -->
    <main class="c-top-layout__content">
      <RouterView v-slot="{ Component, route }">
        <Transition :name="ctx.transitionName.value" mode="out-in">
          <KeepAlive :include="cachedViews" :max="maxCacheCount">
            <component :is="Component" :key="route.path" />
          </KeepAlive>
        </Transition>
      </RouterView>
    </main>

    <!-- 页脚 -->
    <footer v-if="ctx.showFooter.value" class="c-top-layout__footer">
      <slot name="footer" />
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useLayoutContext } from "../../composables/useLayoutContext";
import { useLayoutCache } from "../../composables/useLayoutCache";

defineOptions({ name: "TopLayout" });

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

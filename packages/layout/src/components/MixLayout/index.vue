<!--
 * @robot-admin/layout
 *
 * C_MixLayout - 混合布局骨架
 * 左侧一级菜单图标栏 + 悬浮二级菜单 + 右侧内容
 *
 * Slots:
 *   #logo        - Logo 区域（一级菜单栏顶部）
 *   #first-menu  - 一级菜单区域（左侧窄栏，通常显示图标）
 *   #second-menu - 二级菜单区域（悬浮面板或固定侧栏）
 *   #header      - 头部区域
 *   #tags-view   - 标签页区域
 *   #default     - 页面内容（自动包含 RouterView + KeepAlive + Transition）
 *   #footer      - 页脚区域
-->
<template>
  <div class="c-mix-layout" :class="themeClass">
    <!-- 左侧一级菜单栏 -->
    <aside class="c-mix-layout__first-sider">
      <div class="c-mix-layout__logo">
        <slot name="logo" />
      </div>
      <div class="c-mix-layout__first-menu">
        <slot name="first-menu" />
      </div>
    </aside>

    <!-- 悬浮二级菜单 -->
    <div class="c-mix-layout__second-menu">
      <slot name="second-menu" />
    </div>

    <!-- 右侧主内容区 -->
    <div class="c-mix-layout__main">
      <!-- 头部 -->
      <header class="c-mix-layout__header" :style="headerStyle">
        <slot name="header" />
      </header>

      <!-- 标签页 -->
      <div
        v-if="ctx.showTagsView.value"
        class="c-mix-layout__tags"
        :style="tagsStyle"
      >
        <slot name="tags-view" />
      </div>

      <!-- 内容区 -->
      <main class="c-mix-layout__content">
        <RouterView v-slot="{ Component, route }">
          <Transition :name="ctx.transitionName.value" mode="out-in">
            <KeepAlive :include="cachedViews" :max="maxCacheCount">
              <component :is="Component" :key="route.path" />
            </KeepAlive>
          </Transition>
        </RouterView>
      </main>

      <!-- 页脚 -->
      <footer v-if="ctx.showFooter.value" class="c-mix-layout__footer">
        <slot name="footer" />
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useLayoutContext } from "../../composables/useLayoutContext";
import { useLayoutCache } from "../../composables/useLayoutCache";

defineOptions({ name: "MixLayout" });

const ctx = useLayoutContext();
const { cachedViews, maxCacheCount } = useLayoutCache();

const themeClass = computed(() =>
  ctx.isDark.value ? "dark-theme" : "light-theme",
);

const headerStyle = computed(() => ({
  height: `${ctx.headerHeight.value}px`,
}));

const tagsStyle = computed(() => ({
  height: `${ctx.tagsViewHeight.value}px`,
}));
</script>

<!--
 * @robot-admin/layout - TopLayout
 *
 * 顶部导航布局骨架
 * Logo+品牌 | 水平菜单 | 操作区 → 标签页 → 内容区 → 页脚
 *
 * Slots:
 *   #logo         - Logo/品牌区域
 *   #menu         - 水平菜单（默认使用 ResponsiveMenu）
 *   #header-extra - 头部右侧操作区
 *   #tags-view    - 标签页区域
 *   #footer       - 页脚区域
 -->
<template>
  <div class="top-layout-container">
    <!-- 顶部导航栏 -->
    <div
      class="top-navbar"
      :class="[isDarkMode ? 'dark-theme' : 'light-theme']"
    >
      <!-- 左侧：Logo 和品牌 -->
      <div class="navbar-left">
        <slot name="logo">
          <div class="logo-container">
            <div class="logo-glow"></div>
            <video
              v-if="brand.logoType === 'video'"
              :src="brand.logoSrc"
              :width="brand.logoSize || 36"
              :height="brand.logoSize || 36"
              autoplay
              loop
              muted
              playsinline
              class="logo-video"
            >
              您的浏览器不支持 video 标签。
            </video>
            <img
              v-else
              :src="brand.logoSrc"
              :width="brand.logoSize || 36"
              :height="brand.logoSize || 36"
              class="logo-video"
            />
          </div>
          <div class="brand-name">
            <span class="brand-title">{{ brand.name }}</span>
            <span class="brand-subtitle">{{ brand.subtitle }}</span>
          </div>
          <div class="navbar-divider"></div>
        </slot>
      </div>

      <!-- 中间：水平菜单 -->
      <div class="navbar-center">
        <slot name="menu">
          <ResponsiveMenu :data="menus" />
        </slot>
      </div>

      <!-- 右侧：操作区 -->
      <slot name="header-extra" />
    </div>

    <!-- 标签页区域 -->
    <div
      v-if="showTagsView"
      class="tags-view-container"
      :style="{ height: `${tagsViewHeight}px` }"
    >
      <slot name="tags-view" />
    </div>

    <!-- 主内容区域 -->
    <NLayout>
      <NLayoutContent class="main-content">
        <div class="page-content">
          <RouterView v-slot="{ Component, route }">
            <Transition :name="transitionName" mode="out-in">
              <KeepAlive :include="cachedViews" :max="maxCacheCount">
                <component :is="Component" :key="route.path" />
              </KeepAlive>
            </Transition>
          </RouterView>
        </div>
      </NLayoutContent>

      <!-- 页脚 -->
      <template v-if="showFooter">
        <slot name="footer" />
      </template>
    </NLayout>
  </div>
</template>

<script setup lang="ts">
import "./index.scss";
import { computed } from "vue";
import { NLayout, NLayoutContent } from "naive-ui";
import {
  useLayoutContext,
  DEFAULT_BRAND_CONFIG,
} from "../../../composables/useLayoutContext";
import { useLayoutCache } from "../../../composables/useLayoutCache";
import ResponsiveMenu from "../../ResponsiveMenu/index.vue";

defineOptions({ name: "TopLayout" });

const ctx = useLayoutContext();
const { cachedViews, maxCacheCount } = useLayoutCache();

const isDarkMode = ctx.isDark;
const menus = computed(() => ctx.menus.value);
const showTagsView = computed(() => ctx.showTagsView.value);
const tagsViewHeight = computed(() => ctx.tagsViewHeight.value);
const showFooter = computed(() => ctx.showFooter.value);
const transitionName = computed(() => ctx.transitionName.value);
const brand = { ...DEFAULT_BRAND_CONFIG, ...ctx.brand };
</script>

<!--
 * @robot-admin/layout - MixTopLayout
 *
 * 顶部混合布局骨架
 * 左侧一级菜单 + 顶部二级水平菜单 + 内容区
 *
 * Slots:
 *   #logo         - Logo/品牌区域（侧边栏顶部）
 *   #brand        - 顶部导航品牌区
 *   #top-menu     - 二级水平菜单（默认使用 ResponsiveMenu）
 *   #header-extra - 头部右侧操作区
 *   #tags-view    - 标签页区域
 *   #footer       - 页脚区域
 -->
<template>
  <div class="mix-top-layout-container">
    <!-- 左侧一级菜单 -->
    <div
      class="first-level-sidebar"
      :class="[isDarkMode ? 'dark-theme' : 'light-theme']"
    >
      <!-- Logo -->
      <div class="logo-container">
        <slot name="logo">
          <div class="logo-glow"></div>
          <video
            v-if="brand.logoType === 'video'"
            :src="brand.logoSrc"
            :width="brand.logoSize || 40"
            :height="brand.logoSize || 40"
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
            :width="brand.logoSize || 40"
            :height="brand.logoSize || 40"
            class="logo-video"
          />
        </slot>
      </div>

      <!-- 一级菜单列表 -->
      <div class="first-menu-list">
        <div
          v-for="item in menus"
          :key="item.path"
          class="first-menu-item"
          :class="{
            active: menuSplit.activeFirstMenu.value === item.path,
          }"
          @click="menuSplit.handleFirstMenuClick(item)"
        >
          <div class="menu-item-content">
            <component
              :is="LayoutIcon"
              v-if="item.meta?.icon"
              :name="item.meta.icon"
              :size="22"
            />
            <span v-else class="menu-item-text">{{
              (item.meta?.title || "")[0]
            }}</span>
          </div>
          <span class="menu-item-label">{{ item.meta?.title }}</span>
        </div>
      </div>
    </div>

    <!-- 右侧主区域 -->
    <div class="main-area">
      <!-- 顶部导航栏 -->
      <div
        class="top-navbar"
        :class="[isDarkMode ? 'dark-theme' : 'light-theme']"
      >
        <!-- 左侧：品牌 -->
        <div class="navbar-left">
          <slot name="brand">
            <div class="brand-name">
              <span class="brand-title">{{ brand.name }}</span>
              <span class="brand-subtitle">{{ brand.subtitle }}</span>
            </div>
            <div class="navbar-divider"></div>
          </slot>
        </div>

        <!-- 中间：二级水平菜单 -->
        <div class="navbar-center">
          <slot name="top-menu">
            <ResponsiveMenu
              v-if="menuSplit.currentSecondMenus.value.length > 0"
              :data="menuSplit.currentSecondMenus.value"
            />
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

      <!-- 内容区 -->
      <NLayout class="content-layout">
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

        <template v-if="showFooter">
          <slot name="footer" />
        </template>
      </NLayout>
    </div>
  </div>
</template>

<script setup lang="ts">
import "./index.scss";
import { computed, h, defineComponent } from "vue";
import { NLayout, NLayoutContent } from "naive-ui";
import {
  useLayoutContext,
  DEFAULT_BRAND_CONFIG,
} from "../../../composables/useLayoutContext";
import { useLayoutCache } from "../../../composables/useLayoutCache";
import { useMenuSplit } from "../../../composables/useMenuSplit";
import ResponsiveMenu from "../../ResponsiveMenu/index.vue";

defineOptions({ name: "MixTopLayout" });

const ctx = useLayoutContext();
const { cachedViews, maxCacheCount } = useLayoutCache();

const isDarkMode = ctx.isDark;
const menus = computed(() => ctx.menus.value);
const showTagsView = computed(() => ctx.showTagsView.value);
const tagsViewHeight = computed(() => ctx.tagsViewHeight.value);
const showFooter = computed(() => ctx.showFooter.value);
const transitionName = computed(() => ctx.transitionName.value);
const brand = { ...DEFAULT_BRAND_CONFIG, ...ctx.brand };

const menuSplit = useMenuSplit({
  menus: ctx.menus,
  floatingSecondMenu: computed(() => false),
});

const LayoutIcon =
  ctx.iconComponent ??
  defineComponent({
    name: "LayoutIcon",
    props: { name: String, size: { type: Number, default: 18 } },
    setup(props) {
      return () =>
        h("i", {
          class: props.name,
          style: {
            fontSize: `${props.size}px`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          },
        });
    },
  });
</script>

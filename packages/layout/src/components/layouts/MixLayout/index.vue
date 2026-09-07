<!--
 * @robot-admin/layout - C_MixLayout
 *
 * 混合布局骨架
 * 左侧一级菜单图标栏 + 悬浮二级菜单弹出面板 + 右侧内容区
 *
 * Slots:
 *   #logo    - Logo/品牌区域（侧边栏顶部）
 *   #header  - 头部区域
 *   #footer  - 页脚区域
 -->
<template>
  <div class="mix-layout-container">
    <!-- 左侧一级菜单 -->
    <div
      class="first-level-menu"
      :class="[isDarkMode ? 'dark-theme' : 'light-theme']"
    >
      <!-- Logo -->
      <div class="logo-container">
        <slot name="logo">
          <div class="logo-glow"></div>
          <video
            v-if="brand.logoType === 'video' && brand.logoSrc"
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
            v-else-if="brand.logoSrc"
            :src="brand.logoSrc"
            :width="brand.logoSize || 40"
            :height="brand.logoSize || 40"
            class="logo-video"
            :alt="brand.name || 'Logo'"
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
          role="button"
          :tabindex="item.disabled ? -1 : 0"
          :aria-disabled="item.disabled || undefined"
          @click="menuSplit.handleFirstMenuClick(item)"
          @keydown.enter="menuSplit.handleFirstMenuClick(item)"
          @keydown.space.prevent="menuSplit.handleFirstMenuClick(item)"
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

    <!-- 悬浮二级菜单 -->
    <Transition name="slide-fade">
      <div
        v-if="menuSplit.showSecondMenu.value"
        class="second-level-menu-popup"
        :class="[isDarkMode ? 'dark-theme' : 'light-theme']"
      >
        <div class="second-menu-header">
          <component
            :is="LayoutIcon"
            v-if="menuSplit.displayMenuItem.value?.meta?.icon"
            :name="menuSplit.displayMenuItem.value.meta.icon"
            :size="20"
          />
          <span class="menu-title">{{
            menuSplit.displayMenuItem.value?.meta?.title
          }}</span>
        </div>
        <div class="second-menu-list">
          <div
            v-for="child in menuSplit.displayMenuItem.value?.children || []"
            :key="child.path"
            class="second-menu-item"
            :class="{ active: menuSplit.isMenuItemActive(child.path) }"
            role="link"
            :tabindex="child.disabled ? -1 : 0"
            :aria-disabled="child.disabled || undefined"
            @click="menuSplit.handleSecondMenuClick(child)"
            @keydown.enter="menuSplit.handleSecondMenuClick(child)"
            @keydown.space.prevent="menuSplit.handleSecondMenuClick(child)"
          >
            <component
              :is="LayoutIcon"
              v-if="child.meta?.icon"
              :name="child.meta.icon"
              :size="16"
            />
            <span class="menu-item-label">{{ child.meta?.title }}</span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 右侧主内容区 -->
    <div class="main-layout">
      <slot name="header" />

      <NLayout>
        <NLayoutContent class="content-with-header p16px app-content">
          <LayoutRouterView />
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
import { computed } from "vue";
import { NLayout, NLayoutContent } from "naive-ui";
import {
  useLayoutContext,
  DEFAULT_BRAND_CONFIG,
} from "../../../composables/useLayoutContext";
import { useMenuSplit } from "../../../composables/useMenuSplit";
import LayoutRouterView from "../../LayoutRouterView/index.vue";
import { useLayoutIcon } from "../../../composables/useLayoutIcon";

defineOptions({ name: "C_MixLayout" });

const ctx = useLayoutContext();

const isDarkMode = ctx.isDark;
const menus = computed(() => ctx.menus.value);
const showFooter = computed(() => ctx.showFooter.value);
const brand = { ...DEFAULT_BRAND_CONFIG, ...ctx.brand };

const menuSplit = useMenuSplit({
  menus: ctx.menus,
  floatingSecondMenu: computed(() => true),
});

// 图标组件：优先使用消费方提供的，否则用 CSS class 渲染
const LayoutIcon = useLayoutIcon();
</script>

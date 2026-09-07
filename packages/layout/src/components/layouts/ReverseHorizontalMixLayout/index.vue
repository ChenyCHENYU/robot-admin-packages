<!--
 * @robot-admin/layout - C_ReverseHorizontalMixLayout
 *
 * 反转混合布局骨架
 * 顶部一级菜单 + 右侧二级菜单侧边栏 + 左侧内容区
 *
 * Slots:
 *   #logo         - Logo/品牌区域
 *   #top-menu     - 一级水平菜单（默认使用 ResponsiveMenu）
 *   #header-extra - 头部右侧操作区
 *   #tags-view    - 标签页区域
 *   #footer       - 页脚区域
 -->
<template>
  <div class="reverse-horizontal-mix-layout-container">
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
              v-if="brand.logoType === 'video' && brand.logoSrc"
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
              v-else-if="brand.logoSrc"
              :src="brand.logoSrc"
              :width="brand.logoSize || 36"
              :height="brand.logoSize || 36"
              class="logo-video"
              :alt="brand.name || 'Logo'"
            />
          </div>
          <div class="brand-name">
            <span class="brand-title">{{ brand.name }}</span>
            <span class="brand-subtitle">{{ brand.subtitle }}</span>
          </div>
          <div class="navbar-divider"></div>
        </slot>
      </div>

      <!-- 中间：一级水平菜单 -->
      <div class="navbar-center">
        <slot name="top-menu">
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

    <!-- 主区域：左侧内容 + 右侧菜单 -->
    <div class="main-area">
      <!-- 左侧：主内容区 -->
      <NLayout class="content-layout">
        <NLayoutContent class="main-content">
          <div class="page-content">
            <LayoutRouterView />
          </div>
        </NLayoutContent>

        <template v-if="showFooter">
          <slot name="footer" />
        </template>
      </NLayout>

      <!-- 右侧折叠/展开按钮 - 始终可见 -->
      <div
        v-if="menuSplit.currentSecondMenus.value.length > 0"
        class="sidebar-toggle"
        :class="[
          isDarkMode ? 'dark-theme' : 'light-theme',
          { active: !isCollapsed },
        ]"
        @click="toggleCollapse"
        role="button"
        tabindex="0"
        :aria-expanded="!isCollapsed"
        @keydown.enter="toggleCollapse"
        @keydown.space.prevent="toggleCollapse"
      >
        <span
          :class="[
            'collapse-arrow',
            'toggle-icon',
            isCollapsed ? 'collapsed' : 'expanded',
          ]"
        >
          <span class="arrow-line"></span>
          <span class="arrow-line"></span>
        </span>
      </div>

      <!-- 右侧：二级菜单侧边栏 -->
      <div
        v-if="menuSplit.currentSecondMenus.value.length > 0"
        class="right-sidebar-wrapper"
        :class="{ collapsed: isCollapsed }"
      >
        <div
          class="right-sidebar"
          :class="[isDarkMode ? 'dark-theme' : 'light-theme']"
        >
          <!-- 侧边栏标题 -->
          <div
            class="sidebar-header"
            :class="[isDarkMode ? 'dark-theme' : 'light-theme']"
          >
            <div class="header-icon">
              <component
                :is="LayoutIcon"
                v-if="menuSplit.activeFirstMenuItem.value?.meta?.icon"
                :name="menuSplit.activeFirstMenuItem.value.meta.icon"
                :size="20"
              />
            </div>
            <span class="header-title">{{
              menuSplit.activeFirstMenuItem.value?.meta?.title || "菜单"
            }}</span>
          </div>

          <!-- 二级菜单列表 -->
          <div class="sidebar-menu-list">
            <template
              v-for="child in menuSplit.currentSecondMenus.value"
              :key="child.path"
            >
              <!-- 有子菜单的项 -->
              <div
                v-if="child.children && child.children.length > 0"
                class="menu-group"
              >
                <div class="group-title">
                  <component
                    :is="LayoutIcon"
                    v-if="child.meta?.icon"
                    :name="child.meta.icon"
                    :size="16"
                  />
                  <span>{{ child.meta?.title }}</span>
                </div>
                <div
                  v-for="subChild in child.children"
                  :key="subChild.path"
                  class="menu-item sub-item"
                  :class="{
                    active: menuSplit.isMenuItemActive(subChild.path),
                  }"
                  role="button"
                  :tabindex="subChild.disabled ? -1 : 0"
                  :aria-disabled="subChild.disabled || undefined"
                  :aria-current="
                    menuSplit.isMenuItemActive(subChild.path)
                      ? 'page'
                      : undefined
                  "
                  @click="menuSplit.handleSecondMenuClick(subChild)"
                  @keydown.enter="menuSplit.handleSecondMenuClick(subChild)"
                  @keydown.space.prevent="
                    menuSplit.handleSecondMenuClick(subChild)
                  "
                >
                  <component
                    :is="LayoutIcon"
                    v-if="subChild.meta?.icon"
                    :name="subChild.meta.icon"
                    :size="16"
                  />
                  <span class="item-title">{{ subChild.meta?.title }}</span>
                </div>
              </div>
              <!-- 没有子菜单的项 -->
              <div
                v-else
                class="menu-item"
                :class="{
                  active: menuSplit.isMenuItemActive(child.path),
                }"
                role="button"
                :tabindex="child.disabled ? -1 : 0"
                :aria-disabled="child.disabled || undefined"
                :aria-current="
                  menuSplit.isMenuItemActive(child.path) ? 'page' : undefined
                "
                @click="menuSplit.handleSecondMenuClick(child)"
                @keydown.enter="menuSplit.handleSecondMenuClick(child)"
                @keydown.space.prevent="menuSplit.handleSecondMenuClick(child)"
              >
                <component
                  :is="LayoutIcon"
                  v-if="child.meta?.icon"
                  :name="child.meta.icon"
                  :size="18"
                />
                <span class="item-title">{{ child.meta?.title }}</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import "./index.scss";
import { ref, computed } from "vue";
import { NLayout, NLayoutContent } from "naive-ui";
import {
  useLayoutContext,
  DEFAULT_BRAND_CONFIG,
} from "../../../composables/useLayoutContext";
import { useMenuSplit } from "../../../composables/useMenuSplit";
import ResponsiveMenu from "../../ResponsiveMenu/index.vue";
import LayoutRouterView from "../../LayoutRouterView/index.vue";
import { useLayoutIcon } from "../../../composables/useLayoutIcon";

defineOptions({ name: "C_ReverseHorizontalMixLayout" });

const ctx = useLayoutContext();

const isDarkMode = ctx.isDark;
const menus = computed(() => ctx.menus.value);
const showTagsView = computed(() => ctx.showTagsView.value);
const tagsViewHeight = computed(() => ctx.tagsViewHeight.value);
const showFooter = computed(() => ctx.showFooter.value);
const brand = { ...DEFAULT_BRAND_CONFIG, ...ctx.brand };

const menuSplit = useMenuSplit({
  menus: ctx.menus,
  floatingSecondMenu: computed(() => false),
});

// 右侧边栏折叠状态
const isCollapsed = ref(false);
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};

const LayoutIcon = useLayoutIcon();
</script>

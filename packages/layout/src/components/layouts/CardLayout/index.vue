<!--
 * @robot-admin/layout - CardLayout
 *
 * 卡片式布局骨架
 * 顶部导航 + hover 触发抽屉式菜单 + 内容区
 *
 * Slots:
 *   #menu-trigger - 菜单触发区域（hover 弹出抽屉）
 *   #logo         - Logo/品牌区域
 *   #header-extra - 头部右侧操作区
 *   #tags-view    - 标签页区域
 *   #drawer-menu  - 抽屉式菜单内容
 *   #footer       - 页脚区域
 -->
<template>
  <div class="card-layout-container">
    <!-- 顶部导航栏 -->
    <div
      class="top-navbar"
      :class="[isDarkMode ? 'dark-theme' : 'light-theme']"
    >
      <div class="navbar-left">
        <!-- 悬停触发区域 -->
        <div
          class="hover-trigger-area"
          @mouseenter="cancelHideTimer"
          @mouseleave="hideDrawerMenu"
        >
          <slot name="menu-trigger">
            <div class="menu-indicator">
              <!-- 纯 CSS 三横线菜单图标 -->
              <span class="hamburger-icon">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </div>
          </slot>
        </div>

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

    <!-- 抽屉式菜单 -->
    <div
      class="drawer-menu"
      :class="[
        isDarkMode ? 'dark-theme' : 'light-theme',
        { visible: showDrawerMenu },
      ]"
      @mouseenter="cancelHideTimer"
      @mouseleave="hideDrawerMenu"
    >
      <slot name="drawer-menu">
        <!-- 菜单头部 -->
        <div class="drawer-header">
          <div class="drawer-title">
            <!-- 纯 CSS 网格图标 -->
            <span class="grid-icon">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </span>
            <span>功能导航</span>
          </div>
        </div>

        <!-- 菜单内容 - 阿里云风格铺开布局 -->
        <div class="drawer-content">
          <div class="menu-grid">
            <div
              v-for="category in menus"
              :key="category.path"
              class="menu-category"
            >
              <!-- 分类标题 -->
              <div class="category-header" @click="navigateToPage(category)">
                <component
                  :is="LayoutIcon"
                  v-if="category.meta?.icon"
                  :name="category.meta.icon"
                  :size="18"
                />
                <span>{{ category.meta?.title }}</span>
              </div>

              <!-- 分类下的菜单项 -->
              <div
                class="category-items"
                v-if="category.children && category.children.length > 0"
              >
                <div
                  v-for="item in category.children"
                  :key="item.path"
                  class="menu-item"
                  @click="navigateToPage(item)"
                >
                  <component
                    :is="LayoutIcon"
                    v-if="item.meta?.icon"
                    :name="item.meta.icon"
                    :size="16"
                  />
                  <span class="item-title">{{ item.meta?.title }}</span>
                </div>

                <!-- 3级菜单项 -->
                <template
                  v-for="item in category.children"
                  :key="'sub-' + item.path"
                >
                  <div
                    v-if="item.children && item.children.length > 0"
                    class="submenu-items"
                  >
                    <div class="submenu-title">{{ item.meta?.title }}</div>
                    <div
                      v-for="subItem in item.children"
                      :key="subItem.path"
                      class="menu-item submenu-item"
                      @click="navigateToPage(subItem)"
                    >
                      <component
                        :is="LayoutIcon"
                        v-if="subItem.meta?.icon"
                        :name="subItem.meta.icon"
                        :size="14"
                      />
                      <span class="item-title">{{ subItem.meta?.title }}</span>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </slot>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content-area">
      <NLayout class="content-layout">
        <NLayoutContent class="main-content p16px app-content">
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
import { ref, computed, onUnmounted, h, defineComponent } from "vue";
import { useRouter } from "vue-router";
import { NLayout, NLayoutContent } from "naive-ui";
import {
  useLayoutContext,
  DEFAULT_BRAND_CONFIG,
} from "../../../composables/useLayoutContext";
import { useLayoutCache } from "../../../composables/useLayoutCache";
import type { MenuOptions } from "../../../types/menu";

defineOptions({ name: "CardLayout" });

const ctx = useLayoutContext();
const { cachedViews, maxCacheCount } = useLayoutCache();
const router = useRouter();

const isDarkMode = ctx.isDark;
const menus = computed(() => ctx.menus.value);
const showTagsView = computed(() => ctx.showTagsView.value);
const tagsViewHeight = computed(() => ctx.tagsViewHeight.value);
const showFooter = computed(() => ctx.showFooter.value);
const transitionName = computed(() => ctx.transitionName.value);
const brand = { ...DEFAULT_BRAND_CONFIG, ...ctx.brand };

// 抽屉菜单状态
const showDrawerMenu = ref(false);
const hideTimer = ref<ReturnType<typeof setTimeout> | null>(null);

const hideDrawerMenu = () => {
  if (hideTimer.value) clearTimeout(hideTimer.value);
  hideTimer.value = setTimeout(() => {
    showDrawerMenu.value = false;
  }, 300);
};

const cancelHideTimer = () => {
  if (hideTimer.value) {
    clearTimeout(hideTimer.value);
    hideTimer.value = null;
  }
  showDrawerMenu.value = true;
};

const navigateToPage = (item: MenuOptions) => {
  if (item.path) {
    router.push(item.path);
    showDrawerMenu.value = false;
  }
};

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

onUnmounted(() => {
  if (hideTimer.value) clearTimeout(hideTimer.value);
});
</script>

<style scoped lang="scss">
/* 纯 CSS 网格图标 (2x2) */
.grid-icon {
  display: inline-grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2.5px;
  width: 18px;
  height: 18px;
  padding: 1px;
}

.grid-icon span {
  background-color: currentColor;
  border-radius: 2px;
  opacity: 0.85;
}

/* 纯 CSS 三横线汉堡菜单图标 */
.hamburger-icon {
  display: inline-flex;
  flex-direction: column;
  justify-content: space-between;
  width: 20px;
  height: 16px;
  padding: 2px 0;
}

.hamburger-icon span {
  display: block;
  width: 100%;
  height: 2px;
  background-color: currentColor;
  border-radius: 1px;
  opacity: 0.85;
  transition: all 0.2s ease;
}
</style>

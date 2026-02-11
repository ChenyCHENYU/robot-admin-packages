<!--
 * @robot-admin/layout
 *
 * C_LayoutContainer - 智能布局容器
 * 根据 layoutMode 自动切换 6 种布局骨架
 * 内置品牌 Logo、菜单拆分、响应式菜单、抽屉菜单等默认实现
 * 消费方仅需提供业务组件（菜单、头部、标签页、页脚）
 *
 * 支持的 slot（均可覆盖内置默认实现）:
 *   #logo         - 品牌 Logo 区域（默认：BrandLogo）
 *   #menu         - Side 布局的垂直菜单（需消费方提供）
 *   #header       - Side/Mix 布局的完整头部（需消费方提供）
 *   #header-extra - Top/MixTop/Reverse/Card 的头部右侧区域（需消费方提供）
 *   #tags-view    - 标签页区域（需消费方提供）
 *   #footer       - 页脚区域（需消费方提供）
 *   #top-menu     - 水平菜单（默认：ResponsiveMenu）
 *   #first-menu   - Mix/MixTop 一级图标菜单（默认：IconMenu）
 *   #second-menu  - Mix 悬浮二级菜单（默认：FloatingMenu）
 *   #brand        - MixTop 品牌信息区（默认：品牌名+分隔线）
 *   #side-menu    - Reverse 右侧二级侧边栏（默认：SideMenu）
 *   #menu-trigger - Card 菜单触发区域（默认：MenuTrigger）
 *   #drawer-menu  - Card 抽屉式菜单（默认：DrawerMenu）
-->
<template>
  <div :class="['layout-container', isDark ? 'dark-mode' : 'light-mode']">
    <!-- ═══════ Side 左侧菜单布局 ═══════ -->
    <SideLayout v-if="layoutMode === 'side'" v-model:collapsed="sideCollapsed">
      <template #logo>
        <slot name="logo">
          <BrandLogo show-name :size="36" :collapsed="sideCollapsed" />
        </slot>
      </template>
      <template #menu>
        <slot name="menu" :collapsed="sideCollapsed" />
      </template>
      <template #header>
        <slot name="header" />
      </template>
      <!-- Side 布局不传 tags-view：C_Header 已内置 TagsView -->
      <template #tags-view />
      <template #footer>
        <slot name="footer" />
      </template>
    </SideLayout>

    <!-- ═══════ Top 顶部菜单布局 ═══════ -->
    <TopLayout v-else-if="layoutMode === 'top'">
      <template #logo>
        <slot name="logo">
          <BrandLogo show-name show-divider :size="36" />
        </slot>
      </template>
      <template #menu>
        <slot name="top-menu">
          <ResponsiveMenu :data="ctx.menus.value" />
        </slot>
      </template>
      <template #header-extra>
        <slot name="header-extra" />
      </template>
      <template #tags-view>
        <slot name="tags-view" />
      </template>
      <template #footer>
        <slot name="footer" />
      </template>
    </TopLayout>

    <!-- ═══════ Mix 混合布局（左侧一级 + 悬浮二级）═══════ -->
    <MixLayout v-else-if="layoutMode === 'mix'">
      <template #logo>
        <slot name="logo">
          <BrandLogo :size="40" />
        </slot>
      </template>
      <template #first-menu>
        <slot name="first-menu">
          <IconMenu
            :menus="ctx.menus.value"
            :active="menuSplit.activeFirstMenu.value"
            @click="menuSplit.handleFirstMenuClick"
          />
        </slot>
      </template>
      <template #second-menu>
        <slot name="second-menu">
          <FloatingMenu
            :show="menuSplit.showSecondMenu.value"
            :menu-item="menuSplit.hoveredMenuItem.value"
            :is-active="menuSplit.isMenuItemActive"
            @click="menuSplit.handleSecondMenuClick"
          />
        </slot>
      </template>
      <template #header>
        <slot name="header" />
      </template>
      <!-- Mix 布局不传 tags-view：C_Header 已内置 TagsView -->
      <template #tags-view />
      <template #footer>
        <slot name="footer" />
      </template>
    </MixLayout>

    <!-- ═══════ MixTop 顶部混合布局（侧边优先）═══════ -->
    <MixTopLayout v-else-if="layoutMode === 'mix-top'">
      <template #logo>
        <slot name="logo">
          <BrandLogo :size="40" />
        </slot>
      </template>
      <template #first-menu>
        <slot name="first-menu">
          <IconMenu
            :menus="ctx.menus.value"
            :active="menuSplit.activeFirstMenu.value"
            @click="menuSplit.handleFirstMenuClick"
          />
        </slot>
      </template>
      <template #brand>
        <slot name="brand">
          <div class="brand-name">
            <span class="brand-title">{{ brand.name }}</span>
            <span class="brand-subtitle">{{ brand.subtitle }}</span>
          </div>
          <div class="navbar-divider"></div>
        </slot>
      </template>
      <template #top-menu>
        <slot name="top-menu">
          <ResponsiveMenu
            v-if="menuSplit.currentSecondMenus.value.length > 0"
            :data="menuSplit.currentSecondMenus.value"
          />
        </slot>
      </template>
      <template #header-extra>
        <slot name="header-extra" />
      </template>
      <template #tags-view>
        <slot name="tags-view" />
      </template>
      <template #footer>
        <slot name="footer" />
      </template>
    </MixTopLayout>

    <!-- ═══════ ReverseHorizontalMix 反转混合布局 ═══════ -->
    <ReverseHorizontalMixLayout
      v-else-if="layoutMode === 'reverse-horizontal-mix'"
    >
      <template #logo>
        <slot name="logo">
          <BrandLogo show-name show-divider :size="36" />
        </slot>
      </template>
      <template #top-menu>
        <slot name="top-menu">
          <ResponsiveMenu :data="ctx.menus.value" />
        </slot>
      </template>
      <template #header-extra>
        <slot name="header-extra" />
      </template>
      <template #tags-view>
        <slot name="tags-view" />
      </template>
      <template #side-menu>
        <slot name="side-menu">
          <SideMenu
            :menus="menuSplit.currentSecondMenus.value"
            :active-item="menuSplit.activeFirstMenuItem.value"
            :is-active="menuSplit.isMenuItemActive"
            @click="menuSplit.handleSecondMenuClick"
          />
        </slot>
      </template>
      <template #footer>
        <slot name="footer" />
      </template>
    </ReverseHorizontalMixLayout>

    <!-- ═══════ CardLayout 卡片布局 ═══════ -->
    <CardLayout v-else-if="layoutMode === 'card-layout'">
      <template #menu-trigger>
        <slot name="menu-trigger">
          <MenuTrigger v-model:show="showDrawerMenu" />
        </slot>
      </template>
      <template #logo>
        <slot name="logo">
          <BrandLogo show-name show-divider :size="36" />
        </slot>
      </template>
      <template #header-extra>
        <slot name="header-extra" />
      </template>
      <template #tags-view>
        <slot name="tags-view" />
      </template>
      <template #drawer-menu>
        <slot name="drawer-menu">
          <DrawerMenu :menus="ctx.menus.value" v-model:show="showDrawerMenu" />
        </slot>
      </template>
      <template #footer>
        <slot name="footer" />
      </template>
    </CardLayout>

    <!-- ═══════ Fallback ═══════ -->
    <div v-else class="layout-coming-soon">
      <div class="coming-soon-content">
        <div class="coming-soon-icon">🚧</div>
        <div class="coming-soon-title">
          <slot name="fallback-title">Layout in development</slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, provide, onUnmounted } from "vue";
import { useSettingsStore } from "../../stores/settings";
import {
  useLayoutContext,
  DEFAULT_BRAND_CONFIG,
  DRAWER_HANDLER_KEY,
} from "../../composables/useLayoutContext";
import { useMenuSplit } from "../../composables/useMenuSplit";

// 骨架布局全局样式（flex 定位、侧边栏 fixed、内容区 flex:1 等）
import "../../styles/layouts.scss";

// 骨架组件（内部，无 C_ 前缀）
import SideLayout from "../SideLayout/index.vue";
import TopLayout from "../TopLayout/index.vue";
import MixLayout from "../MixLayout/index.vue";
import MixTopLayout from "../MixTopLayout/index.vue";
import ReverseHorizontalMixLayout from "../ReverseHorizontalMixLayout/index.vue";
import CardLayout from "../CardLayout/index.vue";

// 内置子组件（无 C_ 前缀）
import BrandLogo from "../BrandLogo/index.vue";
import IconMenu from "../IconMenu/index.vue";
import FloatingMenu from "../FloatingMenu/index.vue";
import SideMenu from "../SideMenu/index.vue";
import DrawerMenu from "../DrawerMenu/index.vue";
import MenuTrigger from "../MenuTrigger/index.vue";
import ResponsiveMenu from "../ResponsiveMenu/index.vue";

defineOptions({ name: "C_LayoutContainer" });

const settingsStore = useSettingsStore();
const ctx = useLayoutContext();

const layoutMode = computed(() => settingsStore.layoutMode);
const isDark = ctx.isDark;
const brand = { ...DEFAULT_BRAND_CONFIG, ...ctx.brand };

// ============ Side 布局：折叠状态 ============
const sideCollapsed = ref(false);

// 提供折叠状态给子组件（如 C_Header 的汉堡按钮）
provide("menuCollapse", {
  isCollapsed: sideCollapsed,
  handleCollapsedChange: (collapsed: boolean) => {
    sideCollapsed.value = collapsed;
  },
});

// ============ 菜单拆分（Mix / MixTop / Reverse 共用）============
const menuSplit = useMenuSplit({
  menus: ctx.menus,
  floatingSecondMenu: computed(() => layoutMode.value === "mix"),
});

// ============ Card 布局：抽屉状态 + 统一定时器 ============
const showDrawerMenu = ref(false);
const _drawerHideTimer = ref<ReturnType<typeof setTimeout> | null>(null);

const drawerHandlers = {
  show: () => {
    if (_drawerHideTimer.value) {
      clearTimeout(_drawerHideTimer.value);
      _drawerHideTimer.value = null;
    }
    showDrawerMenu.value = true;
  },
  startHide: () => {
    if (_drawerHideTimer.value) clearTimeout(_drawerHideTimer.value);
    _drawerHideTimer.value = setTimeout(() => {
      showDrawerMenu.value = false;
    }, 300);
  },
  hide: () => {
    if (_drawerHideTimer.value) {
      clearTimeout(_drawerHideTimer.value);
      _drawerHideTimer.value = null;
    }
    showDrawerMenu.value = false;
  },
};

provide(DRAWER_HANDLER_KEY, drawerHandlers);

onUnmounted(() => {
  if (_drawerHideTimer.value) clearTimeout(_drawerHideTimer.value);
});
</script>

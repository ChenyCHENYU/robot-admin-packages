<!--
 * @robot-admin/layout - C_LayoutContainer
 *
 * 智能布局容器
 * 根据 layoutMode 自动切换 6 种布局骨架，消费方仅需提供业务组件
 *
 * Slots:
 *   #logo         - 品牌 Logo 区域（各骨架有内置默认实现）
 *   #menu         - Side 布局的垂直菜单（需消费方提供）
 *   #header       - Side/Mix 布局的完整头部（需消费方提供）
 *   #header-extra - Top/MixTop/Reverse/Card 头部右侧操作区
 *   #tags-view    - 标签页区域（需消费方提供）
 *   #footer       - 页脚区域（需消费方提供）
 *   #top-menu     - Top/MixTop/Reverse 水平菜单（骨架有默认）
 *   #brand        - MixTop 顶部导航品牌区（骨架有默认）
 *   #menu-trigger - Card 菜单触发区域（骨架有默认）
 *   #drawer-menu  - Card 抽屉式菜单（骨架有默认）
 -->
<template>
  <div :class="['layout-container', isDark ? 'dark-mode' : 'light-mode']">
    <!-- ═══════ Side 左侧菜单布局 ═══════ -->
    <SideLayout v-if="layoutMode === 'side'" v-model:collapsed="sideCollapsed">
      <template v-if="$slots.logo" #logo><slot name="logo" /></template>
      <template #menu>
        <slot name="menu" :collapsed="sideCollapsed" />
      </template>
      <template #header><slot name="header" /></template>
      <template #footer><slot name="footer" /></template>
    </SideLayout>

    <!-- ═══════ Top 顶部菜单布局 ═══════ -->
    <TopLayout v-else-if="layoutMode === 'top'">
      <template v-if="$slots.logo" #logo><slot name="logo" /></template>
      <template v-if="$slots['top-menu']" #menu
        ><slot name="top-menu"
      /></template>
      <template v-if="$slots['header-extra']" #header-extra
        ><slot name="header-extra"
      /></template>
      <template v-if="$slots['tags-view']" #tags-view
        ><slot name="tags-view"
      /></template>
      <template v-if="$slots.footer" #footer><slot name="footer" /></template>
    </TopLayout>

    <!-- ═══════ Mix 混合布局 ═══════ -->
    <MixLayout v-else-if="layoutMode === 'mix'">
      <template v-if="$slots.logo" #logo><slot name="logo" /></template>
      <template #header><slot name="header" /></template>
      <template v-if="$slots.footer" #footer><slot name="footer" /></template>
    </MixLayout>

    <!-- ═══════ MixTop 顶部混合布局 ═══════ -->
    <MixTopLayout v-else-if="layoutMode === 'mix-top'">
      <template v-if="$slots.logo" #logo><slot name="logo" /></template>
      <template v-if="$slots.brand" #brand><slot name="brand" /></template>
      <template v-if="$slots['top-menu']" #top-menu
        ><slot name="top-menu"
      /></template>
      <template v-if="$slots['header-extra']" #header-extra
        ><slot name="header-extra"
      /></template>
      <template v-if="$slots['tags-view']" #tags-view
        ><slot name="tags-view"
      /></template>
      <template v-if="$slots.footer" #footer><slot name="footer" /></template>
    </MixTopLayout>

    <!-- ═══════ ReverseHorizontalMix 反转混合布局 ═══════ -->
    <ReverseHorizontalMixLayout
      v-else-if="layoutMode === 'reverse-horizontal-mix'"
    >
      <template v-if="$slots.logo" #logo><slot name="logo" /></template>
      <template v-if="$slots['top-menu']" #top-menu
        ><slot name="top-menu"
      /></template>
      <template v-if="$slots['header-extra']" #header-extra
        ><slot name="header-extra"
      /></template>
      <template v-if="$slots['tags-view']" #tags-view
        ><slot name="tags-view"
      /></template>
      <template v-if="$slots.footer" #footer><slot name="footer" /></template>
    </ReverseHorizontalMixLayout>

    <!-- ═══════ CardLayout 卡片布局 ═══════ -->
    <CardLayout v-else-if="layoutMode === 'card-layout'">
      <template v-if="$slots['menu-trigger']" #menu-trigger
        ><slot name="menu-trigger"
      /></template>
      <template v-if="$slots.logo" #logo><slot name="logo" /></template>
      <template v-if="$slots['header-extra']" #header-extra
        ><slot name="header-extra"
      /></template>
      <template v-if="$slots['tags-view']" #tags-view
        ><slot name="tags-view"
      /></template>
      <template v-if="$slots['drawer-menu']" #drawer-menu
        ><slot name="drawer-menu"
      /></template>
      <template v-if="$slots.footer" #footer><slot name="footer" /></template>
    </CardLayout>

    <!-- ═══════ Fallback ═══════ -->
    <div v-else class="layout-coming-soon">
      <div class="coming-soon-content">
        <div class="coming-soon-icon">🚧</div>
        <div class="coming-soon-title">布局开发中</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, provide } from "vue";
import { useSettingsStore } from "../../stores/settings";
import { useLayoutContext } from "../../composables/useLayoutContext";

// 骨架布局全局样式
import "../../styles/layouts.scss";

// 骨架组件
import SideLayout from "../layouts/SideLayout/index.vue";
import TopLayout from "../layouts/TopLayout/index.vue";
import MixLayout from "../layouts/MixLayout/index.vue";
import MixTopLayout from "../layouts/MixTopLayout/index.vue";
import ReverseHorizontalMixLayout from "../layouts/ReverseHorizontalMixLayout/index.vue";
import CardLayout from "../layouts/CardLayout/index.vue";

defineOptions({ name: "C_LayoutContainer" });

const settingsStore = useSettingsStore();
const ctx = useLayoutContext();

const layoutMode = computed(() => settingsStore.layoutMode);
const isDark = ctx.isDark;

// Side 布局折叠状态
const sideCollapsed = ref(false);

// 提供折叠状态给子组件（如 C_Header 的汉堡按钮）
provide("menuCollapse", {
  isCollapsed: sideCollapsed,
  handleCollapsedChange: (collapsed: boolean) => {
    sideCollapsed.value = collapsed;
  },
});
</script>

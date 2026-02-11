<!--
 * @robot-admin/layout
 *
 * C_SideLayout - 左侧菜单布局骨架
 * 经典的左侧导航 + 右侧内容布局
 *
 * Slots:
 *   #logo    - Logo/品牌区域（侧边栏顶部）
 *   #menu    - 垂直菜单区域（侧边栏）
 *   #header  - 头部区域（含面包屑、导航栏右侧操作等）
 *   #tags-view - 标签页区域
 *   #default - 页面内容（自动包含 RouterView + KeepAlive + Transition）
 *   #footer  - 页脚区域
-->
<template>
  <div class="c-side-layout" :class="themeClass">
    <!-- 侧边栏 -->
    <aside
      class="c-side-layout__sider"
      :class="{ 'is-collapsed': collapsed }"
      :style="siderStyle"
    >
      <div class="c-side-layout__logo">
        <slot name="logo" />
      </div>
      <div class="c-side-layout__menu">
        <slot name="menu" />
      </div>
    </aside>

    <!-- 主区域 -->
    <div class="c-side-layout__main" :style="mainStyle">
      <!-- 头部 -->
      <header
        v-if="ctx.fixedHeader.value"
        class="c-side-layout__header"
        :style="headerStyle"
      >
        <slot name="header" />
      </header>

      <!-- 标签页 -->
      <div
        v-if="ctx.showTagsView.value"
        class="c-side-layout__tags"
        :style="tagsStyle"
      >
        <slot name="tags-view" />
      </div>

      <!-- 内容区 -->
      <main class="c-side-layout__content">
        <RouterView v-slot="{ Component, route }">
          <Transition :name="ctx.transitionName.value" mode="out-in">
            <KeepAlive :include="cachedViews" :max="maxCacheCount">
              <component :is="Component" :key="route.path" />
            </KeepAlive>
          </Transition>
        </RouterView>
      </main>

      <!-- 页脚 -->
      <footer v-if="ctx.showFooter.value" class="c-side-layout__footer">
        <slot name="footer" />
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useLayoutContext } from "../../composables/useLayoutContext";
import { useLayoutCache } from "../../composables/useLayoutCache";

defineOptions({ name: "SideLayout" });

const props = withDefaults(
  defineProps<{
    /** 控制侧边栏折叠状态 (支持 v-model:collapsed) */
    collapsed?: boolean;
  }>(),
  { collapsed: false },
);

const emit = defineEmits<{
  "update:collapsed": [value: boolean];
}>();

const ctx = useLayoutContext();
const { cachedViews, maxCacheCount } = useLayoutCache();

// 内部折叠状态，与 prop 双向同步
const _collapsed = ref(props.collapsed);
watch(
  () => props.collapsed,
  (v) => {
    _collapsed.value = v;
  },
);

const collapsed = computed(() => _collapsed.value);

const themeClass = computed(() =>
  ctx.isDark.value ? "dark-theme" : "light-theme",
);

const siderStyle = computed(() => ({
  width: _collapsed.value
    ? `${ctx.sidebarCollapsedWidth.value}px`
    : `${ctx.sidebarWidth.value}px`,
}));

const mainStyle = computed(() => ({
  marginLeft: _collapsed.value
    ? `${ctx.sidebarCollapsedWidth.value}px`
    : `${ctx.sidebarWidth.value}px`,
}));

const headerStyle = computed(() => ({
  height: `${ctx.headerHeight.value}px`,
}));

const tagsStyle = computed(() => ({
  height: `${ctx.tagsViewHeight.value}px`,
}));

// 折叠切换，同时通知父组件
const toggleCollapse = () => {
  _collapsed.value = !_collapsed.value;
  emit("update:collapsed", _collapsed.value);
};

defineExpose({
  collapsed,
  toggleCollapse,
});
</script>

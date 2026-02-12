<!--
 * @robot-admin/layout
 *
 * C_SideLayout - 左侧菜单布局骨架
 * 经典的左侧导航 + 右侧内容布局
 * 使用 Naive UI 的 NLayout/NLayoutSider 保持与主项目样式一致
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
  <NLayout has-sider>
    <NLayoutSider
      bordered
      collapse-mode="width"
      :collapsed-width="ctx.sidebarCollapsedWidth.value"
      :width="ctx.sidebarWidth.value"
      :native-scrollbar="false"
      :collapsed="collapsed"
      @update:collapsed="handleCollapsedUpdate"
      :class="[
        'layout-sider',
        'no-horizontal-scroll',
        ctx.isDark.value ? 'dark-theme' : 'light-theme',
      ]"
    >
      <slot name="logo" />
      <slot name="menu" :collapsed="collapsed" />
    </NLayoutSider>

    <NLayout>
      <slot name="header" />

      <NLayoutContent class="content-with-header p16px app-content">
        <RouterView v-slot="{ Component, route }">
          <Transition :name="ctx.transitionName.value" mode="out-in">
            <KeepAlive :include="cachedViews" :max="maxCacheCount">
              <component :is="Component" :key="route.path" />
            </KeepAlive>
          </Transition>
        </RouterView>
      </NLayoutContent>

      <slot name="footer" />
    </NLayout>
  </NLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NLayout, NLayoutSider, NLayoutContent } from "naive-ui";
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

const handleCollapsedUpdate = (val: boolean) => {
  _collapsed.value = val;
  emit("update:collapsed", val);
};

// 折叠切换
const toggleCollapse = () => {
  const next = !_collapsed.value;
  _collapsed.value = next;
  emit("update:collapsed", next);
};

defineExpose({
  collapsed,
  toggleCollapse,
});
</script>

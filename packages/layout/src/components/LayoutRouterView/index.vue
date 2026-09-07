<!-- UI 框架无关的路由内容、过渡与 KeepAlive 统一边界。 -->
<template>
  <RouterView v-slot="{ Component, route }">
    <Transition :name="ctx.transitionName.value" mode="out-in">
      <KeepAlive :include="cachedViews" :max="maxCacheCount">
        <component :is="Component" :key="route.path" />
      </KeepAlive>
    </Transition>
  </RouterView>
</template>

<script setup lang="ts">
import { useLayoutCache } from "../../composables/useLayoutCache";
import { useLayoutContext } from "../../composables/useLayoutContext";

defineOptions({ name: "LayoutRouterView" });

const ctx = useLayoutContext();
const { cachedViews, maxCacheCount } = useLayoutCache();
</script>

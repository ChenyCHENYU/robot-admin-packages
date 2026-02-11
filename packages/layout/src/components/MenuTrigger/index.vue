<!--
 * @robot-admin/layout
 *
 * MenuTrigger - 菜单触发区域
 * 用于 CardLayout 的 hover 触发抽屉式菜单
 * 使用共享的 drawer 控制器避免与 DrawerMenu 定时器竞争
-->
<template>
  <div
    class="menu-trigger"
    @mouseenter="handlers.show()"
    @mouseleave="handlers.startHide()"
  >
    <div class="menu-trigger__indicator">
      <i class="i-ri:menu-3-line"></i>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from "vue";
import {
  DRAWER_HANDLER_KEY,
  type DrawerHandlers,
} from "../../composables/useLayoutContext";

defineOptions({ name: "MenuTrigger" });

defineProps<{
  show?: boolean;
}>();

// 使用共享控制器（由 C_LayoutContainer provide）
const handlers = inject<DrawerHandlers>(DRAWER_HANDLER_KEY, {
  show: () => {},
  startHide: () => {},
  hide: () => {},
});
</script>

<style scoped>
.menu-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  height: 100%;
  cursor: pointer;
}

.menu-trigger__indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  font-size: 18px;
  transition: all 0.25s ease;
  opacity: 0.6;
}

.menu-trigger__indicator:hover {
  opacity: 1;
  background: rgba(99, 102, 241, 0.08);
}
</style>

<!--
 * @robot-admin/layout - DrawerMenu
 *
 * 抽屉式网格菜单
 * 用于 CardLayout 的 hover 触发的抽屉式功能导航
 -->
<template>
  <div
    class="drawer-menu"
    :class="[
      ctx.isDark.value ? 'dark-theme' : 'light-theme',
      { visible: show },
    ]"
    @mouseenter="handlers.show()"
    @mouseleave="handlers.startHide()"
  >
    <div class="drawer-menu__header">
      <div class="drawer-menu__title">
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

    <div class="drawer-menu__content">
      <div class="drawer-menu__grid">
        <div
          v-for="category in menus"
          :key="category.path"
          class="drawer-menu__category"
        >
          <div class="drawer-menu__category-header" @click="navigate(category)">
            <component
              :is="ctx.iconComponent"
              v-if="ctx.iconComponent && category.meta?.icon"
              :name="category.meta.icon"
              :size="18"
            />
            <span>{{ category.meta?.title }}</span>
          </div>

          <div
            v-if="category.children && category.children.length > 0"
            class="drawer-menu__items"
          >
            <div
              v-for="item in category.children"
              :key="item.path"
              class="drawer-menu__item"
              @click="navigate(item)"
            >
              <component
                :is="ctx.iconComponent"
                v-if="ctx.iconComponent && item.meta?.icon"
                :name="item.meta.icon"
                :size="16"
              />
              <span class="drawer-menu__item-text">{{ item.meta?.title }}</span>
            </div>

            <template v-for="item in category.children" :key="item.path">
              <div
                v-if="item.children && item.children.length > 0"
                class="drawer-menu__sub-items"
              >
                <div class="drawer-menu__sub-title">
                  {{ item.meta?.title }}
                </div>
                <div
                  v-for="subItem in item.children"
                  :key="subItem.path"
                  class="drawer-menu__item drawer-menu__item--sub"
                  @click="navigate(subItem)"
                >
                  <component
                    :is="ctx.iconComponent"
                    v-if="ctx.iconComponent && subItem.meta?.icon"
                    :name="subItem.meta.icon"
                    :size="14"
                  />
                  <span class="drawer-menu__item-text">{{
                    subItem.meta?.title
                  }}</span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from "vue";
import { useRouter } from "vue-router";
import type { MenuOptions } from "../../types/menu";
import { useLayoutContext } from "../../composables/useLayoutContext";
import {
  DRAWER_HANDLER_KEY,
  type DrawerHandlers,
} from "../../composables/useLayoutContext";

defineOptions({ name: "DrawerMenu" });

defineProps<{
  /** 菜单数据 */
  menus: MenuOptions[];
  /** 是否显示 */
  show: boolean;
}>();

const ctx = useLayoutContext();
const router = useRouter();

// 使用共享的 drawer 控制器（由 C_LayoutContainer provide）
const handlers = inject<DrawerHandlers>(DRAWER_HANDLER_KEY, {
  show: () => {},
  startHide: () => {},
  hide: () => {},
});

const navigate = (item: MenuOptions) => {
  if (item.path) {
    router.push(item.path);
    handlers.hide();
  }
};
</script>

<style scoped>
.drawer-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 100;
  max-height: 60vh;
  overflow-y: auto;
  opacity: 0;
  transform: translateY(-8px);
  pointer-events: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 16px;
}

.drawer-menu.visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: all;
}

.drawer-menu.light-theme {
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-top: none;
}

.drawer-menu.dark-theme {
  background: rgba(30, 30, 36, 0.96);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-top: none;
}

.drawer-menu__header {
  padding: 16px 24px 8px;
}

.drawer-menu__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
}

.drawer-menu__content {
  padding: 8px 24px 20px;
}

.drawer-menu__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.drawer-menu__category {
  padding: 0;
}

.drawer-menu__category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.drawer-menu__category-header:hover {
  background: rgba(99, 102, 241, 0.06);
}

.drawer-menu__items {
  padding-left: 8px;
}

.drawer-menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  margin: 1px 0;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.drawer-menu__item:hover {
  background: rgba(99, 102, 241, 0.08);
  color: #667eea;
}

.drawer-menu__item--sub {
  padding-left: 16px;
  font-size: 12px;
}

.drawer-menu__item-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer-menu__sub-items {
  padding: 4px 0;
}

.drawer-menu__sub-title {
  padding: 4px 12px;
  font-size: 11px;
  font-weight: 600;
  opacity: 0.4;
}

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
</style>

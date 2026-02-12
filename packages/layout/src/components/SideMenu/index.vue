<!--
 * @robot-admin/layout - SideMenu
 *
 * 右侧二级菜单侧边栏
 * 用于 ReverseHorizontalMixLayout 的右侧二级菜单
 -->
<template>
  <template v-if="menus.length > 0">
    <!-- 折叠/展开按钮 -->
    <div
      class="side-menu-toggle"
      :class="[
        ctx.isDark.value ? 'dark-theme' : 'light-theme',
        { active: !isCollapsed },
      ]"
      @click="isCollapsed = !isCollapsed"
    >
      <i
        :class="[
          'toggle-icon',
          isCollapsed ? 'i-ri:side-bar-line' : 'i-ri:arrow-right-s-line',
        ]"
      ></i>
    </div>

    <!-- 侧边栏内容 -->
    <Transition name="glass-slide">
      <div
        v-if="!isCollapsed"
        class="side-menu"
        :class="[ctx.isDark.value ? 'dark-theme' : 'light-theme']"
      >
        <!-- 标题 -->
        <div class="side-menu__header">
          <div class="side-menu__header-icon">
            <component
              :is="ctx.iconComponent"
              v-if="ctx.iconComponent && activeItem?.meta?.icon"
              :name="activeItem.meta.icon"
              :size="17"
            />
          </div>
          <span class="side-menu__header-title">{{
            activeItem?.meta?.title || "菜单"
          }}</span>
        </div>

        <!-- 菜单列表 -->
        <div class="side-menu__list">
          <template v-for="child in menus" :key="child.path">
            <!-- 有子菜单 -->
            <div
              v-if="child.children && child.children.length > 0"
              class="side-menu__group"
            >
              <div class="side-menu__group-label">
                <component
                  :is="ctx.iconComponent"
                  v-if="ctx.iconComponent && child.meta?.icon"
                  :name="child.meta.icon"
                  :size="14"
                />
                <span>{{ child.meta?.title }}</span>
              </div>
              <div
                v-for="subChild in child.children"
                :key="subChild.path"
                class="side-menu__item"
                :class="{ active: isActive?.(subChild.path) }"
                @click="emit('click', subChild)"
              >
                <component
                  :is="ctx.iconComponent"
                  v-if="ctx.iconComponent && subChild.meta?.icon"
                  :name="subChild.meta.icon"
                  :size="15"
                />
                <span class="side-menu__item-text">{{
                  subChild.meta?.title
                }}</span>
              </div>
            </div>
            <!-- 无子菜单 -->
            <div
              v-else
              class="side-menu__item"
              :class="{ active: isActive?.(child.path) }"
              @click="emit('click', child)"
            >
              <component
                :is="ctx.iconComponent"
                v-if="ctx.iconComponent && child.meta?.icon"
                :name="child.meta.icon"
                :size="16"
              />
              <span class="side-menu__item-text">{{ child.meta?.title }}</span>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </template>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { MenuOptions } from "../../types/menu";
import { useLayoutContext } from "../../composables/useLayoutContext";

defineOptions({ name: "SideMenu" });

defineProps<{
  /** 二级菜单列表 */
  menus: MenuOptions[];
  /** 当前一级菜单项（显示标题和图标） */
  activeItem?: MenuOptions;
  /** 判断菜单项是否激活 */
  isActive?: (path: string | undefined) => boolean;
}>();

const emit = defineEmits<{
  click: [item: MenuOptions];
}>();

const ctx = useLayoutContext();
const isCollapsed = ref(false);
</script>

<style scoped>
.side-menu-toggle {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%) translateX(50%);
  width: 24px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  cursor: pointer;
  z-index: 10;
  transition: all 0.25s ease;
  font-size: 14px;
}

.side-menu-toggle.light-theme {
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.side-menu-toggle.dark-theme {
  background: rgba(40, 40, 46, 0.9);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.side-menu-toggle:hover {
  transform: translateY(-50%) translateX(50%) scale(1.1);
}

.side-menu {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 0 8px;
}

.side-menu.light-theme {
  background: rgba(255, 255, 255, 0.95);
  border-left: 1px solid rgba(0, 0, 0, 0.06);
}

.side-menu.dark-theme {
  background: rgba(30, 30, 36, 0.95);
  border-left: 1px solid rgba(255, 255, 255, 0.06);
}

.side-menu__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 12px 12px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.1);
  margin-bottom: 8px;
}

.side-menu__header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.12),
    rgba(139, 92, 246, 0.08)
  );
}

.side-menu__header-title {
  font-size: 14px;
  font-weight: 600;
}

.side-menu__list {
  padding: 4px 0;
}

.side-menu__group {
  margin-bottom: 8px;
}

.side-menu__group-label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  opacity: 0.5;
}

.side-menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  margin: 2px 0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;
}

.side-menu__item:hover {
  background: rgba(99, 102, 241, 0.06);
}

.side-menu__item.active {
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.1),
    rgba(139, 92, 246, 0.06)
  );
  color: #667eea;
  font-weight: 500;
}

.side-menu__item-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Transition */
.glass-slide-enter-active,
.glass-slide-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-slide-enter-from,
.glass-slide-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>

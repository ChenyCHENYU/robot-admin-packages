<!--
 * @robot-admin/layout
 *
 * FloatingMenu - 悬浮二级菜单面板
 * 用于 MixLayout 的悬浮二级菜单（点击一级菜单后展开）
-->
<template>
  <Transition name="slide-fade">
    <div
      v-if="show && menuItem"
      class="floating-menu"
      :class="[ctx.isDark.value ? 'dark-theme' : 'light-theme']"
    >
      <!-- 标题 -->
      <div class="floating-menu__header">
        <div class="floating-menu__brand">
          <span class="floating-menu__brand-title">{{ brand.name }}</span>
          <span class="floating-menu__brand-subtitle">{{
            brand.subtitle
          }}</span>
        </div>
      </div>

      <!-- 菜单列表 -->
      <div class="floating-menu__list">
        <template v-for="child in menuItem.children" :key="child.path">
          <!-- 有子菜单的项 -->
          <div
            v-if="child.children && child.children.length > 0"
            class="floating-menu__group"
          >
            <div class="floating-menu__group-title">
              <component
                :is="ctx.iconComponent"
                v-if="ctx.iconComponent && child.meta?.icon"
                :name="child.meta.icon"
                :size="16"
              />
              <span>{{ child.meta?.title }}</span>
            </div>
            <div
              v-for="subChild in child.children"
              :key="subChild.path"
              class="floating-menu__item floating-menu__item--sub"
              :class="{ active: isActive?.(subChild.path) }"
              @click="emit('click', subChild)"
            >
              <component
                :is="ctx.iconComponent"
                v-if="ctx.iconComponent && subChild.meta?.icon"
                :name="subChild.meta.icon"
                :size="16"
              />
              <span class="floating-menu__item-text">{{
                subChild.meta?.title
              }}</span>
            </div>
          </div>
          <!-- 无子菜单的项 -->
          <div
            v-else
            class="floating-menu__item"
            :class="{ active: isActive?.(child.path) }"
            @click="emit('click', child)"
          >
            <component
              :is="ctx.iconComponent"
              v-if="ctx.iconComponent && child.meta?.icon"
              :name="child.meta.icon"
              :size="18"
            />
            <span class="floating-menu__item-text">{{
              child.meta?.title
            }}</span>
          </div>
        </template>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import type { MenuOptions } from "../../types/menu";
import {
  useLayoutContext,
  DEFAULT_BRAND_CONFIG,
} from "../../composables/useLayoutContext";

defineOptions({ name: "FloatingMenu" });

defineProps<{
  /** 是否显示 */
  show: boolean;
  /** 当前悬浮的一级菜单项（包含 children） */
  menuItem: MenuOptions | null;
  /** 判断菜单项是否激活 */
  isActive?: (path: string | undefined) => boolean;
}>();

const emit = defineEmits<{
  click: [item: MenuOptions];
}>();

const ctx = useLayoutContext();
const brand = { ...DEFAULT_BRAND_CONFIG, ...ctx.brand };
</script>

<style scoped>
.floating-menu {
  position: absolute;
  top: 0;
  left: 100%;
  width: 240px;
  height: 100%;
  z-index: 100;
  overflow-y: auto;
  border-right: 1px solid rgba(128, 128, 128, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.floating-menu.light-theme {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.08);
}

.floating-menu.dark-theme {
  background: rgba(30, 30, 36, 0.95);
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);
}

.floating-menu__header {
  padding: 16px 20px 12px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.1);
}

.floating-menu__brand-title {
  font-size: 14px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea, #764ba2);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.floating-menu__brand-subtitle {
  display: block;
  font-size: 11px;
  opacity: 0.5;
  margin-top: 2px;
}

.floating-menu__list {
  padding: 8px 12px;
}

.floating-menu__group {
  margin-bottom: 8px;
}

.floating-menu__group-title {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 8px 4px;
  font-size: 12px;
  font-weight: 600;
  opacity: 0.5;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.floating-menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin: 2px 0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.floating-menu__item:hover {
  background: rgba(99, 102, 241, 0.08);
}

.floating-menu__item.active {
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.12),
    rgba(139, 92, 246, 0.08)
  );
  color: #667eea;
}

.floating-menu__item--sub {
  padding-left: 20px;
  font-size: 13px;
}

.floating-menu__item-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Transition */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(-12px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}
</style>

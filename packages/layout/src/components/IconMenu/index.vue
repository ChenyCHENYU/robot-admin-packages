<!--
 * @robot-admin/layout - IconMenu
 *
 * 一级图标菜单
 * 用于 Mix / MixTop 布局的左侧一级菜单栏
 * 显示图标 + 标签，支持激活状态
 -->
<template>
  <div class="icon-menu">
    <div
      v-for="item in menus"
      :key="item.path"
      class="icon-menu__item"
      :class="{ 'icon-menu__item--active': active === item.path }"
      @click="emit('click', item)"
    >
      <div class="icon-menu__icon">
        <component
          :is="ctx.iconComponent"
          v-if="ctx.iconComponent && item.meta?.icon"
          :name="item.meta.icon"
          :size="20"
        />
        <span v-else class="icon-menu__fallback">
          {{ item.meta?.title?.charAt(0) || "?" }}
        </span>
      </div>
      <div class="icon-menu__label">
        {{ item.meta?.title }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MenuOptions } from "../../types/menu";
import { useLayoutContext } from "../../composables/useLayoutContext";

defineOptions({ name: "IconMenu" });

defineProps<{
  /** 菜单数据 */
  menus: MenuOptions[];
  /** 当前激活的菜单路径 */
  active?: string;
}>();

const emit = defineEmits<{
  click: [item: MenuOptions];
}>();

const ctx = useLayoutContext();
</script>

<style scoped>
.icon-menu {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 0;
  width: 100%;
}

.icon-menu__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: calc(100% - 12px);
  padding: 10px 4px 8px;
  margin: 0 6px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  opacity: 0.7;
}

.icon-menu__item:hover {
  opacity: 1;
  background: rgba(99, 102, 241, 0.08);
  transform: translateY(-1px);
}

.icon-menu__item--active {
  opacity: 1;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.15) 0%,
    rgba(139, 92, 246, 0.1) 100%
  );
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
}

.icon-menu__item--active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, #667eea, #764ba2);
}

.icon-menu__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: 20px;
}

.icon-menu__fallback {
  font-size: 14px;
  font-weight: 600;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(128, 128, 128, 0.1);
}

.icon-menu__label {
  font-size: 11px;
  font-weight: 500;
  line-height: 1.2;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

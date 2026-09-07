<!--
 * @robot-admin/layout - ResponsiveMenu
 *
 * 响应式水平菜单
 * 用于 C_TopLayout / C_MixTopLayout / C_ReverseHorizontalMixLayout 的水平菜单
 * 自动检测容器宽度，溢出项放入“更多”下拉菜单，使用 NMenu (naive-ui) 渲染
 -->
<template>
  <div :ref="setContainerRef" class="responsive-menu">
    <div class="responsive-menu__visible">
      <NMenu
        v-if="visibleOptions.length > 0"
        mode="horizontal"
        :value="activeKey"
        :options="visibleOptions"
        :theme-overrides="menuThemeOverrides"
        @update:value="handleSelect"
      />
    </div>

    <NDropdown
      v-if="hiddenItems.length > 0"
      :options="dropdownOptions"
      placement="bottom-end"
      trigger="hover"
      @select="handleSelect"
    >
      <div class="responsive-menu__more">
        <NButton text class="responsive-menu__more-btn">
          <!-- 纯 CSS 三个点图标 -->
          <span class="dots-icon">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </NButton>
      </div>
    </NDropdown>
  </div>
</template>

<script setup lang="ts">
import { computed, h } from "vue";
import { useRoute, useRouter } from "vue-router";
import { NMenu, NDropdown, NButton } from "naive-ui";
import type { MenuOption, DropdownOption } from "naive-ui";
import type { MenuOptions } from "../../types/menu";
import { useLayoutContext } from "../../composables/useLayoutContext";
import { useResponsiveMenu } from "../../composables/useResponsiveMenu";

defineOptions({ name: "ResponsiveMenu" });

const props = defineProps<{
  /** 菜单数据 */
  data: MenuOptions[];
}>();

const route = useRoute();
const router = useRouter();
const ctx = useLayoutContext();

const activeKey = computed(() => route.path);
const { containerRef, visibleItems, hiddenItems } = useResponsiveMenu({
  data: () => props.data || [],
});
const setContainerRef = (element: unknown) => {
  containerRef.value = element instanceof HTMLElement ? element : undefined;
};

// 根据主题选择菜单样式
const isDarkMode = ctx.isDark;

const lightTheme = {
  itemTextColor: "rgba(51, 65, 85, 0.85)",
  itemTextColorHover: "rgba(30, 64, 175, 0.95)",
  itemTextColorActive: "rgba(30, 64, 175, 1)",
  itemTextColorActiveHover: "rgba(30, 64, 175, 1)",
  itemTextColorChildActive: "rgba(30, 64, 175, 1)",
  itemIconColor: "rgba(51, 65, 85, 0.7)",
  itemIconColorHover: "rgba(30, 64, 175, 0.85)",
  itemIconColorActive: "rgba(30, 64, 175, 1)",
  itemIconColorActiveHover: "rgba(30, 64, 175, 1)",
  itemIconColorChildActive: "rgba(30, 64, 175, 1)",
  itemColorHover: "rgba(30, 64, 175, 0.06)",
  itemColorActive: "rgba(30, 64, 175, 0.1)",
  itemColorActiveHover: "rgba(30, 64, 175, 0.12)",
  itemColorActiveCollapsed: "rgba(30, 64, 175, 0.1)",
  arrowColor: "rgba(51, 65, 85, 0.6)",
  arrowColorHover: "rgba(30, 64, 175, 0.8)",
  arrowColorActive: "rgba(30, 64, 175, 1)",
  arrowColorChildActive: "rgba(30, 64, 175, 1)",
  itemHeight: "42px",
  itemPadding: "0 18px",
  itemBorderRadius: "10px",
  groupTextColor: "rgba(51, 65, 85, 0.65)",
};

const darkTheme = {
  itemTextColor: "rgba(226, 232, 240, 0.85)",
  itemTextColorHover: "rgba(255, 255, 255, 0.95)",
  itemTextColorActive: "rgba(147, 197, 253, 1)",
  itemTextColorActiveHover: "rgba(147, 197, 253, 1)",
  itemTextColorChildActive: "rgba(147, 197, 253, 1)",
  itemIconColor: "rgba(226, 232, 240, 0.7)",
  itemIconColorHover: "rgba(255, 255, 255, 0.85)",
  itemIconColorActive: "rgba(147, 197, 253, 1)",
  itemIconColorActiveHover: "rgba(147, 197, 253, 1)",
  itemIconColorChildActive: "rgba(147, 197, 253, 1)",
  itemColorHover: "rgba(59, 130, 246, 0.1)",
  itemColorActive: "rgba(59, 130, 246, 0.15)",
  itemColorActiveHover: "rgba(59, 130, 246, 0.18)",
  itemColorActiveCollapsed: "rgba(59, 130, 246, 0.15)",
  arrowColor: "rgba(226, 232, 240, 0.5)",
  arrowColorHover: "rgba(255, 255, 255, 0.7)",
  arrowColorActive: "rgba(147, 197, 253, 1)",
  arrowColorChildActive: "rgba(147, 197, 253, 1)",
  itemHeight: "42px",
  itemPadding: "0 18px",
  itemBorderRadius: "10px",
  groupTextColor: "rgba(226, 232, 240, 0.6)",
};

const menuThemeOverrides = computed(() =>
  isDarkMode.value ? darkTheme : lightTheme,
);

// ============ 图标渲染 ============

const renderIcon = (icon: string, size = 18) => {
  if (ctx.iconComponent) {
    return () => h(ctx.iconComponent!, { name: icon, size });
  }
  return () =>
    h("i", {
      class: icon,
      style: {
        fontSize: `${size}px`,
        display: "inline-flex",
        alignItems: "center",
      },
    });
};

// ============ 菜单转换 ============

const getStringIcon = (item: MenuOptions) =>
  item.meta?.icon ?? (typeof item.icon === "string" ? item.icon : undefined);

const convertToMenuOption = (item: MenuOptions): MenuOption => {
  const icon = getStringIcon(item);
  return {
    key: item.path || item.key || "",
    label: item.meta?.title || item.label || item.name || "",
    icon: icon ? renderIcon(icon, 18) : undefined,
    children: item.children?.length
      ? item.children.map(convertToMenuOption)
      : undefined,
  };
};

const visibleOptions = computed<MenuOption[]>(() =>
  visibleItems.value.map(convertToMenuOption),
);

const dropdownOptions = computed<DropdownOption[]>(() =>
  hiddenItems.value.map((item) => {
    const icon = getStringIcon(item);
    return {
      key: item.path || item.key || "",
      label: item.meta?.title || item.label || item.name || "",
      icon: icon ? renderIcon(icon, 16) : undefined,
      children: item.children?.length
        ? item.children.map((child) => {
            const childIcon = getStringIcon(child);
            return {
              key: child.path || child.key || "",
              label: child.meta?.title || child.label || child.name || "",
              icon: childIcon ? renderIcon(childIcon, 16) : undefined,
            };
          })
        : undefined,
    };
  }),
);

const handleSelect = (key: string) => {
  if (key) void router.push(key);
};
</script>

<style scoped>
.responsive-menu {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 0;
}

.responsive-menu__visible {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
}

.responsive-menu__visible :deep(.n-menu) {
  background-color: transparent !important;
}

.responsive-menu__visible :deep(.n-menu-item) {
  position: relative;
  font-weight: 500;
  letter-spacing: 0.01em;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 防止 NMenu 内部截断菜单项文字 */
.responsive-menu__visible :deep(.n-menu-item-content-header) {
  overflow: visible !important;
  text-overflow: clip !important;
  white-space: nowrap !important;
}

.responsive-menu__visible :deep(.n-menu-item-content) {
  overflow: visible !important;
}

.responsive-menu__visible :deep(.n-menu-item::after) {
  content: "";
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%) scaleX(0);
  width: 60%;
  height: 2px;
  background: linear-gradient(90deg, transparent, currentColor, transparent);
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.responsive-menu__visible :deep(.n-menu-item.n-menu-item--selected::after) {
  transform: translateX(-50%) scaleX(1);
  opacity: 0.5;
}

.responsive-menu__visible :deep(.n-menu-item:hover) {
  transform: translateY(-1px);
}

.responsive-menu__visible :deep(.n-menu-item.n-menu-item--selected) {
  box-shadow:
    0 2px 8px -2px rgba(30, 64, 175, 0.15),
    0 1px 3px rgba(30, 64, 175, 0.1);
}

.responsive-menu__more {
  flex-shrink: 0;
  margin-left: 4px;
}

.responsive-menu__more-btn {
  min-width: 42px;
  height: 42px;
  padding: 0 18px !important;
  border-radius: 10px !important;
  background-color: transparent !important;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.responsive-menu__more-btn::before,
.responsive-menu__more-btn :deep(.n-button__border),
.responsive-menu__more-btn :deep(.n-button__state-border) {
  display: none !important;
}

.responsive-menu__more-btn:hover {
  background-color: rgba(30, 64, 175, 0.06) !important;
  transform: translateY(-1px);
}

/* 纯 CSS 三个点图标 */
.dots-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: 20px;
  height: 20px;
}

.dots-icon span {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: currentColor;
  opacity: 0.85;
}
</style>

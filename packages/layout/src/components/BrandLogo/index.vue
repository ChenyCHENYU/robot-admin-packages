<!--
 * @robot-admin/layout - BrandLogo
 *
 * 品牌 Logo 组件
 * 从 LayoutContext.brand 读取配置，自动渲染 Logo + 品牌名
 * 支持折叠状态、横向/纵向布局
 -->
<template>
  <div
    class="brand-logo"
    :class="{
      'brand-logo--collapsed': collapsed,
      'brand-logo--horizontal': variant === 'horizontal',
    }"
  >
    <div class="brand-logo__icon">
      <div class="brand-logo__glow"></div>
      <video
        v-if="brandConfig.logoType === 'video' && brandConfig.logoSrc"
        :src="brandConfig.logoSrc"
        :width="size"
        :height="size"
        autoplay
        loop
        muted
        playsinline
        class="brand-logo__media"
      />
      <img
        v-else-if="brandConfig.logoSrc"
        :src="brandConfig.logoSrc"
        :width="size"
        :height="size"
        class="brand-logo__media"
        alt="Logo"
      />
    </div>
    <template v-if="showName && !collapsed">
      <div class="brand-logo__name">
        <span class="brand-logo__title">{{ brandConfig.name }}</span>
        <span v-if="brandConfig.subtitle" class="brand-logo__subtitle">{{
          brandConfig.subtitle
        }}</span>
      </div>
      <div v-if="showDivider" class="brand-logo__divider"></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  useLayoutContext,
  DEFAULT_BRAND_CONFIG,
} from "../../composables/useLayoutContext";

defineOptions({ name: "BrandLogo" });

withDefaults(
  defineProps<{
    /** 是否显示品牌名称 */
    showName?: boolean;
    /** 是否显示分隔线 */
    showDivider?: boolean;
    /** Logo 尺寸 */
    size?: number;
    /** 是否折叠状态 */
    collapsed?: boolean;
    /** 布局方向 */
    variant?: "vertical" | "horizontal";
  }>(),
  {
    showName: false,
    showDivider: false,
    size: 36,
    collapsed: false,
    variant: "horizontal",
  },
);

const ctx = useLayoutContext();
const brandConfig = { ...DEFAULT_BRAND_CONFIG, ...ctx.brand };
</script>

<style scoped>
.brand-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}

.brand-logo--collapsed {
  justify-content: center;
}

.brand-logo__icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.brand-logo__glow {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(99, 102, 241, 0.15) 0%,
    transparent 70%
  );
  pointer-events: none;
}

.brand-logo__media {
  border-radius: 8px;
  object-fit: contain;
}

.brand-logo__name {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  white-space: nowrap;
}

.brand-logo__title {
  font-size: 15px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.brand-logo__subtitle {
  font-size: 10px;
  opacity: 0.6;
  letter-spacing: 0.5px;
}

.brand-logo__divider {
  width: 1px;
  height: 24px;
  margin: 0 6px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(128, 128, 128, 0.3) 50%,
    transparent 100%
  );
}
</style>

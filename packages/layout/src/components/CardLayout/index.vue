<!--
 * @robot-admin/layout - CardLayout
 * 卡片式布局：顶部导航 + hover 触发抽屉式菜单 + 内容区
 * DOM 结构和 CSS 类名与主项目原始代码完全一致
 -->
<template>
  <div class="card-layout-container">
    <!-- 顶部导航栏 -->
    <div
      class="top-navbar"
      :class="[isDarkMode ? 'dark-theme' : 'light-theme']"
    >
      <div class="navbar-left">
        <!-- 悬停触发区域 -->
        <div
          class="hover-trigger-area"
          @mouseenter="cancelHideTimer"
          @mouseleave="hideDrawerMenu"
        >
          <slot name="menu-trigger">
            <div class="menu-indicator">
              <i class="i-ri:menu-3-line"></i>
            </div>
          </slot>
        </div>

        <slot name="logo">
          <div class="logo-container">
            <div class="logo-glow"></div>
            <video
              v-if="brand.logoType === 'video'"
              :src="brand.logoSrc"
              :width="brand.logoSize || 36"
              :height="brand.logoSize || 36"
              autoplay
              loop
              muted
              playsinline
              class="logo-video"
            >
              您的浏览器不支持 video 标签。
            </video>
            <img
              v-else
              :src="brand.logoSrc"
              :width="brand.logoSize || 36"
              :height="brand.logoSize || 36"
              class="logo-video"
            />
          </div>
          <div class="brand-name">
            <span class="brand-title">{{ brand.name }}</span>
            <span class="brand-subtitle">{{ brand.subtitle }}</span>
          </div>
          <div class="navbar-divider"></div>
        </slot>
      </div>

      <!-- 右侧：操作区 -->
      <slot name="header-extra" />
    </div>

    <!-- 标签页区域 -->
    <div
      v-if="showTagsView"
      class="tags-view-container"
      :style="{ height: `${tagsViewHeight}px` }"
    >
      <slot name="tags-view" />
    </div>

    <!-- 抽屉式菜单 -->
    <div
      class="drawer-menu"
      :class="[
        isDarkMode ? 'dark-theme' : 'light-theme',
        { visible: showDrawerMenu },
      ]"
      @mouseenter="cancelHideTimer"
      @mouseleave="hideDrawerMenu"
    >
      <slot name="drawer-menu">
        <!-- 菜单头部 -->
        <div class="drawer-header">
          <div class="drawer-title">
            <i class="i-ri:apps-2-line"></i>
            <span>功能导航</span>
          </div>
        </div>

        <!-- 菜单内容 - 阿里云风格铺开布局 -->
        <div class="drawer-content">
          <div class="menu-grid">
            <div
              v-for="category in menus"
              :key="category.path"
              class="menu-category"
            >
              <!-- 分类标题 -->
              <div class="category-header" @click="navigateToPage(category)">
                <component
                  :is="LayoutIcon"
                  v-if="category.meta?.icon"
                  :name="category.meta.icon"
                  :size="18"
                />
                <span>{{ category.meta?.title }}</span>
              </div>

              <!-- 分类下的菜单项 -->
              <div
                class="category-items"
                v-if="category.children && category.children.length > 0"
              >
                <div
                  v-for="item in category.children"
                  :key="item.path"
                  class="menu-item"
                  @click="navigateToPage(item)"
                >
                  <component
                    :is="LayoutIcon"
                    v-if="item.meta?.icon"
                    :name="item.meta.icon"
                    :size="16"
                  />
                  <span class="item-title">{{ item.meta?.title }}</span>
                </div>

                <!-- 3级菜单项 -->
                <template
                  v-for="item in category.children"
                  :key="'sub-' + item.path"
                >
                  <div
                    v-if="item.children && item.children.length > 0"
                    class="submenu-items"
                  >
                    <div class="submenu-title">{{ item.meta?.title }}</div>
                    <div
                      v-for="subItem in item.children"
                      :key="subItem.path"
                      class="menu-item submenu-item"
                      @click="navigateToPage(subItem)"
                    >
                      <component
                        :is="LayoutIcon"
                        v-if="subItem.meta?.icon"
                        :name="subItem.meta.icon"
                        :size="14"
                      />
                      <span class="item-title">{{ subItem.meta?.title }}</span>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </slot>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content-area">
      <NLayout class="content-layout">
        <NLayoutContent class="main-content p16px app-content">
          <div class="page-content">
            <RouterView v-slot="{ Component, route }">
              <Transition :name="transitionName" mode="out-in">
                <KeepAlive :include="cachedViews" :max="maxCacheCount">
                  <component :is="Component" :key="route.path" />
                </KeepAlive>
              </Transition>
            </RouterView>
          </div>
        </NLayoutContent>

        <template v-if="showFooter">
          <slot name="footer" />
        </template>
      </NLayout>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, h, defineComponent } from "vue";
import { useRouter } from "vue-router";
import { NLayout, NLayoutContent } from "naive-ui";
import {
  useLayoutContext,
  DEFAULT_BRAND_CONFIG,
} from "../../composables/useLayoutContext";
import { useLayoutCache } from "../../composables/useLayoutCache";
import type { MenuOptions } from "../../types/menu";

defineOptions({ name: "CardLayout" });

const ctx = useLayoutContext();
const { cachedViews, maxCacheCount } = useLayoutCache();
const router = useRouter();

const isDarkMode = ctx.isDark;
const menus = computed(() => ctx.menus.value);
const showTagsView = computed(() => ctx.showTagsView.value);
const tagsViewHeight = computed(() => ctx.tagsViewHeight.value);
const showFooter = computed(() => ctx.showFooter.value);
const transitionName = computed(() => ctx.transitionName.value);
const brand = { ...DEFAULT_BRAND_CONFIG, ...ctx.brand };

// 抽屉菜单状态
const showDrawerMenu = ref(false);
const hideTimer = ref<ReturnType<typeof setTimeout> | null>(null);

const hideDrawerMenu = () => {
  if (hideTimer.value) clearTimeout(hideTimer.value);
  hideTimer.value = setTimeout(() => {
    showDrawerMenu.value = false;
  }, 300);
};

const cancelHideTimer = () => {
  if (hideTimer.value) {
    clearTimeout(hideTimer.value);
    hideTimer.value = null;
  }
  showDrawerMenu.value = true;
};

const navigateToPage = (item: MenuOptions) => {
  if (item.path) {
    router.push(item.path);
    showDrawerMenu.value = false;
  }
};

const LayoutIcon =
  ctx.iconComponent ??
  defineComponent({
    name: "LayoutIcon",
    props: { name: String, size: { type: Number, default: 18 } },
    setup(props) {
      return () =>
        h("i", {
          class: props.name,
          style: {
            fontSize: `${props.size}px`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          },
        });
    },
  });

onUnmounted(() => {
  if (hideTimer.value) clearTimeout(hideTimer.value);
});
</script>



<style lang="scss">
/**
 * 卡片式布局样式
 * 顶部导航 + 卡片网格菜单 + 内容区
 */

.card-layout-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--app-bg-body);
}

// 顶部导航栏
.top-navbar {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.95) 0%,
    rgba(255, 255, 255, 0.98) 100%
  );
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.03),
    0 1px 2px rgba(0, 0, 0, 0.02);
  position: relative;
  z-index: 1000;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(99, 102, 241, 0.2) 50%,
      transparent
    );
  }

  &.dark-theme {
    background: linear-gradient(
      135deg,
      rgba(28, 28, 33, 0.95) 0%,
      rgba(28, 28, 33, 0.98) 100%
    );
    border-bottom-color: rgba(255, 255, 255, 0.08);
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.2),
      0 1px 2px rgba(0, 0, 0, 0.1);

    &::before {
      background: linear-gradient(
        90deg,
        transparent,
        rgba(99, 102, 241, 0.3) 50%,
        transparent
      );
    }
  }

  .navbar-left {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-shrink: 0;

    // 悬停触发区域
    .hover-trigger-area {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      cursor: pointer;
      z-index: 1001;

      .menu-indicator {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: rgba(99, 102, 241, 0.1);
        color: #6366f1;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

        i {
          font-size: 18px;
        }

        &:hover {
          background: rgba(99, 102, 241, 0.15);
          transform: scale(1.05);
        }
      }

      .dark-theme & {
        .menu-indicator {
          background: rgba(99, 102, 241, 0.2);
          color: #8b5cf6;

          &:hover {
            background: rgba(99, 102, 241, 0.3);
          }
        }
      }
    }

    // 菜单切换按钮
    .menu-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
      border: 1px solid rgba(99, 102, 241, 0.2);
      color: #6366f1;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      i {
        font-size: 20px;
        position: relative;
        z-index: 1;
        transition: all 0.3s ease;
      }

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(99, 102, 241, 0.2);
        border-color: rgba(99, 102, 241, 0.3);

        &::before {
          opacity: 0.1;
        }

        i {
          color: #8b5cf6;
          transform: scale(1.1);
        }
      }

      &.active {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        border-color: transparent;
        color: white;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);

        i {
          color: white;
        }
      }

      // 导航中心按钮
      .nav-center-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: linear-gradient(135deg, rgba(24, 160, 88, 0.1) 0%, rgba(24, 160, 88, 0.15) 100%);
        border: 1px solid rgba(24, 160, 88, 0.2);
        color: #18a058;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
        margin-left: 8px;

        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #18a058 0%, #36ad6a 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        i {
          font-size: 20px;
          position: relative;
          z-index: 1;
          transition: all 0.3s ease;
        }

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(24, 160, 88, 0.2);
          border-color: rgba(24, 160, 88, 0.3);

          &::before {
            opacity: 0.1;
          }

          i {
            color: #36ad6a;
            transform: scale(1.1);
          }
        }

        &.active {
          background: linear-gradient(135deg, #18a058 0%, #36ad6a 100%);
          border-color: transparent;
          color: white;
          box-shadow: 0 4px 12px rgba(24, 160, 88, 0.3);

          i {
            color: white;
          }
        }
      }
    }

    .logo-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;

      .logo-glow {
        position: absolute;
        inset: 0;
        background: radial-gradient(
          circle,
          rgba(99, 102, 241, 0.25) 0%,
          transparent 70%
        );
        border-radius: 8px;
        filter: blur(8px);
        animation: pulse-glow 3s ease-in-out infinite;
      }

      .logo-video {
        position: relative;
        z-index: 10;
        border-radius: 8px;
        box-shadow:
          0 4px 12px rgba(99, 102, 241, 0.2),
          0 2px 4px rgba(0, 0, 0, 0.1);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

        &:hover {
          transform: scale(1.05) rotate(2deg);
          box-shadow:
            0 6px 16px rgba(99, 102, 241, 0.3),
            0 3px 6px rgba(0, 0, 0, 0.15);
        }
      }
    }

    .brand-name {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .brand-title {
        font-size: 18px;
        font-weight: 700;
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        letter-spacing: 0.5px;
        line-height: 1;
      }

      .brand-subtitle {
        font-size: 11px;
        font-weight: 500;
        color: var(--app-text-tertiary);
        letter-spacing: 2px;
        line-height: 1;
        opacity: 0.7;
      }
    }

    .navbar-divider {
      width: 1px;
      height: 24px;
      background: linear-gradient(
        to bottom,
        transparent,
        rgba(99, 102, 241, 0.3) 50%,
        transparent
      );
      margin: 0 8px;
    }
  }
}

// 标签页区域
.tags-view-container {
  flex-shrink: 0;
  background-color: var(--app-bg-surface);
  border-bottom: 1px solid var(--app-border-color);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

// 抽屉式菜单 - 阿里云风格
.drawer-menu {
  position: fixed;
  top: 64px;
  left: 0;
  width: 520px;
  height: calc(100vh - 64px);
  background: #ffffff;
  box-shadow: 2px 0 8px 0 rgba(0, 0, 0, 0.08);
  z-index: 1000;
  transform: translateX(-100%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e6e6e6;

  &.dark-theme {
    background: #1f1f1f;
    border-right-color: #333333;
    box-shadow: 2px 0 8px 0 rgba(0, 0, 0, 0.3);
  }

  &.visible {
    transform: translateX(0);
    opacity: 1;
  }

  // 菜单头部 - 阿里云风格
  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    border-bottom: 1px solid #e6e6e6;
    flex-shrink: 0;
    background: #fafafa;

    .dark-theme & {
      border-bottom-color: #333333;
      background: #262626;
    }

    .drawer-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 500;
      color: #333333;

      .dark-theme & {
        color: #e6e6e6;
      }

      i {
        font-size: 18px;
        color: #1890ff;
      }
    }
  }

  // 菜单内容 - 阿里云风格
  .drawer-content {
    flex: 1;
    overflow-y: auto;
    padding: 0;

    // 自定义滚动条
    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: #f5f5f5;
    }

    &::-webkit-scrollbar-thumb {
      background: #d9d9d9;
      border-radius: 3px;
      transition: background 0.3s;

      &:hover {
        background: #bfbfbf;
      }
    }

    .dark-theme & {
      &::-webkit-scrollbar-track {
        background: #262626;
      }

      &::-webkit-scrollbar-thumb {
        background: #434343;

        &:hover {
          background: #595959;
        }
      }
    }

    // 阿里云风格铺开菜单
    .menu-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 24px;
      padding: 16px;

      .menu-category {
        background: #ffffff;
        border: 1px solid #f0f0f0;
        border-radius: 8px;
        overflow: hidden;
        transition: all 0.2s ease;

        .dark-theme & {
          background: #1f1f1f;
          border-color: #303030;
        }

        &:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          transform: translateY(-2px);
        }

        // 分类标题
        .category-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 500;
          color: #333333;
          cursor: pointer;
          background: #fafafa;
          border-bottom: 1px solid #f0f0f0;
          transition: all 0.2s ease;

          .dark-theme & {
            color: #e6e6e6;
            background: #262626;
            border-bottom-color: #303030;
          }

          &:hover {
            background: #f0f0f0;
            color: #1890ff;

            .dark-theme & {
              background: #303030;
              color: #1890ff;
            }
          }
        }

        // 分类下的菜单项 - 铺开显示
        .category-items {
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;

          .menu-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s ease;
            color: #666666;
            font-size: 13px;

            .dark-theme & {
              color: #b3b3b3;
            }

            &:hover {
              background: #f0f0f0;
              color: #1890ff;

              .dark-theme & {
                background: #303030;
                color: #1890ff;
              }
            }

            .item-title {
              font-size: 13px;
              font-weight: 400;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          }

          // 3级菜单分组 - 铺开显示
          .submenu-items {
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px dashed #f0f0f0;

            .dark-theme & {
              border-top-color: #303030;
            }

            .submenu-title {
              display: flex;
              align-items: center;
              padding: 4px 8px;
              margin-bottom: 4px;
              font-size: 12px;
              font-weight: 500;
              color: #999999;
              background: #fafafa;
              border-radius: 4px;

              .dark-theme & {
                color: #808080;
                background: #262626;
              }
            }

            .submenu-item {
              display: flex;
              align-items: center;
              gap: 6px;
              padding: 6px 8px 6px 16px;
              border-radius: 4px;
              cursor: pointer;
              transition: all 0.2s ease;
              color: #666666;
              font-size: 12px;

              .dark-theme & {
                color: #b3b3b3;
              }

              &:hover {
                background: #f0f0f0;
                color: #1890ff;

                .dark-theme & {
                  background: #303030;
                  color: #1890ff;
                }
              }

              .item-title {
                font-size: 12px;
                font-weight: 400;
              }
            }
          }
        }
      }
    }
  }
}

// 主内容区域
.main-content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .content-layout {
    flex: 1;
    display: flex;
    flex-direction: column;

    .main-content {
      flex: 1;
      overflow: auto;
      background-color: var(--app-bg-content);

      .page-content {
        min-height: 100%;
      }
    }
  }
}

// 动画效果
@keyframes pulse-glow {
  0%,
  100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

// 响应式设计
@media (max-width: 1200px) {
  .card-menu-area {
    .card-grid {
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }
  }

  .sidebar-menu {
    width: 280px;
  }
}

@media (max-width: 768px) {
  .card-menu-area {
    padding: 20px;

    .card-grid {
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 16px;

      .menu-card {
        padding: 20px;
        gap: 16px;

        .card-icon {
          width: 60px;
          height: 60px;

          .default-icon {
            font-size: 24px;
          }
        }

        .card-content {
          .card-title {
            font-size: 16px;
          }

          .card-description {
            font-size: 13px;
          }
        }
      }
    }
  }

  .sidebar-menu {
    width: 100%;
    max-width: 320px;
  }

  .top-navbar {
    padding: 0 16px;

    .navbar-left {
      gap: 12px;

      .brand-name {
        .brand-title {
          font-size: 16px;
        }

        .brand-subtitle {
          display: none;
        }
      }
    }
  }
}

@media (max-width: 480px) {
  .card-menu-area {
    padding: 16px;

    .card-grid {
      grid-template-columns: 1fr;
      gap: 16px;

      .menu-card {
        padding: 16px;
        gap: 12px;

        .card-icon {
          width: 56px;
          height: 56px;

          .default-icon {
            font-size: 22px;
          }
        }

        .card-content {
          .card-title {
            font-size: 15px;
          }

          .card-description {
            font-size: 12px;
          }
        }
      }
    }
  }

  .sidebar-menu {
    width: 100%;
    max-width: none;

    .sidebar-header {
      padding: 16px 20px;

      .sidebar-title {
        font-size: 15px;
      }
    }

    .sidebar-menu-tree {
      padding: 12px 0;

      :deep(.n-menu-item) {
        margin: 2px 12px;
        padding: 8px 12px;
      }
    }
  }

  .top-navbar {
    padding: 0 12px;

    .navbar-left {
      gap: 8px;

      .menu-toggle {
        width: 36px;
        height: 36px;

        i {
          font-size: 18px;
        }
      }

      .logo-container {
        .logo-video {
          width: 32px;
          height: 32px;
        }
      }

      .navbar-divider {
        display: none;
      }
    }
  }
}
</style>

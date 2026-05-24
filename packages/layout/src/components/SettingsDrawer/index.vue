<!--
 * @robot-admin/layout - SettingsDrawer
 *
 * 布局配置抽屉
 * 包含外观/布局/功能三大模块，支持主题预设、布局切换、配置导入导出等
 -->
<template>
  <NDrawer
    v-model:show="visible"
    :width="380"
    placement="right"
    :trap-focus="false"
    :block-scroll="false"
  >
    <NDrawerContent title="⚙️ 布局配置" closable>
      <NTabs v-model:value="activeTab" animated class="settings-tabs">
        <!-- 外观 Tab -->
        <NTabPane name="appearance" tab="🎨 外观">
          <!-- 预设方案网格 -->
          <div class="settings-section">
            <div class="preset-grid">
              <div
                v-for="preset in THEME_PRESETS"
                :key="preset.name"
                class="preset-card"
                :class="{ active: isCurrentPreset(preset) }"
                @click="handleApplyPreset(preset)"
              >
                <div class="preset-icon">{{ preset.icon }}</div>
                <div class="preset-name">{{ preset.name }}</div>
                <div class="preset-color">
                  <span
                    class="color-dot"
                    :style="{ backgroundColor: preset.primaryColor }"
                  ></span>
                </div>
              </div>
            </div>
          </div>

          <!-- 主题模式 -->
          <div class="settings-section">
            <div class="section-title">主题模式</div>
            <NRadioGroup
              v-model:value="settingsStore.themeMode"
              class="mode-group"
            >
              <NRadioButton value="light">
                <span class="i-mdi:white-balance-sunny mr-1"></span>
                浅色
              </NRadioButton>
              <NRadioButton value="dark">
                <span class="i-mdi:moon-waning-crescent mr-1"></span>
                深色
              </NRadioButton>
              <NRadioButton value="auto">
                <span class="i-mdi:theme-light-dark mr-1"></span>
                自动
              </NRadioButton>
            </NRadioGroup>
          </div>

          <!-- 主题色 -->
          <div class="settings-section">
            <div class="section-title">主题色</div>
            <div class="color-picker-wrapper">
              <NColorPicker
                v-model:value="settingsStore.primaryColor"
                :show-alpha="false"
                :swatches="COLOR_SWATCHES"
                :actions="['confirm']"
              />
              <span class="color-value">{{ settingsStore.primaryColor }}</span>
            </div>
          </div>

          <!-- 圆角大小 -->
          <div class="settings-section">
            <div class="section-title">圆角大小</div>
            <NRadioGroup
              v-model:value="settingsStore.borderRadius"
              class="radius-group"
            >
              <NRadioButton value="small">小 (4px)</NRadioButton>
              <NRadioButton value="medium">中 (6px)</NRadioButton>
              <NRadioButton value="large">大 (8px)</NRadioButton>
            </NRadioGroup>
          </div>

          <!-- 页面动画 -->
          <div class="settings-section">
            <div class="section-title">页面动画</div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm">启用动画</span>
              <NSwitch v-model:value="settingsStore.enableTransition" />
            </div>
            <NRadioGroup
              v-model:value="settingsStore.transitionType"
              :disabled="!settingsStore.enableTransition"
              class="transition-group"
            >
              <NRadioButton value="fade">淡入</NRadioButton>
              <NRadioButton value="slide">滑动</NRadioButton>
              <NRadioButton value="zoom">缩放</NRadioButton>
              <NRadioButton value="none">无</NRadioButton>
            </NRadioGroup>
          </div>

          <!-- 恢复默认 -->
          <div class="settings-section">
            <NButton block secondary @click="handleResetAppearance">
              <template #icon>
                <span class="i-mdi:restore"></span>
              </template>
              恢复外观默认设置
            </NButton>
          </div>
        </NTabPane>

        <!-- 布局 Tab -->
        <NTabPane name="layout" tab="📐 布局">
          <!-- 布局模式 -->
          <div class="settings-section">
            <div class="section-title">布局模式</div>
            <div class="layout-grid">
              <div
                v-for="mode in LAYOUT_MODE_OPTIONS"
                :key="mode.value"
                class="layout-item"
                :class="{
                  active: settingsStore.layoutMode === mode.value,
                  disabled: mode.disabled,
                }"
                @click.stop="handleLayoutChange(mode.value, mode.disabled)"
              >
                <div class="layout-screenshot">
                  <svg
                    class="layout-svg"
                    viewBox="0 0 56 48"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g v-html="mode.svg"></g>
                  </svg>
                </div>
                <div class="layout-label">
                  {{ mode.label }}
                  <span v-if="mode.disabled" class="badge-soon">敬请期待</span>
                </div>
              </div>
            </div>
          </div>

          <div
            class="settings-section menu-expand-section"
            data-menu-expand-mode="built-in"
          >
            <div class="section-title">菜单展开方式</div>
            <NRadioGroup
              v-model:value="settingsStore.menuExpandMode"
              class="menu-expand-group"
            >
              <NRadioButton value="inline">传统展开</NRadioButton>
              <NRadioButton value="panel">右侧面板</NRadioButton>
            </NRadioGroup>
          </div>

          <!-- 界面元素 -->
          <div class="settings-section">
            <div class="section-title">界面元素</div>
            <div class="setting-item">
              <span>显示面包屑</span>
              <NSwitch v-model:value="settingsStore.showBreadcrumb" />
            </div>
            <div class="setting-item">
              <span>显示面包屑图标</span>
              <NSwitch
                v-model:value="settingsStore.showBreadcrumbIcon"
                :disabled="!settingsStore.showBreadcrumb"
              />
            </div>
            <div class="setting-item">
              <span>显示标签页</span>
              <NSwitch v-model:value="settingsStore.showTagsView" />
            </div>
            <div class="setting-item">
              <span>显示页脚</span>
              <NSwitch v-model:value="settingsStore.showFooter" />
            </div>
          </div>

          <!-- 尺寸调整 -->
          <div class="settings-section">
            <div class="section-title">尺寸调整</div>
            <div class="slider-item">
              <div class="slider-label">
                <span>侧边栏宽度</span>
                <span class="slider-value"
                  >{{ settingsStore.sidebarWidth }}px</span
                >
              </div>
              <NSlider
                v-model:value="settingsStore.sidebarWidth"
                :min="180"
                :max="280"
                :step="10"
                :marks="{ 180: '180', 220: '220', 280: '280' }"
              />
            </div>
            <div class="slider-item">
              <div class="slider-label">
                <span>头部高度</span>
                <span class="slider-value"
                  >{{ settingsStore.headerHeight }}px</span
                >
              </div>
              <NSlider
                v-model:value="settingsStore.headerHeight"
                :min="48"
                :max="64"
                :step="4"
                :marks="{ 48: '48', 56: '56', 64: '64' }"
              />
            </div>
          </div>

          <!-- 恢复默认 -->
          <div class="settings-section">
            <NButton block secondary @click="handleResetLayout">
              <template #icon>
                <span class="i-mdi:restore"></span>
              </template>
              恢复布局默认设置
            </NButton>
          </div>
        </NTabPane>

        <!-- 功能 Tab -->
        <NTabPane name="features" tab="🔧 功能">
          <!-- 缓存管理 -->
          <div class="settings-section">
            <div class="section-title">缓存管理</div>
            <div class="action-buttons-grid">
              <NButton secondary @click="handleClearCache">
                <template #icon>
                  <span class="i-mdi:delete-sweep"></span>
                </template>
                清除缓存
              </NButton>
              <NButton secondary @click="handleReload">
                <template #icon>
                  <span class="i-mdi:refresh"></span>
                </template>
                重新加载
              </NButton>
            </div>
          </div>

          <!-- 配置管理 -->
          <div class="settings-section">
            <div class="section-title">配置管理</div>
            <div class="action-buttons-grid">
              <NButton secondary @click="handleExportConfig">
                <template #icon>
                  <span class="i-mdi:download"></span>
                </template>
                导出配置
              </NButton>
              <NButton secondary @click="handleImportConfig">
                <template #icon>
                  <span class="i-mdi:upload"></span>
                </template>
                导入配置
              </NButton>
            </div>
            <NButton
              block
              type="error"
              secondary
              class="mt-2"
              @click="handleReset"
            >
              <template #icon>
                <span class="i-mdi:restore"></span>
              </template>
              重置所有配置
            </NButton>
          </div>

          <!-- 系统模式 -->
          <div class="settings-section">
            <div class="section-title">系统模式</div>
            <div class="setting-item">
              <div class="setting-label">
                <span>灰色模式</span>
                <span class="setting-desc">用于哀悼日场景</span>
              </div>
              <NSwitch v-model:value="grayMode" />
            </div>
            <div class="setting-item">
              <div class="setting-label">
                <span>色弱模式</span>
                <span class="setting-desc">提供无障碍访问支持</span>
              </div>
              <NSwitch v-model:value="colorWeakMode" />
            </div>
          </div>

          <!-- 水印设置 -->
          <div class="settings-section">
            <div class="section-title">水印设置</div>
            <div class="setting-item">
              <span>启用水印</span>
              <NSwitch v-model:value="watermarkEnabled" />
            </div>
            <div v-if="watermarkEnabled" class="mt-2">
              <NInput
                v-model:value="watermarkText"
                placeholder="请输入水印内容"
                size="small"
              />
            </div>
          </div>

          <!-- 系统信息 -->
          <div class="settings-section">
            <div class="section-title">系统信息</div>
            <div class="system-info">
              <div class="info-item">
                <span class="info-label">浏览器</span>
                <span class="info-value">{{ systemInfo.browser }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">操作系统</span>
                <span class="info-value">{{ systemInfo.os }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">屏幕分辨率</span>
                <span class="info-value">{{ systemInfo.resolution }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">设备像素比</span>
                <span class="info-value">{{ systemInfo.pixelRatio }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">语言</span>
                <span class="info-value">{{ systemInfo.language }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">时区</span>
                <span class="info-value">{{ systemInfo.timezone }}</span>
              </div>
            </div>
          </div>
        </NTabPane>
      </NTabs>
    </NDrawerContent>
  </NDrawer>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from "vue";
import {
  NDrawer,
  NDrawerContent,
  NTabs,
  NTabPane,
  NRadioGroup,
  NRadioButton,
  NColorPicker,
  NSwitch,
  NButton,
  NSlider,
  NInput,
  useMessage,
  useDialog,
} from "naive-ui";
import { useSettingsStore } from "../../stores/settings";
import { DEFAULT_SETTINGS } from "../../constants";
import { COLOR_SWATCHES, LAYOUT_MODE_OPTIONS, THEME_PRESETS } from "./data";
import type { ThemePreset } from "../../types";

// ============ 数据定义 ============

const message = useMessage();
const dialog = useDialog();
const settingsStore = useSettingsStore();
const visible = defineModel<boolean>("show", { default: false });
const activeTab = ref("appearance");

// 功能开关
const grayMode = ref(false);
const colorWeakMode = ref(false);
const watermarkEnabled = ref(false);
const watermarkText = ref("Robot Admin");

// 水印元素引用
let watermarkEl: HTMLElement | null = null;

// 创建水印函数
const createWatermark = (text: string) => {
  // 移除旧水印
  if (watermarkEl) {
    document.body.removeChild(watermarkEl);
    watermarkEl = null;
  }

  // 创建 canvas
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = 200;
  canvas.height = 150;

  ctx.font = "14px Microsoft JhengHei";
  ctx.fillStyle = "rgba(120, 120, 120, 0.15)";
  ctx.rotate((-20 * Math.PI) / 180);
  ctx.fillText(text, 0, 80);

  // 创建水印容器
  watermarkEl = document.createElement("div");
  watermarkEl.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    background-image: url(${canvas.toDataURL()});
    background-repeat: repeat;
    z-index: 9999;
    user-select: none;
  `;

  document.body.appendChild(watermarkEl);
};

// 移除水印函数
const removeWatermark = () => {
  if (watermarkEl) {
    document.body.removeChild(watermarkEl);
    watermarkEl = null;
  }
};

// 监听灰色模式
watch(grayMode, (val) => {
  document.documentElement.classList.toggle("gray-mode", val);
});

// 监听色弱模式
watch(colorWeakMode, (val) => {
  document.documentElement.classList.toggle("color-weak-mode", val);
});

// 监听水印开关
watch(watermarkEnabled, (val) => {
  if (val) {
    createWatermark(watermarkText.value);
  } else {
    removeWatermark();
  }
});

// 监听水印文本
watch(watermarkText, (val) => {
  if (watermarkEnabled.value) {
    createWatermark(val);
  }
});

// 获取系统信息
const systemInfo = computed(() => {
  const ua = navigator.userAgent;
  let browser = "Unknown";
  let os = "Unknown";

  // 检测浏览器
  if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Edge")) browser = "Edge";

  // 检测操作系统
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iOS")) os = "iOS";

  return {
    browser,
    os,
    resolution: `${window.screen.width} × ${window.screen.height}`,
    pixelRatio: window.devicePixelRatio + "x",
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
});

// 组件卸载时清理水印
onUnmounted(() => {
  removeWatermark();
});

// 处理布局切换 - 阻止抽屉关闭
const handleLayoutChange = (value: string, disabled?: boolean) => {
  if (disabled) return;
  settingsStore.layoutMode = value as any;
};

// ============ 方法 ============

/**
 * 判断是否是当前预设
 */
const isCurrentPreset = (preset: ThemePreset) => {
  return settingsStore.primaryColor === preset.primaryColor;
};

/**
 * 应用预设方案
 */
const handleApplyPreset = (preset: ThemePreset) => {
  settingsStore.applyPreset(preset);
  message.success(`已应用「${preset.name}」主题方案`);
};

/**
 * 恢复外观默认设置
 */
const handleResetAppearance = () => {
  settingsStore.themeMode = DEFAULT_SETTINGS.themeMode;
  settingsStore.primaryColor = DEFAULT_SETTINGS.primaryColor;
  settingsStore.borderRadius = DEFAULT_SETTINGS.borderRadius;
  settingsStore.transitionType = DEFAULT_SETTINGS.transitionType;
  settingsStore.enableTransition = DEFAULT_SETTINGS.enableTransition;
  message.success("已恢复外观默认设置");
};

/**
 * 恢复布局默认设置
 */
const handleResetLayout = () => {
  settingsStore.layoutMode = DEFAULT_SETTINGS.layoutMode;
  settingsStore.menuExpandMode = DEFAULT_SETTINGS.menuExpandMode;
  settingsStore.fixedHeader = DEFAULT_SETTINGS.fixedHeader;
  settingsStore.showBreadcrumb = DEFAULT_SETTINGS.showBreadcrumb;
  settingsStore.showBreadcrumbIcon = DEFAULT_SETTINGS.showBreadcrumbIcon;
  settingsStore.showTagsView = DEFAULT_SETTINGS.showTagsView;
  settingsStore.tagsViewHeight = DEFAULT_SETTINGS.tagsViewHeight;
  settingsStore.tagsViewStyle = DEFAULT_SETTINGS.tagsViewStyle;
  settingsStore.showFooter = DEFAULT_SETTINGS.showFooter;
  settingsStore.sidebarWidth = DEFAULT_SETTINGS.sidebarWidth;
  settingsStore.sidebarCollapsedWidth = DEFAULT_SETTINGS.sidebarCollapsedWidth;
  settingsStore.headerHeight = DEFAULT_SETTINGS.headerHeight;
  message.success("已恢复布局默认设置");
};

/**
 * 重置配置
 */
const handleReset = () => {
  dialog.warning({
    title: "确认重置",
    content: "确定要恢复默认配置吗？此操作不可撤销。",
    positiveText: "确认",
    negativeText: "取消",
    onPositiveClick: () => {
      settingsStore.resetSettings();
      message.success("已恢复默认配置");
    },
  });
};

/**
 * 清除缓存
 */
const handleClearCache = () => {
  dialog.warning({
    title: "确认清除",
    content: "确定要清除浏览器缓存吗？",
    positiveText: "确认",
    negativeText: "取消",
    onPositiveClick: () => {
      // 清除 localStorage
      const keysToKeep = ["theme-mode", "robot-admin-settings"];
      const allKeys = Object.keys(localStorage);
      allKeys.forEach((key) => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      // 清除 sessionStorage
      sessionStorage.clear();
      message.success("缓存已清除");
    },
  });
};

/**
 * 重新加载页面
 */
const handleReload = () => {
  location.reload();
};

/**
 * 导出配置
 */
const handleExportConfig = () => {
  const config = {
    settings: settingsStore.settingsState,
    gray: grayMode.value,
    colorWeak: colorWeakMode.value,
    watermark: {
      enabled: watermarkEnabled.value,
      text: watermarkText.value,
    },
    exportTime: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(config, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `robot-admin-config-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  message.success("配置已导出");
};

/**
 * 导入配置
 */
const handleImportConfig = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.onchange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const config = JSON.parse(text);

      // 应用配置
      if (config.settings) {
        settingsStore.$patch(config.settings);
      }
      if (config.gray !== undefined) {
        grayMode.value = config.gray;
      }
      if (config.colorWeak !== undefined) {
        colorWeakMode.value = config.colorWeak;
      }
      if (config.watermark) {
        watermarkEnabled.value = config.watermark.enabled;
        watermarkText.value = config.watermark.text;
      }

      message.success("配置已导入");
    } catch (error) {
      message.error("配置文件格式错误");
    }
  };
  input.click();
};
</script>

<style scoped lang="scss">
@use "../../styles/settings.scss" as *;
</style>

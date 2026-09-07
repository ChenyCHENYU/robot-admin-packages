<!--
 * @robot-admin/layout - SettingsDrawer
 *
 * 布局配置抽屉
 * 包含外观/布局/功能三大模块，支持主题预设、布局切换、配置导入导出等
 -->
<template>
  <NDrawer
    v-model:show="visible"
    :width="width"
    placement="right"
    :trap-focus="true"
    :block-scroll="true"
  >
    <NDrawerContent title="⚙️ 布局配置" closable>
      <NTabs v-model:value="activeTab" animated class="settings-tabs">
        <!-- 外观 Tab -->
        <NTabPane name="appearance" tab="🎨 外观">
          <slot name="appearance-prepend" :settings="settingsStore" />
          <!-- 预设方案网格 -->
          <div class="settings-section">
            <div class="preset-grid">
              <div
                v-for="preset in THEME_PRESETS"
                :key="preset.name"
                class="preset-card"
                :class="{ active: isCurrentPreset(preset) }"
                role="button"
                tabindex="0"
                :aria-pressed="isCurrentPreset(preset)"
                @click="handleApplyPreset(preset)"
                @keydown.enter="handleApplyPreset(preset)"
                @keydown.space.prevent="handleApplyPreset(preset)"
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
              :value="settingsStore.themeMode"
              class="mode-group"
              @update:value="handleThemeModeChange"
            >
              <NRadioButton value="light">
                <span class="i-mdi:white-balance-sunny mr-1"></span>
                浅色
              </NRadioButton>
              <NRadioButton value="dark">
                <span class="i-mdi:moon-waning-crescent mr-1"></span>
                深色
              </NRadioButton>
              <NRadioButton value="system">
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
          <slot name="appearance-append" :settings="settingsStore" />
        </NTabPane>

        <!-- 布局 Tab -->
        <NTabPane name="layout" tab="📐 布局">
          <slot name="layout-prepend" :settings="settingsStore" />
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
                role="button"
                :tabindex="mode.disabled ? -1 : 0"
                :aria-disabled="mode.disabled"
                :aria-pressed="settingsStore.layoutMode === mode.value"
                @click.stop="handleLayoutChange(mode.value, mode.disabled)"
                @keydown.enter.stop="
                  handleLayoutChange(mode.value, mode.disabled)
                "
                @keydown.space.stop.prevent="
                  handleLayoutChange(mode.value, mode.disabled)
                "
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

          <slot name="layout-after-mode" :settings="settingsStore" />

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
          <slot name="layout-append" :settings="settingsStore" />
        </NTabPane>

        <!-- 功能 Tab -->
        <NTabPane name="features" tab="🔧 功能">
          <slot name="features-prepend" :settings="settingsStore" />
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
          <slot name="features-append" :settings="settingsStore" />
        </NTabPane>
      </NTabs>
    </NDrawerContent>
  </NDrawer>
</template>

<script setup lang="ts">
import { ref, inject } from "vue";
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
import {
  useSettingsStore,
  type SettingsStoreInstance,
} from "../../stores/settings";
import {
  LayoutActionUnavailableError,
  useSettingsController,
} from "../../composables/useSettingsController";
import { LAYOUT_SETTINGS_KEY } from "../../composables/useLayoutContext";
import { COLOR_SWATCHES, LAYOUT_MODE_OPTIONS, THEME_PRESETS } from "./data";
import type {
  SettingsDrawerActions,
  LayoutMode,
  ThemeMode,
  ThemePreset,
} from "../../types";

// ============ 数据定义 ============

const props = withDefaults(
  defineProps<{
    /** 抽屉宽度，默认 380px */
    width?: number;
    /** 显式设置 Store；优先级高于 setupLayout 注入和默认 Store */
    store?: SettingsStoreInstance;
    /** 由宿主实现的缓存清理、页面刷新等高副作用操作 */
    actions?: SettingsDrawerActions;
    /** 导入文件最大字节数，默认 1 MiB */
    maxImportBytes?: number;
  }>(),
  {
    width: 380,
    maxImportBytes: 1024 * 1024,
  },
);

const message = useMessage();
const dialog = useDialog();
const injectedSettingsStore = inject(LAYOUT_SETTINGS_KEY, null);
const settingsStore =
  props.store ?? injectedSettingsStore ?? useSettingsStore();
const visible = defineModel<boolean>("show", { default: false });
const activeTab = ref("appearance");
const settingsController = useSettingsController({
  store: settingsStore,
  actions: props.actions,
  maxImportBytes: props.maxImportBytes,
  onVisualEffectError: (text) => message.error(text),
});
const { colorWeakMode, grayMode, systemInfo, watermarkEnabled, watermarkText } =
  settingsController;

// 处理布局切换 - 阻止抽屉关闭
const handleLayoutChange = (value: LayoutMode, disabled?: boolean) => {
  if (disabled) return;
  settingsStore.layoutMode = value;
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
  void settingsController.applyPreset(preset);
  message.success(`已应用「${preset.name}」主题方案`);
};

const handleThemeModeChange = async (mode: ThemeMode) => {
  try {
    await settingsController.updateThemeMode(mode);
  } catch {
    message.error("主题模式切换失败");
  }
};

/**
 * 恢复外观默认设置
 */
const handleResetAppearance = async () => {
  try {
    await settingsController.resetAppearance();
    message.success("已恢复外观默认设置");
  } catch {
    message.error("恢复外观默认设置失败");
  }
};

/**
 * 恢复布局默认设置
 */
const handleResetLayout = () => {
  settingsController.resetLayout();
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
    onPositiveClick: async () => {
      try {
        await settingsController.resetAll();
        message.success("已恢复默认配置");
      } catch {
        message.error("恢复默认配置失败");
      }
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
    onPositiveClick: async () => {
      try {
        await settingsController.clearCache();
        message.success("缓存已清除");
      } catch (error) {
        if (error instanceof LayoutActionUnavailableError) {
          message.warning("宿主应用未配置可安全清理的缓存");
          return;
        }
        message.error("缓存清除失败");
      }
    },
  });
};

/**
 * 重新加载页面
 */
const handleReload = () => {
  settingsController.reloadPage();
};

/**
 * 导出配置
 */
const handleExportConfig = () => {
  if (settingsController.downloadConfig()) message.success("配置已导出");
  else message.error("当前环境不支持配置导出");
};

/**
 * 导入配置
 */
const handleImportConfig = () => {
  if (typeof document === "undefined") return;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.onchange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      await settingsController.importFile(file);
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

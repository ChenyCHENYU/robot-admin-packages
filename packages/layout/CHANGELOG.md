# @robot-admin/layout Changelog

## [2.0.1] - 2026-02-10

### 🐛 Bug Fixes

- **SettingsDrawer**: 修复布局切换时抽屉自动关闭的问题
  - 原因：布局切换时整个组件树被销毁，导致 `showSettings` 状态重置
  - 解决：通过 `@click.stop` 阻止事件冒泡，防止触发父组件关闭逻辑
  - 影响：用户现在可以在布局设置抽屉打开时自由切换布局模式

### 🧹 Code Quality

- 清理调试代码：移除临时的调试信息和注释
- 移除无效的行内样式绑定：所有视觉效果已统一由 CSS 控制
- 优化事件处理：简化 `handleLayoutChange` 函数，移除不必要的事件对象传递

### 🎨 UI/UX Improvements

- **布局选中反馈**: 优化布局图标和文字的蓝色高亮效果
  - 使用 `#409EFF` 作为选中状态的主题色
  - 添加 `!important` 确保样式优先级
  - 选中状态增加字重（font-weight: 600）

---

## [2.0.0] - 2026-02-09

### 🎉 Major Release

- 初始发布：完整的布局和设置管理系统
- 支持 6 种布局模式：side、top、mix、mix-top、card-layout、reverse-horizontal-mix
- 完整的主题管理：主题模式、主题色、圆角、动画等
- 功能丰富的设置抽屉：外观配置、布局配置、功能配置
- 基于 Pinia 的状态管理
- TypeScript 完整类型支持

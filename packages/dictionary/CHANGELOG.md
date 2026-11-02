# @robot-admin/dictionary

## 0.5.0

### Minor Changes

- 提供独立 Vue 插件 createDictionaryPlugin(config)、按名 useDictionary、useDictionaries 和 useDictLabels。通用接口与默认策略集中配置，应用安装不再需要组件库的注入 key；核心仍无框架或 UI 依赖。每个应用独立持有 Store 和配置监听，支持认证暂停/恢复、响应式 scope、Vue 3.4/3.5 卸载和 SSR 显式 dispose；暂停保持 idle，不冒充成功空字典。保留直接源和显式 Provider API，修复同源切身份时旧取消覆盖当前状态。
- 修复 Vue 3.4 SSR 下 computed 与同步 watch 重入导致的递归；按输入变化只解析一次来源，保留旧 Provider 和同步取消的所有权约定。

## 0.4.1

### Patch Changes

- 按接入路线和实际场景重整 README 与指南，补齐标准数组/业务响应对象适配、Provider 初始化、表单、搜索、C_Table、详情弹窗、MachTable、页面覆盖、静态枚举和脚本用法。明确变量来源、原码与标签、加载错误及重试约定；文档 TypeScript/Vue 示例和链接独立验证，运行时 API 与行为不变。

## 0.4.0

### Minor Changes

- 增加应用统一远程 loader：`createDictionaryStore(loader)` 直接按字段的后台字典码惰性取源，无需逐项注册或前端别名。混合场景由 `options.load` 处理未显式声明的名称，静态和专属源优先。沿用同一请求合并、缓存、失败恢复与身份隔离机制，晚创建源使用当前作用域，销毁后不再创建。保留原注册表 API，精简 README 并补齐类型、生命周期和发布产物回归。

## 0.3.1

### Patch Changes

- 统一字典包的品牌封面、导航和精简接入示例，将完整指南与图片一并纳入 npm 发布产物。推荐直接复用已有字段配置，区分 RobotAdmin 应用封装与公开 API；运行时 API 和行为保持兼容。

## 0.3.0

### Minor Changes

- 详情可直接复用已有字段配置，保留映射写法；增加只读 Provider 组合与既有轻量选项源兼容。记录未到达或 enabled 关闭时不解析、订阅、加载远程源，关闭取消当前等待并保留展示快照，重新启用读取当前作用域。错误和独立重试继续可见，字段配置一次解析、同名源共享消费，不增加数据缓存或 UI 依赖。

## 0.2.0

### Minor Changes

- 新增可选 Vue 详情字段绑定 `useDictionaryLabels`，一次声明记录字段与字典名称后直接读取 `labels.field`。记录与远程选项自动同步、同名字典共享订阅、失败局部可见并可独立重试，不改写原始模型；类型约束校验字段和字典名称。

## 0.1.0

首次提供框架无关的命名字典与静态枚举：严格保留原码类型、O(1) 标签索引、并发加载合并、独立取消、TTL、失败冷却与重试、加载超时、作用域失效隔离，以及可选 Vue 订阅和合并刷新。

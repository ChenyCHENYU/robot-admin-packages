<p align="center"><img src="../../../docs/assets/logo.svg" width="88" alt="Robot Request Core logo"></p>

# Headless useTableCrud

`@robot-admin/request-core/vue` 的 Headless 表格请求状态机，管理查询、分页、CRUD、编辑器与生命周期，不绑定表格组件或 UI 框架。

完整专题已整理到公开文档目录，随 npm 包一同发布：

- [Headless CRUD 指南](../../../docs/table-crud.md)：source、内存数据源、函数式预配置、查询与编辑器。
- [Request Core 首页](../../../README.md)：定位、入口与快速开始。
- [完整接入指南](../../../docs/guide.md)：Client、响应适配、认证、缓存与迁移。

## 推荐接入

标准页面使用 `source` 对接 HTTP 端点；演示和测试使用 `createMemoryTableSource()`；应用默认约定通过 `createTableCrud()` 统一配置。三者均从 `/vue` 入口消费。

| 关注点      | 当前约定                                          |
| ----------- | ------------------------------------------------- |
| 组件耦合    | 返回状态与动作，呈现由宿主实现                    |
| HTTP Client | 显式传入或使用 Vue 注入                           |
| 编辑与保存  | 使用结构化 `editor`，后端变更由 mutation 完成     |
| 内存数据源  | 每次创建隔离快照；不自动筛选、排序、分页或生成 ID |
| 作用域      | 卸载取消请求，过期结果不回写                      |

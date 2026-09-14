# Changesets

该目录只保存尚未进入版本提交的用户可见变更。

```bash
bun run changeset
bun run version-packages
```

- 每个功能或修复使用独立、语义清晰的变更集文件。
- 纯仓库维护、测试和文档整理且不改变已发布包时，不创建变更集。
- 版本提交完成后，Changesets 会自动消费对应的变更集文件并更新包版本与 CHANGELOG。

完整质量门禁、发布与失败恢复流程见 [`docs/maintenance.md`](../docs/maintenance.md)。

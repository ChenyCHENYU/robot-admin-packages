---
"@robot-admin/file-utils": major
---

将文件工具升级为具备隔离配置、统一错误、安全上限与真流式传输能力的 3.x 架构。

- 新增 `createFileUtils()`、不可变 `FileUtilsContext`、统一 `FileUtilsError`/`FileProgress`、取消信号和所有模块的公开子路径导出。
- CSV/Excel 增加公式注入防护、严格表头和行列限制；Excel 更新到 SheetJS 官方 0.20.3 发布包并限制工作表范围。
- ZIP 移除 `file-saver`，增加路径、条目、字节、压缩级别和并发重入保护，Excel 报表改为真实 XLSX。
- 下载统一处理 Response/Blob/TypedArray/axios 响应、服务端文件名和 JSON 错误；无 Content-Length 时仍边读边执行内存上限。
- 分片上传支持已完成分片、字节进度、可取消重试与合并；分片下载新增 `ChunkDownloadSink`，可真正逐块落盘，缓冲模式强制限额。
- File/Image/XML/Base64 增加循环引用、控制字符、像素、文件大小、输出大小和浏览器能力检查，并补充企业安全与 2.x 迁移文档。

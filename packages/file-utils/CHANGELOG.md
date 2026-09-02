# @robot-admin/file-utils

## 3.0.0

### Major Changes

- eba5df3: 将文件工具升级为具备隔离配置、统一错误、安全上限与真流式传输能力的 3.x 架构。

  - 新增 `createFileUtils()`、不可变 `FileUtilsContext`、统一 `FileUtilsError`/`FileProgress`、取消信号和所有模块的公开子路径导出。
  - CSV/Excel 增加公式注入防护、严格表头和行列限制；Excel 更新到 SheetJS 官方 0.20.3 发布包并限制工作表范围。
  - ZIP 移除 `file-saver`，增加路径、条目、字节、压缩级别和并发重入保护，Excel 报表改为真实 XLSX。
  - 下载统一处理 Response/Blob/TypedArray/axios 响应、服务端文件名和 JSON 错误；无 Content-Length 时仍边读边执行内存上限。
  - 分片上传支持已完成分片、字节进度、可取消重试与合并；分片下载新增 `ChunkDownloadSink`，可真正逐块落盘，缓冲模式强制限额。
  - File/Image/XML/Base64 增加循环引用、控制字符、像素、文件大小、输出大小和浏览器能力检查，并补充企业安全与 2.x 迁移文档。

## 2.0.0

### Major Changes

- **Breaking:** ZIP export helpers now rethrow failures after updating export state, allowing callers to handle errors with `try/catch` instead of receiving a silent failure result.
- **Breaking:** CSV parsing now enforces RFC 4180 quoting rules and rejects malformed quoting or duplicate headers; generated rows use CRLF line endings.
- Sanitize ZIP paths against absolute paths, drive prefixes, parent traversal, control characters and Windows reserved names; reject collisions after normalization.
- Add XML tag-name validation and clearer Base64/JSON read errors.
- Harden Canvas context acquisition and chunk option validation; add a fifth `AbortSignal` argument to upload callbacks so aborts cancel in-flight work.
- Include file size in sampled SHA-256 fingerprints and report unsupported `crypto.subtle` environments explicitly.
- Externalize `xlsx`, `jszip` and `file-saver` from the library bundles, reducing duplicate output substantially.

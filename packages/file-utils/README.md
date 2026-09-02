# @robot-admin/file-utils

面向浏览器和 Vue 3 应用的企业级文件工具集：Excel、下载、ZIP、CSV、JSON/XML、图片和大文件分片传输。统一提供隔离配置、资源上限、结构化错误、取消信号和进度模型。

[![npm version](https://img.shields.io/npm/v/@robot-admin/file-utils.svg)](https://www.npmjs.com/package/@robot-admin/file-utils)
[![license](https://img.shields.io/npm/l/@robot-admin/file-utils.svg)](./LICENSE)

当前主版本：`3.x`。

## 设计目标

- 安全默认值：公式注入防护、危险表头拒绝、路径清洗、XML 转义、严格 Base64、尺寸与数量上限。
- 可取消：下载、分片上传/下载、Excel 读取、CSV/File/Image 操作均可接入 `AbortSignal`。
- 可观测：统一 `FileProgress`、响应式状态、消息/通知适配器和稳定错误码。
- 可隔离：推荐 `createFileUtils()`；全局 `configureFileUtils()` 仅作兼容。
- 可组合：ESM、CommonJS、声明文件，以及每个模块的显式子路径导出。
- 大文件可控：普通下载有内存上限；分片下载传入 sink 时逐块落盘，不保留完整文件。

## 安装

```bash
npm install @robot-admin/file-utils
# 或
bun add @robot-admin/file-utils
```

`vue >=3.3` 是 peer dependency。Excel 使用 SheetJS 官方发布的 `xlsx 0.20.3`，ZIP 使用 `jszip`；包内不再依赖 `file-saver`。

## 推荐初始化方式

为每个应用、租户、SSR 请求或测试创建隔离实例：

```ts
import { createFileUtils } from "@robot-admin/file-utils";

export const files = createFileUtils({
  onMessage: (type, text) => message[type](text),
  onNotification: (type, content, duration) =>
    notification[type]({ content, duration }),
  logger,
  limits: {
    maxFileSize: 200 * 1024 * 1024,
    maxRows: 200_000,
    maxBufferedDownloadSize: 128 * 1024 * 1024,
  },
});

const rows = files.csv.parse(csvText);
await files.excel.exportToExcel(rows, { fileName: "report.xlsx" });
```

实例包含 `csv`、`file`、`image`、`excel`、`zip`、`download()`、`chunkUpload()` 和 `chunkDownload()`。配置对象和合并后的限额会被冻结，实例之间不会互相污染。

兼容旧应用的全局配置：

```ts
import {
  configureFileUtils,
  resetFileUtilsConfig,
} from "@robot-admin/file-utils";

configureFileUtils({ onMessage, onNotification, limits });
// 测试或应用销毁时可调用 resetFileUtilsConfig()
```

未配置消息适配器时默认静默，不会写入控制台；需要诊断输出时显式传入 `logger`。

## 默认资源上限

| 配置 | 默认值 | 约束范围 |
| --- | ---: | --- |
| `maxFileSize` | 100 MiB | Excel、下载、CSV/File/Image、上传 |
| `maxRows` | 100,000 | CSV、Excel |
| `maxColumns` | 1,000 | CSV、Excel |
| `maxFieldLength` | 1,000,000 字符 | CSV 单字段 |
| `maxOutputSize` | 256 MiB | CSV、Excel、JSON/XML、Base64 |
| `maxImagePixels` | 40,000,000 | 图片输入和输出画布 |
| `maxArchiveFiles` | 10,000 | ZIP 条目 |
| `maxArchiveSize` | 1 GiB | ZIP 原始内容和生成结果 |
| `maxBufferedDownloadSize` | 512 MiB | 无 sink 的分片下载 |

可在实例级覆盖，也可在具体操作中进一步收紧。所有实例级上限必须是大于等于 0 的安全整数，非法配置会在创建上下文时立即抛出 `INVALID_ARGUMENT`，不会延迟到文件处理中才暴露。上限不是服务端校验、病毒扫描或内容安全网关的替代品。

## 结构化错误

```ts
import { FileUtilsError } from "@robot-admin/file-utils";

try {
  await operation();
} catch (error) {
  if (error instanceof FileUtilsError) {
    console.log(error.code, error.message, error.details, error.cause);
  }
}
```

错误码包括：`ABORTED`、`INVALID_ARGUMENT`、`INVALID_CONTENT`、`LIMIT_EXCEEDED`、`NETWORK_ERROR`、`NOT_SUPPORTED`、`READ_FAILED`、`WRITE_FAILED`。

## Excel

```ts
import { useExcel } from "@robot-admin/file-utils/excel";

const excel = useExcel();

const sheets = await excel.readFile(file, {
  signal: controller.signal,
  maxSheets: 20,
  maxRows: 50_000,
  maxColumns: 200,
});

await excel.exportToExcel(sheets.Orders, {
  fileName: "orders.xlsx",
  sheetName: "Orders",
  formulaPolicy: "escape",
  autoFitColumns: true,
  signal: controller.signal,
});

await excel.exportMultipleSheets(
  { Orders: orderRows, Summary: summaryRows },
  "report.xlsx",
);
```

读取时会在对象转换前校验工作表数量、`!ref` 行列范围、空表头、重复表头和 `__proto__`/`prototype`/`constructor` 等危险表头；公式、HTML 和富文本派生字段默认不解析。导出时公式策略为：

- `escape`：默认，在 `= + - @ tab CR` 前添加单引号。
- `reject`：发现潜在公式即抛出 `INVALID_CONTENT`。
- `preserve`：保留原值，仅用于完全可信数据。

工作表名会清洗非法字符、截断到 31 字符并自动去重。生成结果在触发浏览器下载前会校验大小。

## 通用下载

```ts
import {
  FileType,
  useDownload,
} from "@robot-admin/file-utils/download";

const result = await useDownload(
  async (params, { signal, onProgress } = {}) =>
    api.downloadReport(params, { signal, onProgress }),
  {
    fileName: "monthly-report",
    fileType: FileType.XLSX,
    params: { month: "2026-09" },
    signal: controller.signal,
    maxFileSize: 100 * 1024 * 1024,
    onProgress: ({ loaded, total, percent, speed, eta }) => {
      updateProgress({ loaded, total, percent, speed, eta });
    },
    save: async (blob, fileName) => customStorage.save(blob, fileName),
  },
);
```

支持 `Blob`、`ArrayBuffer`、TypedArray、`Response` 和 axios 风格 `{ data, headers }`。功能包括：

- 检查 HTTP 状态与大小，并在无 `Content-Length` 时边读边限制内存。
- 解析 RFC 兼容的 `Content-Disposition` 文件名并进行文件名清洗。
- 下载非 JSON 文件时检测小型 JSON 错误响应，避免把登录过期信息保存成 `.xlsx`。
- `save` 适配器可接入桌面端、对象存储或测试；默认使用浏览器 Blob URL。

快捷方法：`useDownloadExcel`、`useDownloadCSV`、`useDownloadPDF`、`useDownloadJSON`。

## ZIP

```ts
import { useJSZip } from "@robot-admin/file-utils/zip";

const zipTools = useJSZip();
const zip = zipTools.createZip();

zipTools.addFile(zip, "docs/readme.txt", "Hello");
await zipTools.downloadZip(zip, "bundle.zip", {
  compressionLevel: 6,
  signal: controller.signal,
  maxArchiveFiles: 1000,
  maxArchiveSize: 256 * 1024 * 1024,
});
```

ZIP 内路径会去除盘符、绝对路径、父级穿越、控制字符、非法字符和 Windows 保留名；规范化后重名会明确报错，不会覆盖。添加文件时同步限制条目数量与原始字节数，生成时再次检查输出大小。

场景方法：

```ts
await zipTools.exportCodeProject({
  projectName: "portal",
  framework: "vue",
  includeConfig: true,
  includeReadme: true,
  files,
  operation: { signal: controller.signal },
});

await zipTools.exportReport({
  title: "orders",
  format: "excel", // 生成真实 .xlsx，不再用 CSV 伪装
  data: rows,
  includeSummary: true,
});
```

另有 `exportMedia()` 与 `exportTemplates()`。所有高层方法阻止同一实例并发重入，成功或失败都会更新 `state.lastResult`，失败继续向调用方抛出 `FileUtilsError`。

## CSV

```ts
import { useCSV } from "@robot-admin/file-utils/csv";

const csv = useCSV();
const rows = csv.parse(text, {
  delimiter: ",",
  strictColumnCount: true,
  dangerousHeaders: "reject",
  maxRows: 20_000,
});

const output = csv.generate(rows, {
  withBOM: true,
  formulaPolicy: "escape",
});
```

解析器覆盖 RFC 4180 引号、转义双引号、字段内 CRLF 和多字符分隔符，并拒绝未闭合引号、非法引号后内容、空/重复/危险表头以及列数不一致。结果对象使用 null prototype，降低原型污染风险。行、列、字段长度和输出字节数均在操作过程中受限。

## JSON、XML 与 Base64

```ts
import { useFile } from "@robot-admin/file-utils/file";

const files = useFile();

const text = await files.readAsText(file, 2 * 1024 * 1024, signal);
const config = await files.readAsJSON<AppConfig>(jsonFile, {
  maxFileSize: 2 * 1024 * 1024,
  signal,
});

files.downloadXML(data, {
  rootName: "users",
  invalidTagStrategy: "reject",
  maxDepth: 30,
  maxNodes: 10_000,
  signal,
});
```

XML 会转义文本、拒绝 XML 1.0 非法控制字符、检测循环引用、深度/节点上限和清洗后标签冲突。JSON 序列化失败、解析失败和顶层不可序列化值会转换为结构化错误。Base64 会严格校验字符、填充与输出大小。

## 图片

```ts
import {
  detectImageMimeType,
  useImage,
} from "@robot-admin/file-utils/image";

// 默认保持兼容；处理不可信位图时可启用文件签名校验
const image = useImage({ verifyMimeType: true });

const compressed = await image.compress(file, {
  quality: 0.8,
  maxWidth: 1600,
  maxHeight: 1600,
  type: "image/webp",
  maxPixels: 20_000_000,
  signal,
});

const cropped = await image.crop(file, {
  x: 0,
  y: 0,
  width: 400,
  height: 400,
  signal,
});

const detectedType = await detectImageMimeType(file, signal);
```

支持 `compress`、`crop`、`convert`、`resize`、`getInfo`、`toBase64`。库校验 MIME、文件大小、质量、整数尺寸、裁剪边界、像素上限和浏览器实际输出 MIME。`verifyMimeType` 是兼容性安全开关，启用后会校验 PNG、JPEG、GIF、WebP、BMP、TIFF、ICO、AVIF 和 HEIC 等常见位图签名，并拒绝声明 MIME 与签名不一致的内容；SVG 或业务私有格式应保持关闭并交给服务端内容网关检查。JPEG 默认用白色填充透明区域，可通过 `backgroundColor` 修改。

Canvas 解码仍会消耗浏览器内存；处理不可信超大图片时应在上传网关同步限制字节数和图像尺寸。

## 可续传分片上传

```ts
import { useChunkUpload } from "@robot-admin/file-utils/chunk";

const uploader = useChunkUpload({
  chunkSize: 5 * 1024 * 1024,
  concurrent: 3,
  retries: 3, // 首次失败后的额外重试次数；0 表示不重试
  retryDelay: (attempt) => attempt * 1000,
  shouldRetry: ({ error }) => isTransientNetworkError(error),
  onRetry: ({ chunkIndex, attempt, delay }) =>
    auditRetry({ chunkIndex, attempt, delay }),
  hashMode: "sampled", // 默认；需要标准全文件 SHA-256 时显式使用 "full"
});

const result = await uploader.upload(
  file,
  async (chunk, index, total, hash, signal) => {
    await api.uploadChunk({ chunk, index, total, hash, signal });
  },
  async (fileName, total, hash, signal) => {
    await api.mergeChunks({ fileName, total, hash, signal });
  },
  {
    signal: controller.signal,
    completedChunks: serverState.completedChunks,
    onProgress: ({ loaded, total, percent, speed, eta }) =>
      updateProgress({ loaded, total, percent, speed, eta }),
  },
);
```

同一实例拒绝并发上传。进度按实际字节计算，断点续传会跳过 `completedChunks`，分片失败会取消其他 worker，外部取消会传递到上传和合并回调。内部停止 worker 不会再被误报为用户取消：请求失败返回 `NETWORK_ERROR`，外部取消返回 `ABORTED`。`shouldRetry` 可阻止 4xx、业务校验失败等无意义重试，`onRetry` 只用于观测。进度和重试观测回调抛错不会中断传输或造成分片重复上传；如配置了 `logger` 会记录 warning。返回值包含哈希、分片总数和完成索引。

`sampled` SHA-256 混合文件首尾各 1 MiB 与文件大小，用于上传身份和秒传协商，不是完整文件校验。`hashMode: "full"` 会生成标准全文件 SHA-256，但受 Web Crypto 限制需要在浏览器内存中读取完整 Blob，只适合已受 `maxFileSize` 约束的场景。无论客户端采用哪种模式，需要合规完整性校验时仍应在服务端合并后复算。

## 真流式分片下载

无 sink 时会使用有上限的内存缓冲，并触发浏览器下载：

```ts
const downloader = files.chunkDownload();

await downloader.download(url, "large.zip", {
  maxBufferedSize: 128 * 1024 * 1024,
  signal,
  onProgressDetail: updateProgress,
});
```

大文件应传入 sink，数据会逐块写入，不在库内累积：

```ts
import {
  createWritableStreamSink,
  useChunkDownload,
} from "@robot-admin/file-utils/chunk";

const fileHandle = await window.showSaveFilePicker({
  suggestedName: "large.zip",
});
const writable = await fileHandle.createWritable();
const sink = createWritableStreamSink(writable);

await useChunkDownload().download(url, "large.zip", {
  sink,
  expectedSize: metadata.size,
  signal,
  onProgressDetail: ({ loaded, speed, eta }) =>
    updateProgress({ loaded, speed, eta }),
});
```

File System Access API 的浏览器支持有限；也可以提供自定义 `ChunkDownloadSink` 接入 Electron、Tauri、Service Worker 或其他持久化通道。每块数据写入 sink 前都会检查是否超过 `expectedSize`，下载完成后再次检查精确大小；失败时调用 sink 的 `abort(reason)`，避免把已知越界块继续写入目标。

## 子路径与 Tree-shaking

```ts
import { useCSV } from "@robot-admin/file-utils/csv";
import { useExcel } from "@robot-admin/file-utils/excel";
import { useChunkDownload } from "@robot-admin/file-utils/chunk";
```

公开子路径：`csv`、`file`、`download`、`image`、`excel`、`zip`、`chunk`、`config`。不要依赖包内部 `src` 或未声明的深层路径。

## SSR 与运行环境

- CSV 解析/生成、XML 构造、部分 File 读取、Excel 读取和 ZIP 构造可在具有对应 Web API 的服务端运行。
- 浏览器下载、FileReader、Canvas、Clipboard/File System Access 等能力会在缺失时抛出 `NOT_SUPPORTED`。
- 根模块导入不会主动下载文件或访问 DOM；具体浏览器操作应只在客户端执行。
- 对 Node 服务端批处理，建议注入 `save`/sink，或使用各底层库的服务端写入 API。

## 从 2.x 升级到 3.x

| 变化 | 迁移建议 |
| --- | --- |
| 新增 `createFileUtils()` 隔离实例 | 新应用优先使用；`configureFileUtils()` 继续兼容 |
| 默认不再输出 console 消息 | 显式传 `onMessage`、`onNotification` 或 `logger` |
| 所有主要失败统一为 `FileUtilsError` | 按 `error.code` 处理，不依赖不稳定的文本 |
| CSV/Excel 默认转义潜在公式 | 可信数据才使用 `formulaPolicy: "preserve"` |
| CSV 默认拒绝列数不一致、空/危险表头 | 修复输入，或按需显式放宽对应选项 |
| Excel 读取限制工作表、行列、文件大小 | 根据业务上限覆盖，而不是设置无限值 |
| ZIP 移除 `file-saver`，Excel 报表生成真实 `.xlsx` | 无需改调用；检查旧快照和依赖锁文件 |
| 分片上传 `retries` 表示额外重试次数 | `0` 表示只尝试一次；按新语义调整配置 |
| `abort()` 与外部 AbortSignal 会使 Promise 拒绝 | 捕获 `FileUtilsError` 且判断 `code === "ABORTED"` |
| 分片下载仅在传 sink 时真正不缓冲 | 超大文件接入 `ChunkDownloadSink`；无 sink 时设置合理上限 |
| xlsx 更新为官方 0.20.3 发布包 | 若企业制品库禁用 URL 依赖，请镜像该 tarball 并使用 lockfile 固化 |

## 开发验证

```bash
bun run type-check
bun run test
bun run build
```

测试覆盖 RFC 4180、公式与原型污染防护、下载响应归一化、真流式 sink、预期大小、上传续传/取消/重试分类、sampled/full 哈希、图片签名、Excel 危险表头和 ZIP 路径/资源限制。

## License

[MIT](./LICENSE) © ChenYu

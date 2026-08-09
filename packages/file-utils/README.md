# @robot-admin/file-utils

> 文件处理工具集 - Excel / 下载 / 压缩 / CSV / JSON / XML / 图片处理 / 大文件分片

[![npm version](https://img.shields.io/npm/v/@robot-admin/file-utils.svg)](https://www.npmjs.com/package/@robot-admin/file-utils)
[![license](https://img.shields.io/npm/l/@robot-admin/file-utils.svg)](https://github.com/ChenyCHENYU/robot-admin-packages/blob/main/LICENSE)

当前版本：`2.0.0`。

## 📦 安装

```bash
bun add @robot-admin/file-utils
# 或
npm install @robot-admin/file-utils
```

## ⚡ 快速上手

```typescript
// 1. 初始化（main.ts 中调用一次）
import { configureFileUtils } from "@robot-admin/file-utils";
configureFileUtils({
  onMessage: (type, text) => yourMessageLib[type](text),
  onNotification: (type, content) => yourNotifyLib[type]({ content }),
});

// 2. 在任意组件中使用
import { useExcel, useDownload, FileType } from "@robot-admin/file-utils";

// 一行导出 Excel
const { exportToExcel } = useExcel();
await exportToExcel(tableData, { fileName: "报表.xlsx" });

// 一行下载文件
await useDownload(api.download, { fileName: "报表", fileType: FileType.XLSX });
```

## 🔧 初始化配置

解耦了 UI 框架依赖，需要在项目入口配置消息回调：

```typescript
import { configureFileUtils } from "@robot-admin/file-utils";
import { createDiscreteApi } from "naive-ui/es/discrete";

const { message, notification } = createDiscreteApi([
  "message",
  "notification",
]);

configureFileUtils({
  onMessage: (type, text) => message[type](text),
  onNotification: (type, content, duration) =>
    notification[type]({ content, duration: duration ?? 2000 }),
});
```

> 如果不配置，默认回退到 `console.log` 输出。  
> 支持任意 UI 框架（Naive UI / Element Plus / Ant Design 等），只需替换回调实现。

## 📖 功能模块

### 1. useExcel - Excel 操作

基于 `xlsx` 库，提供 Excel 读取、导出、模板生成等功能。

```typescript
import { useExcel } from "@robot-admin/file-utils";
import type { ExcelConfig, ExcelTemplate } from "@robot-admin/file-utils";

const {
  readFile,
  exportToExcel,
  exportMultipleSheets,
  generateTemplate,
  getPresetTemplates,
} = useExcel();

// 读取 Excel 文件
const data = await readFile(file);

// 导出单表
await exportToExcel(data, { fileName: "报表.xlsx", sheetName: "数据" });

// 导出多表
await exportMultipleSheets({ Sheet1: data1, Sheet2: data2 }, "多表.xlsx");

// 下载模板
const templates = getPresetTemplates();
await generateTemplate(templates[0]);
```

### 2. useDownload - 通用下载

支持 20+ 种文件格式，自动 MIME 类型映射。

```typescript
import {
  useDownload,
  useDownloadExcel,
  FileType,
} from "@robot-admin/file-utils";
import type { DownloadConfig } from "@robot-admin/file-utils";

// 通用下载
await useDownload(api.downloadReport, {
  fileName: "月度报表",
  fileType: FileType.XLSX,
  params: { month: "2025-01" },
});

// 快捷下载（Excel / CSV / PDF / JSON）
await useDownloadExcel(api.downloadReport, "月度报表");
```

### 3. useJSZip - 文件压缩

基于 `jszip` + `file-saver`，提供 4 种场景预设。

```typescript
import { useJSZip } from "@robot-admin/file-utils";

const jszip = useJSZip();

// 导出代码项目
await jszip.exportCodeProject({
  projectName: "my-app",
  framework: "vue",
  files: [{ path: "main.ts", content: "..." }],
});

// 导出报表
await jszip.exportReport({
  title: "月度报表",
  format: "csv",
  data: reportData,
});

// 基础用法
const zip = jszip.createZip();
jszip.addFile(zip, "hello.txt", "Hello World");
await jszip.downloadZip(zip, "output.zip");
```

ZIP 内路径会统一分隔符，并清理盘符、绝对路径、父级穿越、控制字符及 Windows
保留名。清理后发生路径冲突时会抛错，不会静默覆盖已有文件。所有高层导出方法
在失败时会更新 `state.lastResult`、触发错误通知，并继续向调用方抛出原始错误：

```typescript
try {
  await jszip.exportCodeProject(config);
} catch (error) {
  // 可在此记录错误、恢复 UI 或提示重试
}
```

### 4. useCSV - CSV 处理 <sup>v1.1</sup>

按 RFC 4180 解析和生成 CSV，支持引号字段内换行、双引号转义、自定义分隔符、
CRLF 输出和 Excel UTF-8 BOM。解析器会拒绝未闭合引号、未转义引号、非法的
引号后内容与重复表头，避免损坏数据被静默接受。

```typescript
import { useCSV } from "@robot-admin/file-utils";

const csv = useCSV();

// 解析 CSV 字符串
const data = csv.parse(csvString, { delimiter: "," });

// 引号内换行和双引号会被正确还原
csv.parse('name,note\r\nAlice,"line 1\r\nline 2"\r\nBob,"say ""hi"""');

// 生成 CSV 并下载
csv.download(data, "导出.csv");

// 读取 CSV 文件
const fileData = await csv.readFile(file);
```

### 5. useFile - 文件工具 <sup>v1.1</sup>

Base64 转换、JSON/XML 下载、文件读取等通用文件操作。

```typescript
import { useFile } from "@robot-admin/file-utils";

const file = useFile();

// Base64 互转
const base64 = await file.toBase64(imageFile);
const restored = file.fromBase64(base64, "image.png");

// 下载为 JSON / XML
file.downloadJSON(data, "config.json");
file.downloadXML(data, { rootName: "users", fileName: "users.xml" });

// 读取文件
const json = await file.readAsJSON<Config>(jsonFile);
const text = await file.readAsText(txtFile);
```

### 6. useImage - 图片处理 <sup>v1.1</sup>

基于浏览器 Canvas API，零外部依赖。

```typescript
import { useImage } from "@robot-admin/file-utils";
import type {
  CompressOptions,
  CropOptions,
  ImageInfo,
} from "@robot-admin/file-utils";

const image = useImage();

// 压缩图片
const compressed = await image.compress(file, { quality: 0.6, maxWidth: 1200 });

// 裁剪图片
const cropped = await image.crop(file, { x: 0, y: 0, width: 300, height: 300 });

// 格式转换（png → webp）
const webp = await image.convert(file, "webp");

// 缩放图片（宽 800px，高自动）
const resized = await image.resize(file, 800);

// 获取图片信息
const info = await image.getInfo(file);
// → { width: 1920, height: 1080, type: 'image/png', size: 204800 }
```

### 7. useChunkUpload / useChunkDownload - 大文件分片 <sup>v2.0</sup>

支持并发控制、失败重试、SHA-256 秒传指纹、进度追踪、中止操作。指纹由文件
首尾采样块与文件大小共同计算，保持标准 64 位十六进制格式；它用于断点续传
身份识别，不等同于完整文件内容校验。

```typescript
import { useChunkUpload, useChunkDownload } from "@robot-admin/file-utils";
import type { ChunkUploadOptions } from "@robot-admin/file-utils";

// === 分片上传 ===
const {
  state: uploadState,
  upload,
  abort: abortUpload,
} = useChunkUpload({
  chunkSize: 5 * 1024 * 1024, // 5MB 分片
  concurrent: 3, // 3 路并发
  retries: 3, // 每个分片最多尝试 3 次（包含首次请求）
});

await upload(
  file,
  async (chunk, index, total, hash, signal) => {
    // 第 5 个参数可直接交给 fetch/axios，使 abort() 能取消在途请求
    await api.uploadChunk({ chunk, index, total, hash, signal });
  },
  async (fileName, totalChunks, hash) => {
    await api.mergeChunks({ fileName, totalChunks, hash });
  },
);

// 响应式进度
console.log(uploadState.value.progress); // 0-100
console.log(uploadState.value.speed); // bytes/sec

// === 分片下载 ===
const { state: dlState, download, abort: abortDl } = useChunkDownload();

await download("https://example.com/large.zip", "large.zip", {
  onProgress: (p) => console.log(`${p}%`),
});
```

## 🏗️ 架构设计

```
@robot-admin/file-utils
├── configureFileUtils()   ← 全局配置（解耦 UI 框架）
│
│  ── v1.0 核心模块 ──
├── useExcel()             ← Excel 读写 / 模板      [xlsx]
├── useDownload()          ← 通用文件下载            [零依赖]
├── useJSZip()             ← 压缩导出 / 4 种预设     [jszip, file-saver]
│
│  ── v1.1 扩展模块 ──
├── useCSV()               ← CSV 解析 / 生成         [零依赖]
├── useFile()              ← Base64 / JSON / XML     [零依赖]
├── useImage()             ← 压缩 / 裁剪 / 格式转换   [零依赖, Canvas API]
│
│  ── v2.0 高级模块 ──
├── useChunkUpload()       ← 分片上传 / 并发 / 重试   [零依赖]
└── useChunkDownload()     ← 流式下载 / 进度          [零依赖]
```

## 📋 依赖说明

| 依赖         | 类型           | 用途                                           |
| ------------ | -------------- | ---------------------------------------------- |
| `xlsx`       | dependency     | Excel 读写（仅 useExcel）                      |
| `jszip`      | dependency     | 文件压缩（仅 useJSZip）                        |
| `file-saver` | dependency     | 文件保存（仅 useJSZip）                        |
| `vue`        | peerDependency | 响应式状态（useExcel / useJSZip / useChunk\*） |

> `xlsx`、`jszip`、`file-saver` 会作为依赖安装，但不会被重复打入本包产物；应用
> 打包器可以统一去重。useDownload、useCSV、useFile、useImage 为纯函数，不依赖
> Vue，可在任意 JS/TS 项目中使用。

## 从 v1.x 升级到 v2.0.0

v2.0.0 的主要不兼容点是错误传播与 CSV 的严格语义，请在升级前检查：

| 变更 | 迁移方式 |
|------|----------|
| ZIP 高层导出失败后会抛出错误 | 在需要恢复 UI 或自定义提示的位置使用 `try/catch` |
| CSV 生成统一使用 RFC 4180 的 `\r\n` | 若快照或后端严格比较换行符，请同步预期值 |
| CSV 解析拒绝畸形引号和重复表头 | 在导入界面捕获 `SyntaxError` 并提示用户修正源文件 |
| 分片上传回调新增第 5 个 `AbortSignal` | 旧的四参数回调仍可运行；建议把 signal 传给实际网络请求 |
| ZIP 路径清理后不允许重复 | 生成文件列表前确保规范化后的路径唯一 |

此外，分片大小、并发数和重试次数现在必须是大于 0 的整数；不支持
`crypto.subtle` 的非安全上下文会给出明确错误，不再隐式失败。

## 🔤 TypeScript 支持

所有类型均可按需导入：

```typescript
import type {
  // Excel
  ExcelData,
  ExcelConfig,
  ExcelTemplate,
  // 下载
  DownloadConfig,
  FileType,
  // 压缩
  ExportState,
  CodeProjectConfig,
  ReportConfig,
  // CSV
  CSVOptions,
  // 文件
  XMLOptions,
  // 图片
  CompressOptions,
  CropOptions,
  ImageInfo,
  ImageFormat,
  // 分片
  ChunkUploadOptions,
  ChunkUploadState,
  ChunkDownloadState,
} from "@robot-admin/file-utils";
```

## 📄 License

MIT © [ChenYu](https://github.com/ChenyCHENYU)

/**
 * @description 基于 JSZip 的文件压缩导出 Hook
 * 已解耦 naive-ui，消息通知通过 configureFileUtils 注入
 */

import { ref, computed } from "vue";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { getMessageHandler } from "../config";
import { useCSV } from "../csv";
import type { ExportResult } from "../types";

// ==================== 类型定义 ====================

export interface ExportState {
  loading: boolean;
  progress: number;
  currentFile: string;
  lastResult: ExportResult | null;
}

export interface CodeProjectConfig {
  projectName: string;
  framework?: "vue" | "react" | "nodejs" | "vanilla";
  includeConfig?: boolean;
  includeReadme?: boolean;
  files: Array<{ path: string; content: string }>;
}

export interface ReportConfig {
  title: string;
  format: "excel" | "csv" | "json";
  data: Record<string, any>[];
  includeSummary?: boolean;
}

export interface MediaConfig {
  packageName: string;
  files: Array<{ name: string; file: File | Blob; category?: string }>;
  organizeByCategory?: boolean;
  includeMetadata?: boolean;
}

export interface TemplateConfig {
  libraryName: string;
  templates: Array<{
    id: string;
    name: string;
    files: Record<string, string>;
  }>;
  bundleMode?: "separate" | "combined";
  includeDocumentation?: boolean;
}

type MediaFolderType = "image" | "video" | "audio" | "other";

interface MediaFolders {
  image: JSZip;
  video: JSZip;
  audio: JSZip;
  other: JSZip;
}

// ==================== 主 Hook ====================

/**
 * @description JSZip Hook - 提供文件压缩导出功能
 * @example
 * ```ts
 * import { useJSZip } from '@robot-admin/file-utils'
 *
 * const jszip = useJSZip()
 *
 * // 导出代码项目
 * await jszip.exportCodeProject({
 *   projectName: 'my-app',
 *   files: [{ path: 'index.ts', content: '...' }]
 * })
 * ```
 */
export function useJSZip() {
  const message = getMessageHandler();

  // ==================== 状态管理 ====================
  const state = ref<ExportState>({
    loading: false,
    progress: 0,
    currentFile: "",
    lastResult: null,
  });

  // ==================== 基础工具函数 ====================

  const createZip = () => new JSZip();

  const addFile = (zip: JSZip, fileName: string, content: string | Blob) => {
    zip.file(fileName, content);
  };

  const createFolder = (zip: JSZip, folderName: string) =>
    zip.folder(folderName)!;

  const updateProgress = (progress: number, fileName = "") => {
    state.value.progress = progress;
    state.value.currentFile = fileName;
  };

  const downloadZip = async (zip: JSZip, fileName: string) => {
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, fileName);
  };

  const showResult = (result: ExportResult) => {
    state.value.lastResult = result;
    state.value.loading = false;

    if (result.success) {
      message("success", result.message);
    } else {
      message("error", result.message);
    }
  };

  // ==================== 通用执行器 ====================

  const executeExport = async <T>(
    config: T,
    executor: (
      zip: JSZip,
      config: T,
    ) => Promise<{ fileName: string; fileCount: number }>,
    successMessage: string,
  ): Promise<ExportResult> => {
    state.value.loading = true;
    updateProgress(0, "准备中...");

    try {
      const zip = createZip();
      const { fileName, fileCount } = await executor(zip, config);

      updateProgress(90, "生成压缩文件...");
      await downloadZip(zip, fileName);
      updateProgress(100);

      const result: ExportResult = {
        success: true,
        fileName,
        fileCount,
        message: successMessage,
      };

      showResult(result);
      return result;
    } catch (error) {
      const result: ExportResult = {
        success: false,
        fileName: "",
        fileCount: 0,
        message: `导出失败: ${(error as Error).message}`,
      };

      showResult(result);
      return result;
    }
  };

  // ==================== 场景实现 ====================

  const exportCodeProject = async (config: CodeProjectConfig) => {
    return executeExport(
      config,
      async (zip, cfg) => {
        const srcFolder = cfg.framework ? createFolder(zip, "src") : zip;

        cfg.files.forEach((file, index) => {
          addFile(srcFolder, file.path, file.content);
          updateProgress(10 + (index / cfg.files.length) * 60, file.path);
        });

        if (cfg.includeConfig) {
          const packageJson = createPackageJson(cfg);
          addFile(zip, "package.json", JSON.stringify(packageJson, null, 2));
          updateProgress(75, "package.json");
        }

        if (cfg.includeReadme) {
          const readme = createReadme(cfg);
          addFile(zip, "README.md", readme);
          updateProgress(85, "README.md");
        }

        return {
          fileName: `${cfg.projectName}.zip`,
          fileCount: cfg.files.length,
        };
      },
      `项目 ${config.projectName} 导出成功！`,
    );
  };

  const exportReport = async (config: ReportConfig) => {
    return executeExport(
      config,
      async (zip, cfg) => {
        updateProgress(20, "处理数据...");

        const content =
          cfg.format === "csv"
            ? generateCSV(cfg.data)
            : JSON.stringify(cfg.data, null, 2);
        const ext = cfg.format === "excel" ? "csv" : cfg.format;
        addFile(zip, `${cfg.title}.${ext}`, content);
        updateProgress(60, `${cfg.title}.${ext}`);

        if (cfg.includeSummary) {
          const summary = {
            title: cfg.title,
            totalRecords: cfg.data.length,
            exportTime: new Date().toISOString(),
          };
          addFile(zip, "summary.json", JSON.stringify(summary, null, 2));
          updateProgress(80, "summary.json");
        }

        return {
          fileName: `${cfg.title}_report.zip`,
          fileCount: cfg.data.length,
        };
      },
      `报表 ${config.title} 导出成功！包含 ${config.data.length} 条数据`,
    );
  };

  const exportMedia = async (config: MediaConfig) => {
    return executeExport(
      config,
      async (zip, cfg) => {
        const folders: MediaFolders | null = cfg.organizeByCategory
          ? {
              image: createFolder(zip, "images"),
              video: createFolder(zip, "videos"),
              audio: createFolder(zip, "audios"),
              other: createFolder(zip, "others"),
            }
          : null;

        const mediaInfo: any[] = [];

        for (let i = 0; i < cfg.files.length; i++) {
          const file = cfg.files[i];
          const category = (file.category || "other") as MediaFolderType;
          const targetFolder = folders
            ? folders[category] || folders.other
            : zip;

          addFile(targetFolder, file.name, file.file);

          if (cfg.includeMetadata) {
            mediaInfo.push({
              name: file.name,
              size: file.file.size,
              type: file.file.type,
              category: file.category,
            });
          }

          updateProgress(20 + (i / cfg.files.length) * 60, file.name);
        }

        if (cfg.includeMetadata && mediaInfo.length) {
          addFile(zip, "media-info.json", JSON.stringify(mediaInfo, null, 2));
        }

        return {
          fileName: `${cfg.packageName}.zip`,
          fileCount: cfg.files.length,
        };
      },
      `媒体包 ${config.packageName} 导出成功！`,
    );
  };

  const exportTemplates = async (config: TemplateConfig) => {
    return executeExport(
      config,
      async (zip, cfg) => {
        if (cfg.bundleMode === "separate") {
          cfg.templates.forEach((template, index) => {
            const folder = createFolder(zip, template.name);
            Object.entries(template.files).forEach(([path, content]) => {
              addFile(folder, path, content);
            });
            updateProgress(
              20 + (index / cfg.templates.length) * 60,
              template.name,
            );
          });
        } else {
          cfg.templates.forEach((template) => {
            Object.entries(template.files).forEach(([path, content]) => {
              addFile(zip, `${template.name}/${path}`, content);
            });
          });
        }

        if (cfg.includeDocumentation) {
          const docs = createTemplateDoc(cfg);
          addFile(zip, "README.md", docs);
          updateProgress(85, "README.md");
        }

        return {
          fileName: `${cfg.libraryName}_templates.zip`,
          fileCount: cfg.templates.length,
        };
      },
      `模板库 ${config.libraryName} 导出成功！`,
    );
  };

  // ==================== 辅助函数 ====================

  function createPackageJson(config: CodeProjectConfig) {
    const deps = {
      vue: { vue: "^3.4.0" },
      react: { react: "^18.0.0" },
      nodejs: { express: "^4.18.0" },
      vanilla: {},
    };

    return {
      name: config.projectName,
      version: "1.0.0",
      dependencies: deps[config.framework || "vanilla"],
    };
  }

  function createReadme(config: CodeProjectConfig) {
    return `# ${config.projectName}

## 技术栈
${config.framework ? `- ${config.framework}` : "- Vanilla JavaScript"}

## 安装
\`\`\`bash
npm install
\`\`\`

## 使用
\`\`\`bash
npm run dev
\`\`\`

生成时间: ${new Date().toLocaleString()}`;
  }

  function generateCSV(data: Record<string, any>[]) {
    return useCSV().generate(data);
  }

  function createTemplateDoc(config: TemplateConfig) {
    return `# ${config.libraryName}

## 包含模板
${config.templates.map((t) => `- ${t.name}`).join("\n")}

## 使用方法
1. 解压到目标目录
2. 选择需要的模板
3. 根据文档配置

生成时间: ${new Date().toLocaleString()}`;
  }

  // ==================== 返回接口 ====================
  return {
    createZip,
    addFile,
    createFolder,
    downloadZip,
    state: computed(() => state.value),
    exportCodeProject,
    exportReport,
    exportMedia,
    exportTemplates,
  };
}

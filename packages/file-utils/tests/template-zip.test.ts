// @vitest-environment happy-dom

import { afterEach, expect, it, vi } from "vitest";
import { useJSZip, type TemplateConfig } from "../src/zip";

afterEach(() => vi.restoreAllMocks());

const config: TemplateConfig = {
  libraryName: "templates",
  includeDocumentation: true,
  templates: [
    { id: "vue", name: "Vue", files: { "main.ts": "content" } },
    { id: "utils", name: "Utils", files: { "utils.ts": "helper" } },
  ],
};

it("keeps template folders in separate mode and uses the archive root in combined mode", async () => {
  const url = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:template-zip");
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  const exporter = useJSZip();

  for (const bundleMode of ["separate", "combined"] as const) {
    await expect(exporter.exportTemplates({ ...config, bundleMode })).resolves.toMatchObject({
      fileName: "templates_templates.zip",
      fileCount: 3,
    });
    const blob = url.mock.lastCall?.[0];
    if (!(blob instanceof Blob)) throw new Error("Expected a template ZIP Blob");
    const zip = await exporter.createZip().loadAsync(await blob.arrayBuffer());
    const paths = Object.values(zip.files).filter((entry) => !entry.dir).map((entry) => entry.name);
    expect(paths).toEqual(
      bundleMode === "separate"
        ? ["Vue/main.ts", "Utils/utils.ts", "README.md"]
        : ["main.ts", "utils.ts", "README.md"],
    );
    expect(await zip.file("README.md")?.async("string")).toContain("- Utils");
  }
});

it("rejects normalized filename collisions and conflicts with generated README", async () => {
  const download = vi.spyOn(URL, "createObjectURL");
  const exporter = useJSZip();
  await expect(exporter.exportTemplates({
    ...config,
    bundleMode: "combined",
    templates: [...config.templates, { id: "repeat", name: "Other", files: { "./main.ts": "duplicate" } }],
  })).rejects.toThrow("ZIP 内存在重复文件路径：main.ts");
  await expect(exporter.exportTemplates({
    ...config,
    bundleMode: "combined",
    templates: [{ id: "doc", name: "Docs", files: { "README.md": "duplicate" } }],
  })).rejects.toThrow("ZIP 内存在重复文件路径：README.md");
  expect(download).not.toHaveBeenCalled();
});

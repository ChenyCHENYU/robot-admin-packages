// @vitest-environment happy-dom

import { afterEach, expect, it, vi } from "vitest";
import { planMediaArchive, useJSZip } from "../src/zip";

afterEach(() => vi.restoreAllMocks());

it("plans the same sanitized paths, categories and metadata written to the ZIP", async () => {
  const url = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:media-zip");
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  const config = {
    packageName: "media",
    organizeByCategory: true,
    includeMetadata: true,
    files: [{ name: "../cover?.png", file: new Blob(["cover"], { type: "image/png" }), category: "image" }],
  };
  const paths = planMediaArchive(config);
  expect(paths).toEqual(["images/cover_.png", "media-info.json"]);
  const exporter = useJSZip();
  await expect(exporter.exportMedia(config)).resolves.toMatchObject({ fileCount: paths.length });
  const [blob] = url.mock.calls[0];
  if (!(blob instanceof Blob)) throw new Error("Expected a ZIP Blob");
  const zip = await exporter.createZip().loadAsync(await blob.arrayBuffer());
  expect(Object.values(zip.files).filter(entry => !entry.dir).map(entry => entry.name)).toEqual(paths);
  expect(await zip.file(paths[0])?.async("string")).toBe("cover");
  expect(planMediaArchive({ ...config, organizeByCategory: false, includeMetadata: false })).toEqual(["cover_.png"]);
});

it("rejects input that collides with the metadata file or normalizes to the same path", () => {
  const file = new Blob(["content"]);
  expect(() => planMediaArchive({ files: [{ name: "media-info.json", file }], includeMetadata: true })).toThrow("ZIP 内存在重复文件路径：media-info.json");
  expect(() => planMediaArchive({ files: [{ name: "a?.txt", file }, { name: "a*.txt", file }] })).toThrow("ZIP 内存在重复文件路径：a_.txt");
  expect(planMediaArchive({ files: [], includeMetadata: true })).toEqual([]);
});

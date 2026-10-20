import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createFileUtils,
  configureFileUtils,
  resetFileUtilsConfig,
  FileType,
  useDownload,
  useDownloadCSV,
  useDownloadExcel,
  useDownloadJSON,
  useDownloadPDF,
  type DownloadRequestContext,
} from "../src";

afterEach(() => {
  resetFileUtilsConfig();
  vi.unstubAllGlobals();
});

describe("inferred download API runtime contracts", () => {
  it("passes the typed query and cancellation/progress context unchanged", async () => {
    const controller = new AbortController();
    const query = { reportId: 7 };
    const progress = vi.fn();
    const api = vi.fn(
      async (_query: typeof query, _context?: DownloadRequestContext) =>
        new Blob(["report"]),
    );
    const save = vi.fn();
    const result = await useDownload(api, {
      fileType: FileType.PDF,
      fileName: "report",
      params: query,
      signal: controller.signal,
      onProgress: progress,
      showNotification: false,
      save,
    });
    expect(api).toHaveBeenCalledWith(query, {
      signal: controller.signal,
      onProgress: progress,
    });
    expect(api.mock.calls[0][0]).toBe(query);
    expect(result).toMatchObject({ fileName: "report.pdf", size: 6 });
    expect(save).toHaveBeenCalledWith(result.blob, "report.pdf");
  });

  it("keeps omitted optional queries undefined and supports parameterless APIs", async () => {
    const optional = vi.fn(
      async (_query?: { reportId: number }) => new Blob(["optional"]),
    );
    const noArgs = vi.fn(async () => new Blob(["none"]));
    const config = {
      fileType: FileType.PDF,
      fileName: "report",
      showNotification: false,
      save: vi.fn(),
    };
    await useDownload(optional, config);
    await useDownload(noArgs, config);
    expect(optional.mock.calls[0][0]).toBeUndefined();
    expect(noArgs).toHaveBeenCalledOnce();
  });

  it("scoped downloads preserve their context and wait for an asynchronous save", async () => {
    const events: string[] = [];
    const scoped = createFileUtils({
      onNotification: (kind) => events.push(kind),
    });
    let finishSave!: () => void;
    const saved = new Promise<void>((resolve) => {
      finishSave = resolve;
    });
    const query = { reportId: 9 };
    const api = vi.fn(async (_query: typeof query) => new Blob(["scoped"]));
    let completed = false;
    const result = scoped
      .download(api, {
        fileType: FileType.PDF,
        fileName: "scoped",
        params: query,
        save: async () => saved,
      })
      .then((value) => {
        completed = true;
        return value;
      });
    await vi.waitFor(() => expect(events).toEqual(["info"]));
    expect(completed).toBe(false);
    finishSave();
    await expect(result).resolves.toMatchObject({
      fileName: "scoped.pdf",
      size: 6,
    });
    expect(events).toEqual(["info", "success"]);
    expect(api.mock.calls[0][0]).toBe(query);
  });

  it("preserves abort errors before and during the API call", async () => {
    const controller = new AbortController();
    controller.abort();
    const before = vi.fn(async (_query: { reportId: number }) => new Blob());
    const config = {
      fileType: FileType.PDF,
      fileName: "report",
      params: { reportId: 1 },
      showNotification: false,
      save: vi.fn(),
    };
    await expect(
      useDownload(before, { ...config, signal: controller.signal }),
    ).rejects.toMatchObject({ code: "ABORTED" });
    expect(before).not.toHaveBeenCalled();

    const during = new AbortController();
    const api = (
      _query: { reportId: number },
      context?: DownloadRequestContext,
    ) =>
      new Promise<Blob>((_resolve, reject) => {
        expect(context?.signal).toBe(during.signal);
        context?.signal?.addEventListener(
          "abort",
          () => reject(new Error("cancelled")),
          { once: true },
        );
      });
    const pending = useDownload(api, { ...config, signal: during.signal });
    during.abort();
    await expect(pending).rejects.toMatchObject({ code: "ABORTED" });
    expect(config.save).not.toHaveBeenCalled();
  });

  it("every shortcut forwards queries and returns the completed download", async () => {
    const click = vi.fn();
    const remove = vi.fn();
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("document", {
      body: { appendChild: vi.fn() },
      createElement: () => ({
        href: "",
        download: "",
        style: {},
        click,
        remove,
      }),
      defaultView: {
        URL: { createObjectURL: () => "blob:test", revokeObjectURL },
        setTimeout: (callback: () => void) => {
          callback();
          return 0;
        },
      },
    });
    configureFileUtils({ onNotification: vi.fn() });
    const query = { reportId: 11 };
    const api = vi.fn(
      async (_query: typeof query, _context?: DownloadRequestContext) =>
        new Blob(["report"]),
    );
    const methods = [
      useDownloadExcel,
      useDownloadCSV,
      useDownloadPDF,
      useDownloadJSON,
    ];
    const extensions = ["xlsx", "csv", "pdf", "json"];
    for (const [index, quick] of methods.entries()) {
      await expect(quick(api, "report", query)).resolves.toMatchObject({
        fileName: `report.${extensions[index]}`,
        size: 6,
      });
    }
    expect(api).toHaveBeenCalledTimes(4);
    for (const [params, context] of api.mock.calls) {
      expect(params).toBe(query);
      expect(context).toEqual({ signal: undefined, onProgress: undefined });
    }
    expect(click).toHaveBeenCalledTimes(4);
    expect(remove).toHaveBeenCalledTimes(4);
    expect(revokeObjectURL).toHaveBeenCalledTimes(4);
  });
});

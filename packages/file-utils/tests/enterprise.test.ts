import { describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
import {
  calculateFileHash,
  createFileUtils,
  createFileUtilsContext,
  detectImageMimeType,
  downloadBlob,
  FileType,
  useChunkDownload,
  useChunkUpload,
  useDownload,
  useExcel,
  useImage,
  useJSZip,
} from "../src";

describe("scoped configuration and CSV defenses", () => {
  it("isolates limits and creates records without an object prototype", () => {
    const toolkit = createFileUtils({ limits: { maxRows: 1 } });
    expect(() => toolkit.csv.parse("name\nAlice\nBob")).toThrow("CSV 行数");

    const [record] = toolkit.csv.parse("name,value\nAlice,1");
    expect(Object.getPrototypeOf(record)).toBeNull();
    expect(record.name).toBe("Alice");
  });

  it("rejects invalid resource limits when the context is created", () => {
    expect(() =>
      createFileUtilsContext({ limits: { maxFileSize: Number.NaN } }),
    ).toThrow("maxFileSize");
    expect(() => createFileUtilsContext({ limits: { maxRows: -1 } })).toThrow(
      "maxRows",
    );
  });

  it("escapes spreadsheet formulas by default and supports explicit rejection", () => {
    const csv = createFileUtils().csv;
    expect(
      csv.generate([{ value: '=HYPERLINK("https://invalid")' }]),
    ).toContain(`'=HYPERLINK`);
    expect(() =>
      csv.generate([{ value: "+cmd" }], { formulaPolicy: "reject" }),
    ).toThrow("公式执行");
    expect(
      csv.generate([{ value: "+safe" }], { formulaPolicy: "preserve" }),
    ).toContain("+safe");
  });
});

describe("download normalization", () => {
  it("turns a JSON error payload into a structured error before saving", async () => {
    const save = vi.fn();
    await expect(
      useDownload(
        async () =>
          new Blob([JSON.stringify({ message: "session expired" })], {
            type: "application/json",
          }),
        {
          fileName: "report",
          fileType: FileType.XLSX,
          showNotification: false,
          save,
        },
      ),
    ).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      message: "session expired",
    });
    expect(save).not.toHaveBeenCalled();
  });

  it("uses a safe server filename and reports byte progress", async () => {
    const save = vi.fn();
    const progress = vi.fn();
    const response = new Response("hello", {
      headers: {
        "content-length": "5",
        "content-disposition": `attachment; filename*=UTF-8''hello%20world.txt`,
        "content-type": "text/plain",
      },
    });
    const result = await useDownload(async () => response, {
      fileName: "fallback",
      fileType: FileType.TXT,
      showNotification: false,
      onProgress: progress,
      save,
    });
    expect(result.fileName).toBe("hello world.txt");
    expect(result.size).toBe(5);
    expect(progress).toHaveBeenCalled();
    expect(save).toHaveBeenCalledOnce();
  });
});

describe("streaming chunk download", () => {
  it("rejects invalid limits before starting a request", async () => {
    const fetcher = vi.fn();
    const { download } = useChunkDownload({ fetch: fetcher });
    await expect(
      download("https://invalid.test/file", "demo.bin", { expectedSize: -1 }),
    ).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("writes directly to a sink without creating a buffered blob", async () => {
    const writes: number[] = [];
    const sink = {
      write: vi.fn((chunk: Uint8Array) => void writes.push(...chunk)),
      close: vi.fn(),
      abort: vi.fn(),
    };
    const save = vi.fn();
    const fetcher = vi.fn(
      async () =>
        new Response(new Uint8Array([1, 2, 3, 4]), {
          headers: { "content-length": "4" },
        }),
    );
    const { download, state } = useChunkDownload({
      fetch: fetcher as typeof fetch,
      save,
    });
    const result = await download("https://invalid.test/file", "demo.bin", {
      sink,
      expectedSize: 4,
    });

    expect(writes).toEqual([1, 2, 3, 4]);
    expect(sink.close).toHaveBeenCalledOnce();
    expect(sink.abort).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(result).toEqual({ bytes: 4, fileName: "demo.bin", blob: undefined });
    expect(state.value.progress).toBe(100);
  });

  it("does not write a chunk that would exceed the expected size", async () => {
    const sink = {
      write: vi.fn(),
      close: vi.fn(),
      abort: vi.fn(),
    };
    const { download } = useChunkDownload({
      fetch: (async () =>
        new Response(new Uint8Array([1, 2, 3, 4]))) as typeof fetch,
    });

    await expect(
      download("https://invalid.test/file", "demo.bin", {
        sink,
        expectedSize: 2,
      }),
    ).rejects.toMatchObject({ code: "INVALID_CONTENT" });
    expect(sink.write).not.toHaveBeenCalled();
    expect(sink.close).not.toHaveBeenCalled();
    expect(sink.abort).toHaveBeenCalledOnce();
  });

  it("enforces the bounded-memory fallback", async () => {
    const save = vi.fn();
    const { download } = useChunkDownload({
      fetch: (async () => new Response(new Uint8Array(8))) as typeof fetch,
      save,
    });
    await expect(
      download("https://invalid.test/file", "demo.bin", { maxBufferedSize: 4 }),
    ).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });
    expect(save).not.toHaveBeenCalled();
  });
});

describe("resumable chunk upload", () => {
  it("skips completed chunks and supplies cancellation to merge", async () => {
    const file = new File([new Uint8Array(2500)], "demo.bin");
    const uploaded: number[] = [];
    let mergeSignal: AbortSignal | undefined;
    const progress = vi.fn();
    const { upload, state } = useChunkUpload({
      chunkSize: 1000,
      concurrent: 2,
      retries: 0,
    });
    const result = await upload(
      file,
      async (_chunk, index) => void uploaded.push(index),
      async (_name, _total, _hash, signal) => void (mergeSignal = signal),
      { completedChunks: [0], onProgress: progress },
    );

    expect(uploaded.sort()).toEqual([1, 2]);
    expect(result.completedChunks).toEqual([0, 1, 2]);
    expect(mergeSignal?.aborted).toBe(false);
    expect(state.value.uploadedBytes).toBe(file.size);
    expect(progress).toHaveBeenCalled();
  });

  it("classifies a chunk failure correctly and can suppress futile retries", async () => {
    const uploadFn = vi.fn().mockRejectedValue(new Error("HTTP 400"));
    const shouldRetry = vi.fn(() => false);
    const { upload, state } = useChunkUpload({
      chunkSize: 1000,
      retries: 3,
      shouldRetry,
    });

    await expect(
      upload(new File(["payload"], "demo.bin"), uploadFn),
    ).rejects.toMatchObject({ code: "NETWORK_ERROR" });
    expect(uploadFn).toHaveBeenCalledOnce();
    expect(shouldRetry).toHaveBeenCalledWith(
      expect.objectContaining({ chunkIndex: 0, attempt: 1, retries: 3 }),
    );
    expect(state.value.aborted).toBe(false);
  });

  it("does not let observer errors duplicate a successful retry", async () => {
    const uploadFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValueOnce(undefined);
    const { upload } = useChunkUpload({
      chunkSize: 1000,
      retries: 1,
      retryDelay: 0,
      onRetry: () => {
        throw new Error("observer failed");
      },
    });

    await expect(
      upload(new File(["payload"], "demo.bin"), uploadFn, undefined, {
        onProgress: () => {
          throw new Error("progress observer failed");
        },
      }),
    ).resolves.toMatchObject({ totalChunks: 1, completedChunks: [0] });
    expect(uploadFn).toHaveBeenCalledTimes(2);
  });
});

describe("content identity and browser download cleanup", () => {
  it("provides an opt-in standard whole-file SHA-256 checksum", async () => {
    await expect(
      calculateFileHash(new Blob(["abc"]), undefined, "full"),
    ).resolves.toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("detects raster signatures and rejects a declared MIME mismatch", async () => {
    const png = new Blob(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      { type: "image/jpeg" },
    );
    await expect(detectImageMimeType(png)).resolves.toBe("image/png");
    await expect(
      useImage({ verifyMimeType: true }).getInfo(png),
    ).rejects.toMatchObject({ code: "INVALID_CONTENT" });
  });

  it("revokes the object URL immediately when clicking the link fails", () => {
    const remove = vi.fn();
    const revokeObjectURL = vi.fn();
    const fakeDocument = {
      body: { appendChild: vi.fn() },
      createElement: vi.fn(() => ({
        href: "",
        download: "",
        style: {},
        click: () => {
          throw new Error("blocked");
        },
        remove,
      })),
      defaultView: {
        URL: { createObjectURL: () => "blob:test", revokeObjectURL },
      },
    } as unknown as Document;

    expect(() =>
      downloadBlob(new Blob(["data"]), "demo.txt", { document: fakeDocument }),
    ).toThrow("无法触发浏览器文件下载");
    expect(remove).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });
});

describe("Excel and ZIP resource limits", () => {
  it("rejects dangerous Excel headers before object conversion", async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([["__proto__"], ["polluted"]]),
      "Data",
    );
    const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    const file = new File([bytes], "dangerous.xlsx");
    await expect(useExcel().readFile(file)).rejects.toMatchObject({
      code: "INVALID_CONTENT",
    });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("enforces archive file and byte limits while adding entries", () => {
    const context = createFileUtilsContext({
      limits: { maxArchiveFiles: 1, maxArchiveSize: 4 },
    });
    const { createZip, addFile } = useJSZip({ context });
    const zip = createZip();
    addFile(zip, "one.txt", "1234");
    expect(() => addFile(zip, "two.txt", "x")).toThrow("ZIP 文件数量");

    const second = createZip();
    expect(() => addFile(second, "large.txt", "12345")).toThrow(
      "ZIP 原始内容大小",
    );
  });
});

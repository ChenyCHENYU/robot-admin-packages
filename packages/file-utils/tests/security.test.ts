import { describe, expect, it } from "vitest";
import { useChunkUpload } from "../src/chunk";
import { useJSZip } from "../src/zip";

describe("ZIP path safety", () => {
  it("sanitizes file and folder paths without emitting traversal entries", () => {
    const { createZip, createFolder, addFile } = useJSZip();
    const zip = createZip();
    const folder = createFolder(zip, "../CON/../safe");
    addFile(folder, "../../payload?.txt", "safe");

    const paths = Object.keys(zip.files);
    expect(paths.some((path) => path.includes(".."))).toBe(false);
    expect(paths.some((path) => /^[\\/]|^[A-Za-z]:/.test(path))).toBe(false);
    expect(paths).toContain("safe/payload_.txt");
  });

  it("rejects duplicate paths created by sanitization", () => {
    const { createZip, addFile } = useJSZip();
    const zip = createZip();
    addFile(zip, "a?.txt", "first");
    expect(() => addFile(zip, "a*.txt", "second")).toThrow(
      "ZIP 内存在重复文件路径",
    );
  });
});

describe("chunk fingerprint", () => {
  it("keeps a standard SHA-256 shape while mixing file size into the digest", async () => {
    const file = new File(["abc"], "demo.txt", { type: "text/plain" });
    const { upload } = useChunkUpload({ chunkSize: 1024, retries: 1 });
    let actualHash = "";

    await upload(file, async (_chunk, _index, _total, hash) => {
      actualHash = hash;
    });

    const expectedInput = new Uint8Array(11);
    expectedInput.set(new TextEncoder().encode("abc"));
    new DataView(expectedInput.buffer).setBigUint64(3, 3n, false);
    const expected = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", expectedInput)),
    )
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    expect(actualHash).toMatch(/^[a-f0-9]{64}$/);
    expect(actualHash).toBe(expected);
  });

  it("rejects invalid uploader limits before starting work", () => {
    expect(() => useChunkUpload({ chunkSize: 0 })).toThrow("chunkSize");
    expect(() => useChunkUpload({ concurrent: 0 })).toThrow("concurrent");
    expect(() => useChunkUpload({ retries: 0 })).toThrow("retries");
  });

  it("propagates abort to active upload callbacks without reporting completion", async () => {
    const file = new File([new Uint8Array(2048)], "demo.bin");
    const { upload, abort, state } = useChunkUpload({
      chunkSize: 1024,
      concurrent: 1,
      retries: 1,
    });
    let callbackSignal: AbortSignal | undefined;

    const pending = upload(
      file,
      async (_chunk, _index, _total, _hash, signal) => {
        callbackSignal = signal;
        await new Promise<void>((resolve) => {
          signal.addEventListener("abort", () => resolve(), { once: true });
        });
      },
    );

    while (!callbackSignal) await new Promise((resolve) => setTimeout(resolve, 0));
    abort();
    await pending;

    expect(callbackSignal.aborted).toBe(true);
    expect(state.value.aborted).toBe(true);
    expect(state.value.progress).toBeLessThan(100);
  });
});

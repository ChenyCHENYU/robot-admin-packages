import { describe, expect, it } from "vitest";
import { useRequest } from "../src/vue/useRequest";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("useRequest lifecycle", () => {
  it("does not commit a stale result after reset when the executor ignores abort", async () => {
    const pending = deferred<string>();
    const request = useRequest(() => pending.promise, {
      initialData: "initial",
    });

    const running = request.run();
    request.reset();
    pending.resolve("stale");

    await expect(running).resolves.toBe("stale");
    expect(request.data.value).toBe("initial");
    expect(request.error.value).toBeNull();
  });

  it("keeps callback failures from replacing request outcomes", async () => {
    const success = useRequest(async () => "ok", {
      onSuccess: () => {
        throw new Error("observer failed");
      },
    });
    await expect(success.run()).resolves.toBe("ok");
    expect(success.data.value).toBe("ok");

    const failure = useRequest(
      async () => {
        throw new Error("request failed");
      },
      {
        onError: () => {
          throw new Error("observer failed");
        },
      },
    );
    await expect(failure.run()).rejects.toMatchObject({
      kind: "unknown",
      message: "request failed",
    });
    expect(failure.error.value?.message).toBe("request failed");
  });
});

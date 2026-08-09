import { afterEach, describe, expect, it } from "vitest";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import {
  cancelAllPendingRequests,
  cancelAllRequests,
  clearAllCache,
  createAxiosInstance,
  getCancelableRequestCount,
  getPendingRequestCount,
  getReLoginPromise,
  onReLoginCancel,
  onReLoginSuccess,
  waitForReLogin,
} from "../src/axios/request";
import { generateRequestKey, MemoryCache } from "../src/axios/utils/helpers";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function canceledError(config: InternalAxiosRequestConfig) {
  return Object.assign(new Error("canceled"), {
    name: "CanceledError",
    code: "ERR_CANCELED",
    config,
  });
}

afterEach(() => {
  cancelAllRequests();
  cancelAllPendingRequests();
  clearAllCache();
});

describe("shared abort lifecycle", () => {
  it("preserves caller cancellation when only dedupe manages the request", async () => {
    const external = new AbortController();
    let adapterSignal: AbortSignal | undefined;
    const instance = createAxiosInstance({
      adapter: (config) =>
        new Promise((_, reject) => {
          adapterSignal = config.signal as AbortSignal;
          config.signal?.addEventListener?.(
            "abort",
            () => reject(canceledError(config)),
            { once: true },
          );
        }),
    });

    const request = instance.get("/signal", {
      signal: external.signal,
      cancel: false,
    } as any);
    await tick();
    external.abort();

    await expect(request).rejects.toMatchObject({ code: "ERR_CANCELED" });
    expect(adapterSignal?.aborted).toBe(true);
  });

  it("lets cancelAllRequests abort the adapter when dedupe is disabled", async () => {
    let adapterSignal: AbortSignal | undefined;
    const instance = createAxiosInstance({
      adapter: (config) =>
        new Promise((_, reject) => {
          adapterSignal = config.signal as AbortSignal;
          config.signal?.addEventListener?.(
            "abort",
            () => reject(canceledError(config)),
            { once: true },
          );
        }),
    });

    const request = instance.get("/cancel-all", { dedupe: false } as any);
    await tick();
    cancelAllRequests();

    await expect(request).rejects.toMatchObject({ code: "ERR_CANCELED" });
    expect(adapterSignal?.aborted).toBe(true);
  });

  it("does not let an older canceled request delete the newer dedupe entry", async () => {
    const signals: AbortSignal[] = [];
    const instance = createAxiosInstance({
      adapter: (config) =>
        new Promise((_, reject) => {
          const signal = config.signal as AbortSignal;
          signals.push(signal);
          signal.addEventListener(
            "abort",
            () => reject(canceledError(config)),
            { once: true },
          );
        }),
    });

    void instance.get("/same").catch(() => undefined);
    await tick();
    void instance.get("/same").catch(() => undefined);
    await tick();

    expect(signals[0].aborted).toBe(true);
    expect(getPendingRequestCount()).toBe(1);

    void instance.get("/same").catch(() => undefined);
    await tick();
    expect(signals[1].aborted).toBe(true);
    expect(signals[2].aborted).toBe(false);
    expect(getPendingRequestCount()).toBe(1);
  });

  it("keeps caller cancellation active across a business interceptor resend", async () => {
    const external = new AbortController();
    let attempts = 0;
    let secondSignal: AbortSignal | undefined;
    const instance = createAxiosInstance({
      adapter: async (config) => {
        attempts++;
        if (attempts === 1) {
          throw Object.assign(new Error("unauthorized"), {
            config,
            response: { status: 401, config },
          });
        }

        secondSignal = config.signal as AbortSignal;
        return new Promise((_, reject) => {
          config.signal?.addEventListener?.(
            "abort",
            () => reject(canceledError(config)),
            { once: true },
          );
        });
      },
    });

    instance.interceptors.response.use(undefined, (error) => {
      if (!error.config.__resent) {
        error.config.__resent = true;
        return instance.request(error.config);
      }
      return Promise.reject(error);
    });

    const request = instance.get("/business-retry", {
      signal: external.signal,
    });
    await tick();
    external.abort();

    await expect(request).rejects.toMatchObject({ code: "ERR_CANCELED" });
    expect(secondSignal?.aborted).toBe(true);
  });
});

describe("memory cache limits", () => {
  it("rejects invalid limits and supports disabling storage with a zero limit", () => {
    const cache = new MemoryCache();
    expect(() => cache.setMaxSize(-1)).toThrow(RangeError);
    expect(() => cache.setMaxSize(1.5)).toThrow(RangeError);

    cache.setMaxSize(0);
    cache.set("ignored", "value", 1000);
    expect(cache.size).toBe(0);
  });

  it("rejects invalid TTL values", () => {
    const cache = new MemoryCache();
    expect(() => cache.set("bad", "value", -1)).toThrow(RangeError);
    expect(() => cache.set("bad", "value", Number.NaN)).toThrow(RangeError);
  });
});

describe("cache lifecycle", () => {
  it("short-circuits the adapter and releases cancellation registries on hits", async () => {
    let adapterCalls = 0;
    const instance = createAxiosInstance({
      adapter: async (config) => {
        adapterCalls++;
        return {
          data: { value: 1 },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      },
    });
    const config = {
      cache: { enabled: true, ttl: 1000 },
      cancel: true,
      dedupe: true,
    } as any;

    await expect(instance.get("/cache-lifecycle", config)).resolves.toMatchObject({
      data: { value: 1 },
    });
    await expect(instance.get("/cache-lifecycle", config)).resolves.toMatchObject({
      data: { value: 1 },
      statusText: "OK (from cache)",
    });

    expect(adapterCalls).toBe(1);
    expect(getPendingRequestCount()).toBe(0);
    expect(getCancelableRequestCount()).toBe(0);
  });
});

describe("re-login coordination", () => {
  it("shares one wait promise and resolves every waiter", async () => {
    const first = waitForReLogin();
    const second = waitForReLogin();

    expect(second).toBe(first);
    expect(getReLoginPromise()).toBe(first);
    onReLoginSuccess();
    await expect(Promise.all([first, second])).resolves.toEqual([
      undefined,
      undefined,
    ]);
    expect(getReLoginPromise()).toBeNull();
  });

  it("rejects all waiters when re-login is canceled", async () => {
    const waiting = waitForReLogin();
    onReLoginCancel();
    await expect(waiting).rejects.toThrow("重新登录已取消");
    expect(getReLoginPromise()).toBeNull();
  });
});

describe("retry policy", () => {
  it("retries idempotent requests but not POST by default", async () => {
    let getAttempts = 0;
    const getInstance = createAxiosInstance({
      adapter: async (config) => {
        getAttempts++;
        if (getAttempts === 1) {
          throw Object.assign(new Error("network"), {
            config,
            code: "ERR_NETWORK",
          });
        }
        return {
          data: { ok: true },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        } as AxiosResponse;
      },
    });

    await expect(
      getInstance.get("/retry", {
        retry: { enabled: true, delay: 0, jitter: false },
      } as any),
    ).resolves.toMatchObject({ status: 200 });
    expect(getAttempts).toBe(2);

    let postAttempts = 0;
    const postInstance = createAxiosInstance({
      adapter: async (config) => {
        postAttempts++;
        throw Object.assign(new Error("network"), {
          config,
          code: "ERR_NETWORK",
        });
      },
    });

    await expect(
      postInstance.post("/charge", {}, { retry: true } as any),
    ).rejects.toMatchObject({ code: "ERR_NETWORK" });
    expect(postAttempts).toBe(1);
  });

  it("can be canceled while waiting for retry backoff", async () => {
    const external = new AbortController();
    let attempts = 0;
    const instance = createAxiosInstance({
      adapter: async (config) => {
        attempts++;
        throw Object.assign(new Error("network"), {
          config,
          code: "ERR_NETWORK",
        });
      },
    });

    const request = instance.get("/backoff", {
      signal: external.signal,
      retry: { enabled: true, delay: 1000, jitter: false },
    } as any);
    await tick();
    external.abort();

    await expect(request).rejects.toMatchObject({ code: "ERR_CANCELED" });
    expect(attempts).toBe(1);
  });
});

describe("request keys", () => {
  it("canonicalizes nested objects and includes identity-sensitive form data", () => {
    const first = generateRequestKey({
      url: "/nested",
      params: { b: 2, a: { d: 4, c: 3 } },
    });
    const second = generateRequestKey({
      url: "/nested",
      params: { a: { c: 3, d: 4 }, b: 2 },
    });
    expect(first).toBe(second);

    const formA = new FormData();
    const formB = new FormData();
    formA.append("file", new Blob(["same"], { type: "text/plain" }), "a.txt");
    formB.append("file", new Blob(["same"], { type: "text/plain" }), "a.txt");
    expect(generateRequestKey({ url: "/upload", data: formA })).not.toBe(
      generateRequestKey({ url: "/upload", data: formB }),
    );
  });
});

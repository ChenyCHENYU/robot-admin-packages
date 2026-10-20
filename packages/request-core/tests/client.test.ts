import { afterEach, describe, expect, it } from "vitest";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { createRequestClient } from "../src/client/client";
import { RequestError } from "../src/client/errors";
import { getData } from "../src/axios/service";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const clients: Array<ReturnType<typeof createRequestClient>> = [];

function response(
  config: InternalAxiosRequestConfig,
  data: unknown,
): AxiosResponse {
  return { data, status: 200, statusText: "OK", headers: {}, config };
}

afterEach(() => {
  for (const client of clients.splice(0)) client.dispose();
});

describe("request client isolation", () => {
  it("does not share cache entries between clients with different base URLs", async () => {
    let firstCalls = 0;
    let secondCalls = 0;
    const first = createRequestClient({
      request: {
        baseURL: "https://first.example",
        adapter: async (config) => response(config, { source: ++firstCalls }),
      },
    });
    const second = createRequestClient({
      request: {
        baseURL: "https://second.example",
        adapter: async (config) =>
          response(config, { source: `second-${++secondCalls}` }),
      },
    });
    clients.push(first, second);

    const policy = {
      cache: { enabled: true, ttl: 60_000 },
      dedupe: false,
    } as const;
    expect(await first.get("/shared", policy)).toEqual({ source: 1 });
    expect(await second.get("/shared", policy)).toEqual({ source: "second-1" });
    expect(firstCalls).toBe(1);
    expect(secondCalls).toBe(1);
  });

  it("supports tag invalidation without exposing cached object references", async () => {
    let calls = 0;
    const client = createRequestClient({
      request: {
        adapter: async (config) => response(config, { call: ++calls }),
      },
    });
    clients.push(client);

    const config = {
      cache: { enabled: true, ttl: 60_000, tags: ["users"] },
      dedupe: false,
    } as const;
    const first = await client.get<{ call: number }>("/users", config);
    first.call = 99;
    expect(await client.get("/users", config)).toEqual({ call: 1 });
    expect(client.cache.invalidateTag("users")).toBe(1);
    expect(await client.get("/users", config)).toEqual({ call: 2 });
  });
});

describe("request concurrency", () => {
  it("does not implicitly merge mutation requests", async () => {
    let calls = 0;
    const client = createRequestClient({
      request: {
        adapter: async (config) => response(config, { call: ++calls }),
      },
    });
    clients.push(client);

    await Promise.all([
      client.post("/orders", { sku: "A" }),
      client.post("/orders", { sku: "A" }),
    ]);
    expect(calls).toBe(2);
  });

  it("joins equivalent requests and rejects takeFirst duplicates", async () => {
    let calls = 0;
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const client = createRequestClient({
      request: {
        adapter: async (config) => {
          calls += 1;
          await gate;
          return response(config, { ok: true });
        },
      },
    });
    clients.push(client);

    const first = client.get("/joined", { concurrency: "join", cancel: false });
    const second = client.get("/joined", {
      concurrency: "join",
      cancel: false,
    });
    release?.();
    await expect(Promise.all([first, second])).resolves.toEqual([
      { ok: true },
      { ok: true },
    ]);
    expect(calls).toBe(1);

    let releaseFirst: (() => void) | undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const guardedClient = createRequestClient({
      request: {
        adapter: async (config) => {
          await firstGate;
          return response(config, { ok: true });
        },
      },
    });
    clients.push(guardedClient);
    const active = guardedClient.post(
      "/submit",
      {},
      { concurrency: "takeFirst" },
    );
    await expect(
      guardedClient.post("/submit", {}, { concurrency: "takeFirst" }),
    ).rejects.toMatchObject({ kind: "concurrency" });
    releaseFirst?.();
    await active;
  });

  it("cancels only the requested scope", async () => {
    const client = createRequestClient({
      request: {
        adapter: (config) =>
          new Promise((_, reject) => {
            config.signal?.addEventListener?.(
              "abort",
              () =>
                reject(
                  Object.assign(new Error("canceled"), {
                    name: "CanceledError",
                    code: "ERR_CANCELED",
                    config,
                  }),
                ),
              { once: true },
            );
          }),
      },
    });
    clients.push(client);
    const pending = client.get("/page", {
      scope: "permission-page",
      dedupe: false,
    });
    await tick();
    expect(client.requests.cancelScope("permission-page")).toBe(1);
    await expect(pending).rejects.toMatchObject({ kind: "canceled" });
  });
});

describe("authentication and response normalization", () => {
  it("shares default transport and auth while legacy helpers retain envelopes and bypass modern hooks", async () => {
    const requests: Array<{ baseURL?: string; authorization: unknown }> = [];
    const hooks = { starts: 0, ends: 0, errors: 0 };
    const client = createRequestClient({
      setAsDefault: true,
      auth: { getToken: () => "shared-token" },
      request: {
        baseURL: "https://example.test/api",
        adapter: async (config) => {
          requests.push({
            baseURL: config.baseURL,
            authorization: config.headers.get("Authorization"),
          });
          return response(
            config,
            config.url === "/failure"
              ? { code: 500, message: "Denied" }
              : { code: 0, data: { name: "Robot" } },
          );
        },
      },
      response: {
        isSuccess: (data) => (data as { code: number }).code === 0,
        getData: (data) => (data as { data: unknown }).data,
      },
      hooks: {
        onRequestStart: () => {
          hooks.starts += 1;
        },
        onRequestEnd: () => {
          hooks.ends += 1;
        },
        onError: () => {
          hooks.errors += 1;
        },
      },
    });
    clients.push(client);

    expect(await client.get("/success")).toEqual({ name: "Robot" });
    expect(await getData("/success")).toEqual({
      code: 0,
      data: { name: "Robot" },
    });
    expect(hooks).toEqual({ starts: 1, ends: 1, errors: 0 });

    await expect(client.get("/failure")).rejects.toMatchObject({
      kind: "business",
    });
    await expect(getData("/failure")).resolves.toEqual({
      code: 500,
      message: "Denied",
    });
    expect(hooks).toEqual({ starts: 2, ends: 2, errors: 1 });
    expect(requests).toEqual(
      Array.from({ length: 4 }, () => ({
        baseURL: "https://example.test/api",
        authorization: "Bearer shared-token",
      })),
    );
  });

  it("shares one refresh across concurrent 401 responses and replays once", async () => {
    let token = "expired";
    let refreshCalls = 0;
    const client = createRequestClient({
      auth: {
        getToken: () => token,
        refresh: async () => {
          refreshCalls += 1;
          await tick();
          token = "fresh";
          return token;
        },
      },
      request: {
        adapter: async (config) => {
          if (config.headers.get("Authorization") !== "Bearer fresh") {
            throw Object.assign(new Error("Unauthorized"), {
              isAxiosError: true,
              config,
              response: {
                data: { message: "expired" },
                status: 401,
                statusText: "Unauthorized",
                headers: {},
                config,
              },
            });
          }
          return response(config, { ok: true });
        },
      },
    });
    clients.push(client);

    await expect(
      Promise.all([
        client.get("/one", { dedupe: false }),
        client.get("/two", { dedupe: false }),
      ]),
    ).resolves.toEqual([{ ok: true }, { ok: true }]);
    expect(refreshCalls).toBe(1);
  });

  it("emits a stable business RequestError", async () => {
    const client = createRequestClient({
      request: {
        adapter: async (config) =>
          response(config, { code: 5001, message: "Denied" }),
      },
      response: {
        isSuccess: (data) => (data as { code: number }).code === 0,
        getError: (data) => ({
          code: (data as { code: number }).code,
          message: (data as { message: string }).message,
        }),
      },
    });
    clients.push(client);

    const failure = client.get("/business");
    await expect(failure).rejects.toBeInstanceOf(RequestError);
    await expect(failure).rejects.toMatchObject({
      kind: "business",
      code: 5001,
      message: "Denied",
    });
  });
});

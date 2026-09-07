import { describe, expect, it } from "vitest";
import { createRequestCore, getGlobalConfig } from "../src/core";
import {
  createAxiosInstance,
  getCancelableRequestCount,
  onReLoginCancel,
  onReLoginSuccess,
  waitForReLogin,
} from "../src/axios/request";
import {
  DataExtractor,
  FieldFinder,
  ResponseNormalizer,
} from "../src/composables/useTableCrud/utils";

describe("0.2.1 regressions", () => {
  it("registers a response error interceptor without a fulfilled handler", async () => {
    let calls = 0;
    const core = createRequestCore({
      request: {
        adapter: async () => {
          throw new Error("adapter failed");
        },
      },
      interceptors: {
        responseError: (error) => {
          calls += 1;
          return Promise.reject(error);
        },
      },
    });
    await expect(core.axiosInstance.get("/failure")).rejects.toThrow("adapter failed");
    expect(calls).toBe(1);
  });

  it("handles global regular-expression whitelists deterministically", async () => {
    const responses: Array<() => void> = [];
    const instance = createAxiosInstance({
      adapter: (config) =>
        new Promise((resolve) => {
          responses.push(() =>
            resolve({
              data: {},
              status: 200,
              statusText: "OK",
              headers: {},
              config,
            }),
          );
        }),
    });
    const config = { cancel: { enabled: true, whitelist: [/health/g] }, dedupe: false };
    const first = instance.get("/health", config);
    const second = instance.get("/health", config);
    while (responses.length < 2) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    expect(getCancelableRequestCount(instance)).toBe(0);
    for (const resolve of responses) resolve();
    await Promise.all([first, second]);
  });

  it("extracts wrapped and root arrays without losing zero totals", () => {
    expect(DataExtractor.extractList({ data: [{ id: 1 }] })).toEqual({
      items: [{ id: 1 }],
      total: 1,
    });
    expect(DataExtractor.extractList([{ id: 1 }, { id: 2 }])).toEqual({
      items: [{ id: 1 }, { id: 2 }],
      total: 2,
    });
    expect(FieldFinder.findNumber({ total: 0 }, ["total"], 99)).toBe(0);
    expect(ResponseNormalizer.isSuccess(null)).toBe(false);
  });

  it("isolates re-login coordination and protects global config snapshots", async () => {
    const first = createAxiosInstance();
    const second = createAxiosInstance();
    const firstWait = waitForReLogin(first);
    const secondWait = waitForReLogin(second);
    expect(firstWait).not.toBe(secondWait);

    onReLoginSuccess(first);
    await expect(firstWait).resolves.toBeUndefined();
    onReLoginCancel(second);
    await expect(secondWait).rejects.toThrow("重新登录已取消");

    createRequestCore({
      fieldAliases: { data: ["payload"], list: ["rows"], total: ["size"] },
    });
    expect(
      DataExtractor.extractList({ payload: { rows: [{ id: 1 }], size: 1 } }),
    ).toEqual({ items: [{ id: 1 }], total: 1 });
    const snapshot = getGlobalConfig();
    snapshot.fieldAliases.data.push("pollution");
    expect(getGlobalConfig().fieldAliases.data).not.toContain("pollution");
  });
});

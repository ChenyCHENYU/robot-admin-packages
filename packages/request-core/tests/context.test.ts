import { createApp } from "vue";
import { describe, expect, it } from "vitest";
import { createRequestClient } from "../src/client/client";
import { createRequestPlugin, useRequestClient } from "../src/vue/context";

describe("request client injection", () => {
  it("throws for missing required injection and returns undefined when optional", () => {
    const app = createApp({});

    expect(() => app.runWithContext(() => useRequestClient())).toThrow(
      "Request client was not provided",
    );
    expect(() => app.runWithContext(() => useRequestClient(false))).toThrow(
      "Request client was not provided",
    );
    expect(app.runWithContext(() => useRequestClient(true))).toBeUndefined();
  });

  it("returns the provided client for required and optional injection", () => {
    const client = createRequestClient();
    const app = createApp({});
    app.use(createRequestPlugin(client));

    expect(app.runWithContext(() => useRequestClient())).toBe(client);
    expect(app.runWithContext(() => useRequestClient(false))).toBe(client);
    expect(app.runWithContext(() => useRequestClient(true))).toBe(client);
    client.dispose();
  });
});

import {
  inject,
  provide,
  type App,
  type InjectionKey,
} from "vue";
import type { RequestClient } from "../client/types";

export const REQUEST_CLIENT_KEY = Symbol.for(
  "@robot-admin/request-core/vue-client/v1",
) as InjectionKey<RequestClient>;

export function createRequestPlugin(client: RequestClient) {
  return {
    install(app: App): void {
      app.provide(REQUEST_CLIENT_KEY, client);
    },
  };
}

export function provideRequestClient(client: RequestClient): RequestClient {
  provide(REQUEST_CLIENT_KEY, client);
  return client;
}

export function useRequestClient(optional = false): RequestClient | undefined {
  const client = inject(REQUEST_CLIENT_KEY, undefined);
  if (!client && !optional) {
    throw new Error(
      "Request client was not provided. Install createRequestPlugin(client) or pass client explicitly.",
    );
  }
  return client;
}

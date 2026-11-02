/** 每个 Vue app 独立的字典插件；只聚合现有 Store 与生命周期，不持有全局默认实例。 */
import {
  effectScope,
  inject,
  toValue,
  watch,
  type App,
  type EffectScope,
  type MaybeRefOrGetter,
} from "vue";
import { createDictionaryStore } from "./store";
import type {
  DictionaryDefinition,
  DictionaryProvider,
  DictionaryStore,
  DictionaryStoreOptions,
} from "./types";
import { DICTIONARY_PROVIDER_KEY, DICTIONARY_STORE_KEY } from "./vue-context";

export interface DictionaryPluginConfig extends Omit<
  DictionaryStoreOptions,
  "scope" | "enabled"
> {
  dictionaries?: Record<string, DictionaryDefinition>;
  scope?: MaybeRefOrGetter<string>;
  enabled?: MaybeRefOrGetter<boolean>;
}

export interface DictionaryPlugin {
  install(app: App): void;
  /** SSR 在 renderToString 后 finally 调用；普通客户端由 app.unmount 自动清理。 */
  dispose(app: App): void;
}

function readApplicationDictionaries(app: App) {
  return app.runWithContext(() => ({
    store: inject(DICTIONARY_STORE_KEY, undefined),
    provider: inject(DICTIONARY_PROVIDER_KEY, undefined),
  }));
}

export function createDictionaryPlugin(
  config: DictionaryPluginConfig = {},
): DictionaryPlugin {
  const installed = new WeakMap<App, () => void>();
  return {
    install(app: App) {
      const previous = readApplicationDictionaries(app);
      if (installed.has(app) || previous.store || previous.provider)
        throw new Error(
          "[dictionary] 当前应用已提供字典实例，请勿重复安装或覆盖。",
        );
      let store: DictionaryStore | undefined;
      let scope: EffectScope | undefined;
      let disposed = false;
      let active = false;
      let installing = true;
      let initializationFailed = false;
      let initializationError: unknown;
      let provided = false;
      let identity: DictionaryStore | undefined;
      let restoreUnmount: (() => void) | undefined;
      const cleanup = () => {
        disposed = true;
        active = false;
        // 先移交所有权再清理，支持 getter/public hook 在安装尚未返回时同步 dispose。
        const ownedScope = scope;
        const ownedStore = store;
        scope = undefined;
        store = undefined;
        try {
          ownedScope?.stop();
        } finally {
          try {
            ownedStore?.destroy();
          } finally {
            // 旧的 native hook 可能迟到，不得删除后续成功安装的所有权。
            if (installed.get(app) === cleanup) installed.delete(app);
          }
        }
      };
      const assertOwnership = (
        expectedStore: DictionaryStore | undefined = previous.store,
        expectedProvider: DictionaryProvider | undefined = previous.provider,
      ) => {
        if (disposed)
          throw new Error("[dictionary] 字典插件在安装中已被销毁。");
        const current = readApplicationDictionaries(app);
        if (
          current.store !== expectedStore ||
          current.provider !== expectedProvider
        )
          throw new Error(
            "[dictionary] 安装期间出现其他字典提供器，已取消本次安装以避免覆盖。",
          );
      };
      // 暂存安装事务，公开 dispose(app) 在 getter/hook/provide 重入时也能及时取消。
      installed.set(app, cleanup);
      try {
        const {
          dictionaries,
          scope: scopeOption,
          enabled,
          ...options
        } = config;
        assertOwnership();
        if (
          dictionaries !== undefined &&
          (!dictionaries ||
            typeof dictionaries !== "object" ||
            Array.isArray(dictionaries))
        )
          throw new TypeError("[dictionary] dictionaries 必须是命名字典对象。");
        store = createDictionaryStore(dictionaries ?? {}, {
          ...options,
          enabled: () => active,
        });
        assertOwnership();
        const ownedStore = store;
        identity = ownedStore;
        let currentScope = "default";
        scope = effectScope(true);
        scope.run(() =>
          watch(
            () => {
              try {
                // getters 可读取当前 app 的 Pinia/inject；失活后的 watcher 也不能误用其他 app。
                return app.runWithContext(() => {
                  const nextScope = toValue(scopeOption ?? "default");
                  const nextEnabled = toValue(enabled ?? true);
                  if (
                    typeof nextScope !== "string" ||
                    typeof nextEnabled !== "boolean"
                  )
                    throw new TypeError(
                      "[dictionary] scope 必须是字符串，enabled 必须是 boolean。",
                    );
                  return {
                    ok: true as const,
                    scope: nextScope,
                    enabled: nextEnabled,
                  };
                });
              } catch (error) {
                return { ok: false as const, error };
              }
            },
            (next, previousValue) => {
              if (disposed) return;
              if (!next.ok) {
                active = false;
                ownedStore.invalidate();
                if (installing) {
                  initializationFailed = true;
                  initializationError = next.error;
                } else {
                  // 配置故障先暂停并清空旧身份数据，再交给 Vue 的既有错误处理；不得继续请求。
                  if (app.config.errorHandler)
                    app.config.errorHandler(
                      next.error,
                      null,
                      "dictionary plugin configuration",
                    );
                  else throw next.error;
                }
                return;
              }
              active = next.enabled;
              if (currentScope !== next.scope) {
                currentScope = next.scope;
                ownedStore.setScope(next.scope);
              } else if (
                previousValue &&
                (!previousValue.ok || previousValue.enabled !== next.enabled)
              ) {
                ownedStore.invalidate();
              }
            },
            { immediate: true, flush: "sync" },
          ),
        );
        if (initializationFailed) throw initializationError;
        assertOwnership();
        // Vue 3.4 尚无 app.onUnmount：只包装本 app 的公开 unmount，不注册全局 mixin。
        if (typeof app.onUnmount === "function") {
          app.onUnmount(cleanup);
        } else {
          const original = app.unmount;
          const wrapped = function (this: App) {
            try {
              return original.call(this);
            } finally {
              cleanup();
            }
          };
          app.unmount = wrapped;
          restoreUnmount = () => {
            if (app.unmount === wrapped) app.unmount = original;
          };
        }
        assertOwnership();
        provided = true;
        app.provide(DICTIONARY_STORE_KEY, ownedStore);
        assertOwnership(ownedStore);
        app.provide(DICTIONARY_PROVIDER_KEY, ownedStore);
        assertOwnership(ownedStore, ownedStore);
        installing = false;
      } catch (error) {
        try {
          cleanup();
        } catch {
          /* 已尝试完整清理，保留最初的安装异常。 */
        }
        try {
          restoreUnmount?.();
        } catch {
          /* 宿主可能拒绝恢复包装。 */
        }
        if (provided && identity) {
          // 使用公开 provide 恢复，兼容一次写入后抛错的宿主；保留最初的安装异常。
          const restore = (
            key: symbol,
            value: DictionaryProvider | undefined,
          ) => {
            try {
              // 只撤销本事务仍持有的值，不能擦掉重入后另一安装的提供器。
              const current = app.runWithContext(() =>
                inject<unknown>(key, undefined),
              );
              if (current === identity) app.provide(key, value);
            } catch {
              /* 宿主已拒绝写入。 */
            }
          };
          restore(DICTIONARY_STORE_KEY, previous.store);
          restore(DICTIONARY_PROVIDER_KEY, previous.provider);
        }
        throw error;
      }
    },
    dispose(app: App) {
      installed.get(app)?.();
    },
  };
}

/** 本包私有的应用注入；外部项目通过插件与 hooks 使用，不暴露跨包 token。 */
import { hasInjectionContext, inject, type InjectionKey } from "vue";
import type { DictionaryProvider, DictionaryStore } from "./types";

export const DICTIONARY_PROVIDER_KEY = Symbol.for(
  "@robot-admin/dictionary/internal/provider",
) as InjectionKey<DictionaryProvider>;

/** 应用 Store 与页面只读 Provider 分开：局部覆盖不接管应用的销毁/身份。 */
export const DICTIONARY_STORE_KEY = Symbol.for(
  "@robot-admin/dictionary/internal/store",
) as InjectionKey<DictionaryStore>;

export function readDictionaryProvider(): DictionaryProvider | undefined {
  return hasInjectionContext()
    ? inject(DICTIONARY_PROVIDER_KEY, undefined)
    : undefined;
}

export function missingDictionaryPlugin(): Error {
  return new Error(
    "[dictionary] 请先通过 app.use(createDictionaryPlugin(config)) 安装字典插件。",
  );
}

export function useDictionaries(): DictionaryStore {
  const store = hasInjectionContext()
    ? inject(DICTIONARY_STORE_KEY, undefined)
    : undefined;
  if (!store) throw missingDictionaryPlugin();
  return store;
}

/** 缺少插件也在字段/控件原位报告，不能用模块默认实例或静态假值掩盖。 */
export const missingDictionaryProvider: DictionaryProvider = Object.freeze({
  getDictionary() {
    throw missingDictionaryPlugin();
  },
});

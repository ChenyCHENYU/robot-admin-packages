/**
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-11-01
 * @Description: 无框架字典入口；Vue 接入由可选 /vue 子入口提供。
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
export { createDictionaryStore } from "./store";
export { defineEnum } from "./values";
export { createDictionaryProvider } from "./provider";
export { createDictionaryParser } from "./parser";
export type {
  DictionaryValue,
  DictionaryOption,
  DictionaryLabelOptions,
  DictionaryLoadOptions,
  DictionaryLoadContext,
  DictionaryLoader,
  DictionaryRemoteDefinition,
  DictionaryDefinition,
  DictionaryStatus,
  DictionaryState,
  DictionarySource,
  DictionaryOptionsSource,
  DictionaryProvider,
  DictionaryStoreOptions,
  DictionaryStore,
} from "./types";

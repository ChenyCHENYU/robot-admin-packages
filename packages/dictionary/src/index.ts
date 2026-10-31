/**
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-11-01
 * @Description: 无框架字典入口；Vue 接入由可选 /vue 子入口提供。
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
export { createDictionaryStore } from "./store";
export { defineEnum } from "./values";
export type {
  DictionaryValue,
  DictionaryOption,
  DictionaryLabelOptions,
  DictionaryLoadOptions,
  DictionaryLoadContext,
  DictionaryRemoteDefinition,
  DictionaryDefinition,
  DictionaryStatus,
  DictionaryState,
  DictionarySource,
  DictionaryStoreOptions,
  DictionaryStore,
} from "./types";

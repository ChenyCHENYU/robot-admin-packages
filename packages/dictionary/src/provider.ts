/**
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-11-01
 * @Description: 组合页面与应用只读字典源，不创建缓存、请求或全局状态。
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import type { DictionaryProvider } from "./types";

/** 顺序即优先级；仅名称缺失时兜底，已找到字典的加载失败不换源。 */
export function createDictionaryProvider(
  ...providers: readonly DictionaryProvider[]
): DictionaryProvider {
  return {
    getDictionary(name) {
      for (const provider of providers) {
        const source = provider.getDictionary(name);
        if (source != null) return source;
      }
      return undefined;
    },
  };
}

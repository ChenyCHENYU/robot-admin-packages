/**
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-11-01
 * @Description: 字典公共协议；根入口不依赖框架、请求库或 UI。
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
export type DictionaryValue = string | number | boolean;

export interface DictionaryOption {
  readonly value: DictionaryValue;
  readonly label: string;
  readonly disabled?: boolean;
  readonly [key: string]: unknown;
}

export interface DictionaryLabelOptions {
  separator?: string;
  empty?: string;
  unknown?: string | ((value: unknown) => string);
  /** 仅显式启用时拆分字符串；拆分后仍保留字符串编码，不推断数字类型。 */
  split?: string | RegExp;
}

export interface DictionaryLoadOptions {
  signal?: AbortSignal;
  /** 绕过 TTL 和失败冷却；已有请求仍共享，避免多个字段重复重试。 */
  force?: boolean;
}

export interface DictionaryLoadContext {
  readonly signal: AbortSignal;
  readonly scope: string;
}

export interface DictionaryRemoteDefinition {
  load(context: DictionaryLoadContext): Promise<readonly DictionaryOption[]>;
  ttlMs?: number;
}

export type DictionaryDefinition =
  readonly DictionaryOption[] | DictionaryRemoteDefinition;
export type DictionaryStatus = "idle" | "loading" | "ready" | "empty" | "error";

export interface DictionaryState {
  readonly status: DictionaryStatus;
  readonly options: readonly DictionaryOption[];
  readonly error: unknown | null;
  readonly updatedAt: number | null;
  readonly scope: string;
}

/** 同时兼容 Naive 组件选项源和 MachTable 同步 get() 列策略。 */
export interface DictionarySource {
  getOptions(): readonly DictionaryOption[];
  get(key: DictionaryValue): string | undefined;
  label(value: unknown, options?: DictionaryLabelOptions): string;
  load(options?: DictionaryLoadOptions): Promise<readonly DictionaryOption[]>;
  getState(): DictionaryState;
  subscribe(listener: () => void): () => void;
}

export interface DictionaryStoreOptions {
  scope?: string;
  ttlMs?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  /** 每次共享请求失败只通知一次；观察者异常不会替换原始错误。 */
  onError?(
    error: unknown,
    context: { name: string; scope: string },
  ): void | Promise<void>;
}

export interface DictionaryStore<TName extends string = string> {
  getDictionary(name: string extends TName ? never : TName): DictionarySource;
  getDictionary(name: string): DictionarySource | undefined;
  setScope(scope: string): void;
  invalidate(name?: TName): void;
  preload(
    names?: readonly TName[],
  ): Promise<PromiseSettledResult<readonly DictionaryOption[]>[]>;
  destroy(): void;
}

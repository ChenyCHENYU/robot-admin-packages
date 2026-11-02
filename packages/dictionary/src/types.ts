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

/** 应用统一按后端字典码加载；仅在对应源首次消费或刷新时调用。 */
export type DictionaryLoader = (
  name: string,
  context: DictionaryLoadContext,
) => Promise<readonly DictionaryOption[]>;

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

/** 只读选项源；数据订阅与可选加载，不要求特定 Store 或请求客户端。 */
export interface DictionaryOptionsSource {
  getOptions(): readonly Pick<
    DictionaryOption,
    "value" | "label" | "disabled"
  >[];
  load?(context: {
    signal: AbortSignal;
    force?: boolean;
  }): Promise<
    readonly Pick<DictionaryOption, "value" | "label" | "disabled">[]
  >;
  getState?(): Pick<DictionaryState, "status"> &
    Partial<Omit<DictionaryState, "status" | "options">> & {
      readonly options?: readonly Pick<
        DictionaryOption,
        "value" | "label" | "disabled"
      >[];
    };
  subscribe?(listener: () => void): () => void;
  label?(value: unknown, options?: DictionaryLabelOptions): string;
}

export interface DictionaryProvider {
  getDictionary(name: string): DictionaryOptionsSource | undefined;
}

/** 可加载的字典源，包含同步索引和完整状态。 */
export interface DictionarySource extends DictionaryOptionsSource {
  getOptions(): readonly DictionaryOption[];
  get(key: DictionaryValue): string | undefined;
  label(value: unknown, options?: DictionaryLabelOptions): string;
  load(options?: DictionaryLoadOptions): Promise<readonly DictionaryOption[]>;
  getState(): DictionaryState;
  subscribe(listener: () => void): () => void;
}

export interface DictionaryStoreOptions {
  /** 暂停远程加载时只返回现有快照；由宿主在门控变化时失效在途请求。 */
  enabled?: boolean | (() => boolean);
  /** 未显式定义的名称按原码加载；静态或专属定义优先，失败不换源。 */
  load?: DictionaryLoader;
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

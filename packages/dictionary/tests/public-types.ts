import {
  createDictionaryStore,
  defineEnum,
  type DictionaryDefinition,
  type DictionarySource,
  type DictionaryOptionsSource,
} from "../src";
import {
  useDictionary,
  useDictionaryLabels,
  useDictionaryRefresh,
} from "../src/vue";

const store = createDictionaryStore({
  state: defineEnum([
    { value: false, label: "否" },
    { value: 0, label: "零" },
  ]),
  remote: {
    load: async ({ signal, scope }) =>
      signal.aborted ? [] : [{ value: scope, label: scope }],
  },
});
const source: DictionarySource = store.getDictionary("state");
const dynamic: string = "unregistered";
const maybe: DictionarySource | undefined = store.getDictionary(dynamic);
// @ts-expect-error 动态名称必须处理未知字典。
const unsafe: DictionarySource = store.getDictionary(dynamic);
const dynamicStore = createDictionaryStore(
  {} as Record<string, DictionaryDefinition>,
);
// @ts-expect-error 动态注册表无法保证任一名称一定存在。
const unsafeDynamic: DictionarySource = dynamicStore.getDictionary("unknown");
const formProvider: {
  getDictionary(name: string):
    | {
        getOptions(): readonly {
          value: string | number | boolean;
          label: string;
          disabled?: boolean;
        }[];
        load?(context: { signal: AbortSignal }): Promise<
          readonly {
            value: string | number | boolean;
            label: string;
            disabled?: boolean;
          }[]
        >;
        subscribe?(listener: () => void): () => void;
      }
    | undefined;
} = store;
const machSource: { get(key: string | number): string | undefined } = source;
source.label([false, 0, "001"]);
const binding = useDictionary(() => maybe, { immediate: false });
useDictionaryRefresh([source], () => undefined);
const details = useDictionaryLabels(store, () => ({ state: false, other: 0 }), {
  state: "state",
});
const label: string = details.labels.value.state;
// @ts-expect-error 未绑定字段不能作为标签访问。
details.labels.value.other;
// @ts-expect-error 必须绑定实际存在的记录字段。
useDictionaryLabels(store, { state: false }, { missing: "state" });
// @ts-expect-error 命名注册表校验字典名，避免拼写错误。
useDictionaryLabels(store, { state: false }, { state: "unknown" });
// @ts-expect-error 标签只读，不能覆盖原码或共享映射。
details.labels.value.state = "修改";
void label;
const minimalSource: DictionaryOptionsSource = { getOptions: () => [] };
const reader = { getDictionary: (_name: string) => minimalSource };
const schema = [
  { prop: "state", type: "select", dictionary: "state" },
  { prop: "other", type: "input" },
] as const;
const reused = useDictionaryLabels(reader, { state: false, other: 0 }, schema);
const reusedLabel: string = reused.labels.value.state;
// @ts-expect-error 没有字典的字段不声明为已翻译字段。
reused.labels.value.other;
// @ts-expect-error 同时有正确字段时也必须拒绝多余字段。
useDictionaryLabels(store, { state: false }, { state: "state", typo: "state" });
useDictionaryLabels(
  reader,
  { state: false },
  { state: minimalSource },
  { enabled: () => true },
);
void reusedLabel;
// 与组件库既有 interface 协议兼容，不要求任意元数据索引签名。
interface ExistingOption {
  value: string | number | boolean;
  label: string;
  disabled?: boolean;
}
const existingProvider = {
  getDictionary: (_name: string) => ({
    getOptions: (): readonly ExistingOption[] => [],
  }),
};
useDictionaryLabels(existingProvider, { state: false }, schema);
void [unsafe, unsafeDynamic, formProvider, machSource, binding];

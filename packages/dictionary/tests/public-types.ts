import {
  createDictionaryStore,
  defineEnum,
  type DictionaryDefinition,
  type DictionarySource,
} from "../src";
import { useDictionary, useDictionaryRefresh } from "../src/vue";

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
void [unsafe, unsafeDynamic, formProvider, machSource, binding];

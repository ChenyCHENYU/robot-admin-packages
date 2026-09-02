import type { Directive } from "vue";

export interface ClickOutsideOptions {
  handler: (event: PointerEvent) => void;
  enabled?: boolean;
  exclude?: readonly (string | Element)[];
  onError?: (error: Error) => void;
}

export type ClickOutsideBinding =
  | ((event: PointerEvent) => void)
  | ClickOutsideOptions;

interface Entry {
  el: HTMLElement;
  options: ClickOutsideOptions & { enabled: boolean };
  timer?: ReturnType<typeof setTimeout>;
  registered: boolean;
}

interface DocumentRegistry {
  entries: Set<Entry>;
  listener: (event: PointerEvent) => void;
}

const states = new WeakMap<HTMLElement, Entry>();
const registries = new WeakMap<Document, DocumentRegistry>();

function isElementNode(node: unknown): node is Element {
  return (
    typeof node === "object" &&
    node !== null &&
    (node as Node).nodeType === 1 &&
    typeof (node as Element).matches === "function"
  );
}

function parseOptions(
  value: ClickOutsideBinding | undefined,
): ClickOutsideOptions & { enabled: boolean } {
  if (!value) return { handler: () => undefined, enabled: false };
  return typeof value === "function"
    ? { handler: value, enabled: true }
    : { enabled: true, ...value };
}

function isExcluded(
  event: PointerEvent,
  exclude: readonly (string | Element)[] | undefined,
  onError?: (error: Error) => void,
): boolean {
  if (!exclude?.length) return false;
  const path = event.composedPath();
  for (const item of exclude) {
    if (typeof item !== "string") {
      if (path.includes(item)) return true;
      continue;
    }
    try {
      if (
        path.some((node) => isElementNode(node) && node.matches(item))
      ) {
        return true;
      }
    } catch (cause) {
      onError?.(
        cause instanceof Error
          ? cause
          : new Error(`无效的 exclude 选择器: ${item}`),
      );
    }
  }
  return false;
}

function ensureRegistry(doc: Document): DocumentRegistry {
  const existing = registries.get(doc);
  if (existing) return existing;
  const registry = {} as DocumentRegistry;
  registry.entries = new Set();
  registry.listener = (event) => {
    const path = event.composedPath();
    for (const entry of [...registry.entries]) {
      if (!entry.options.enabled || path.includes(entry.el)) continue;
      if (
        isExcluded(event, entry.options.exclude, entry.options.onError)
      ) {
        continue;
      }
      try {
        entry.options.handler(event);
      } catch (cause) {
        const error =
          cause instanceof Error ? cause : new Error(String(cause));
        if (entry.options.onError) entry.options.onError(error);
        else queueMicrotask(() => {
          throw error;
        });
      }
    }
  };
  doc.addEventListener("pointerdown", registry.listener, true);
  registries.set(doc, registry);
  return registry;
}

function register(entry: Entry): void {
  if (entry.registered || !entry.options.enabled) return;
  ensureRegistry(entry.el.ownerDocument).entries.add(entry);
  entry.registered = true;
}

function unregister(entry: Entry): void {
  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = undefined;
  if (!entry.registered) return;
  const doc = entry.el.ownerDocument;
  const registry = registries.get(doc);
  registry?.entries.delete(entry);
  entry.registered = false;
  if (registry && registry.entries.size === 0) {
    doc.removeEventListener("pointerdown", registry.listener, true);
    registries.delete(doc);
  }
}

const clickOutsideDirective: Directive<
  HTMLElement,
  ClickOutsideBinding | undefined
> = {
  mounted(el, binding) {
    const entry: Entry = {
      el,
      options: parseOptions(binding.value),
      registered: false,
    };
    states.set(el, entry);
    entry.timer = setTimeout(() => {
      entry.timer = undefined;
      register(entry);
    });
  },
  updated(el, binding) {
    const entry = states.get(el);
    if (!entry) return;
    const wasEnabled = entry.options.enabled;
    entry.options = parseOptions(binding.value);
    if (wasEnabled && !entry.options.enabled) unregister(entry);
    else if (!wasEnabled && entry.options.enabled) register(entry);
  },
  unmounted(el) {
    const entry = states.get(el);
    if (!entry) return;
    unregister(entry);
    states.delete(el);
  },
};

export default clickOutsideDirective;

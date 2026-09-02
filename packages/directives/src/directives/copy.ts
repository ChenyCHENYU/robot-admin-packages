import type { Directive } from "vue";

export interface CopyMessageAdapter {
  success?: (message: string) => void;
  error?: (message: string) => void;
}

export interface CopyOptions {
  text?: string | (() => string | Promise<string>);
  successMessage?: string | false;
  errorMessage?: string | false;
  onSuccess?: (text: string) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  statusDuration?: number;
  title?: string | false;
  /** @deprecated Prefer createCopyDirective({ notify }). */
  messageInstance?: CopyMessageAdapter;
}

export type CopyBinding = string | CopyOptions;

export interface CopyDirectiveOptions {
  notify?: (type: "success" | "error", message: string) => void;
}

interface CopyState {
  options: Required<
    Pick<CopyOptions, "disabled" | "statusDuration">
  > &
    CopyOptions;
  original: {
    cursor: string;
    title: string | null;
    dataCopy: string | null;
    role: string | null;
    tabIndex: string | null;
    ariaDisabled: string | null;
  };
  click: (event: Event) => void;
  keydown: (event: KeyboardEvent) => void;
  statusTimer?: ReturnType<typeof setTimeout>;
}

const states = new WeakMap<HTMLElement, CopyState>();

function parseOptions(value: CopyBinding | undefined): CopyState["options"] {
  const raw = typeof value === "string" ? { text: value } : (value ?? {});
  const statusDuration = raw.statusDuration ?? 300;
  if (!Number.isFinite(statusDuration) || statusDuration < 0) {
    throw new RangeError("statusDuration 必须是大于或等于 0 的有限数值");
  }
  return {
    ...raw,
    disabled: raw.disabled ?? false,
    statusDuration,
    successMessage: raw.successMessage ?? "复制成功",
    errorMessage: raw.errorMessage ?? "复制失败",
    title: raw.title ?? "点击复制",
  };
}

async function copyToClipboard(text: string): Promise<void> {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard?.writeText &&
    globalThis.isSecureContext
  ) {
    await navigator.clipboard.writeText(text);
    return;
  }
  if (typeof document === "undefined") {
    throw new Error("当前环境不支持剪贴板操作");
  }
  const textArea = document.createElement("textarea");
  const activeElement = document.activeElement as HTMLElement | null;
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  Object.assign(textArea.style, {
    position: "fixed",
    left: "-999999px",
    top: "0",
    opacity: "0",
  });
  document.body.appendChild(textArea);
  textArea.select();
  try {
    if (!document.execCommand("copy")) throw new Error("浏览器拒绝了复制操作");
  } finally {
    textArea.remove();
    activeElement?.focus?.();
  }
}

function setOptionalAttribute(
  el: HTMLElement,
  name: string,
  value: string | null,
): void {
  if (value === null) el.removeAttribute(name);
  else el.setAttribute(name, value);
}

function syncElement(el: HTMLElement, state: CopyState): void {
  el.style.cursor = state.options.disabled ? "not-allowed" : "pointer";
  el.dataset.copy = "true";
  el.setAttribute("aria-disabled", String(state.options.disabled));
  if (state.options.title === false) el.removeAttribute("title");
  else el.title = state.options.disabled ? "" : (state.options.title ?? "点击复制");

  const isInteractive =
    el.matches("button, a[href], input, select, textarea, summary") ||
    el.hasAttribute("tabindex");
  if (!isInteractive) {
    el.setAttribute("role", "button");
    el.tabIndex = 0;
  }
}

function setStatus(
  el: HTMLElement,
  state: CopyState,
  className: string,
): void {
  if (state.statusTimer) clearTimeout(state.statusTimer);
  el.classList.remove("copy-success", "copy-error");
  el.classList.add(className);
  state.statusTimer = setTimeout(() => {
    el.classList.remove(className);
    state.statusTimer = undefined;
  }, state.options.statusDuration);
}

async function getText(el: HTMLElement, options: CopyOptions): Promise<string> {
  const configured =
    typeof options.text === "function" ? await options.text() : options.text;
  const text = configured ?? el.textContent ?? "";
  if (!text.trim()) throw new Error("没有可复制的内容");
  return text;
}

async function execute(
  el: HTMLElement,
  state: CopyState,
  runtime: CopyDirectiveOptions,
): Promise<void> {
  if (state.options.disabled) return;
  try {
    const text = await getText(el, state.options);
    await copyToClipboard(text);
    state.options.onSuccess?.(text);
    if (state.options.successMessage) {
      const adapter = state.options.messageInstance?.success;
      if (adapter) adapter(state.options.successMessage);
      else runtime.notify?.("success", state.options.successMessage);
    }
    setStatus(el, state, "copy-success");
  } catch (cause) {
    const error = cause instanceof Error ? cause : new Error(String(cause));
    state.options.onError?.(error);
    if (state.options.errorMessage) {
      const adapter = state.options.messageInstance?.error;
      if (adapter) adapter(state.options.errorMessage);
      else runtime.notify?.("error", state.options.errorMessage);
    }
    setStatus(el, state, "copy-error");
  }
}

function restore(el: HTMLElement, state: CopyState): void {
  el.style.cursor = state.original.cursor;
  setOptionalAttribute(el, "title", state.original.title);
  setOptionalAttribute(el, "data-copy", state.original.dataCopy);
  setOptionalAttribute(el, "role", state.original.role);
  setOptionalAttribute(el, "tabindex", state.original.tabIndex);
  setOptionalAttribute(el, "aria-disabled", state.original.ariaDisabled);
  el.classList.remove("copy-success", "copy-error");
}

export function createCopyDirective(
  runtime: CopyDirectiveOptions = {},
): Directive<HTMLElement, CopyBinding | undefined> {
  return {
    mounted(el, binding) {
      const state = {} as CopyState;
      state.options = parseOptions(binding.value);
      state.original = {
        cursor: el.style.cursor,
        title: el.getAttribute("title"),
        dataCopy: el.getAttribute("data-copy"),
        role: el.getAttribute("role"),
        tabIndex: el.getAttribute("tabindex"),
        ariaDisabled: el.getAttribute("aria-disabled"),
      };
      state.click = () => void execute(el, state, runtime);
      state.keydown = (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          void execute(el, state, runtime);
        }
      };
      states.set(el, state);
      syncElement(el, state);
      el.addEventListener("click", state.click);
      el.addEventListener("keydown", state.keydown);
    },
    updated(el, binding) {
      const state = states.get(el);
      if (!state) return;
      state.options = parseOptions(binding.value);
      syncElement(el, state);
    },
    unmounted(el) {
      const state = states.get(el);
      if (!state) return;
      if (state.statusTimer) clearTimeout(state.statusTimer);
      el.removeEventListener("click", state.click);
      el.removeEventListener("keydown", state.keydown);
      restore(el, state);
      states.delete(el);
    },
  };
}

export default createCopyDirective();

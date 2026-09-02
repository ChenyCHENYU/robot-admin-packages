import type { Directive } from "vue";
import {
  assertDelay,
  isRedispatchedEvent,
  redispatchEvent,
} from "../internal/event";

export interface DebounceOptions<E extends Event = Event> {
  disabled?: boolean;
  delay?: number;
  /** Alias of delay. */
  wait?: number;
  immediate?: boolean;
  leading?: boolean;
  trailing?: boolean;
  event?: string;
  /** Preferred mode: the directive owns and debounces this handler. */
  handler?: (event: E) => void;
  onExecute?: (event: E) => void;
  onCancel?: () => void;
}

export type DebounceBinding =
  | number
  | ((event: Event) => void)
  | DebounceOptions;

interface NormalizedOptions extends DebounceOptions {
  delay: number;
  disabled: boolean;
  leading: boolean;
  trailing: boolean;
  event: string;
}

interface DebounceState {
  options: NormalizedOptions;
  listener: EventListener;
  timer?: ReturnType<typeof setTimeout>;
  lastEvent?: Event;
  leadingInvoked: boolean;
  callCount: number;
}

const states = new WeakMap<HTMLElement, DebounceState>();

function parseOptions(
  value: DebounceBinding | undefined,
  argument?: string,
): NormalizedOptions {
  const raw: DebounceOptions =
    typeof value === "number"
      ? { delay: value }
      : typeof value === "function"
        ? { handler: value }
        : (value ?? {});
  const delay = raw.wait ?? raw.delay ?? 300;
  assertDelay(delay);
  const leading = raw.leading ?? raw.immediate ?? false;
  return {
    ...raw,
    delay,
    disabled: raw.disabled ?? false,
    leading,
    trailing: raw.trailing ?? !Boolean(raw.immediate),
    event: argument ?? raw.event ?? "click",
  };
}

function stopLegacyEvent(event: Event): void {
  event.preventDefault();
  event.stopImmediatePropagation();
}

function execute(el: HTMLElement, state: DebounceState, event: Event): void {
  state.options.handler?.(event);
  state.options.onExecute?.(event);
  if (!state.options.handler) redispatchEvent(el, event);
}

function handleEvent(
  el: HTMLElement,
  state: DebounceState,
  event: Event,
): void {
  if (isRedispatchedEvent(event) || state.options.disabled) return;
  const ownedMode = Boolean(state.options.handler);
  const leadingFirst = state.options.leading && !state.leadingInvoked;
  if (!ownedMode && !leadingFirst) stopLegacyEvent(event);

  state.lastEvent = event;
  state.callCount += 1;
  if (state.timer) {
    clearTimeout(state.timer);
    state.options.onCancel?.();
  }

  if (leadingFirst) {
    state.leadingInvoked = true;
    state.options.handler?.(event);
    state.options.onExecute?.(event);
  }

  state.timer = setTimeout(() => {
    state.timer = undefined;
    const lastEvent = state.lastEvent;
    const shouldRunTrailing =
      state.options.trailing &&
      (!state.options.leading || state.callCount > 1);
    state.leadingInvoked = false;
    state.callCount = 0;
    if (lastEvent && shouldRunTrailing) execute(el, state, lastEvent);
    state.lastEvent = undefined;
  }, state.options.delay);
}

function bind(
  el: HTMLElement,
  value: DebounceBinding | undefined,
  argument?: string,
): void {
  unbind(el);
  const options = parseOptions(value, argument);
  const state = {} as DebounceState;
  state.options = options;
  state.leadingInvoked = false;
  state.callCount = 0;
  state.listener = (event) => handleEvent(el, state, event);
  states.set(el, state);
  el.addEventListener(options.event, state.listener, { capture: !options.handler });
}

function unbind(el: HTMLElement): void {
  const state = states.get(el);
  if (!state) return;
  if (state.timer) clearTimeout(state.timer);
  el.removeEventListener(state.options.event, state.listener, {
    capture: !state.options.handler,
  });
  states.delete(el);
}

const debounceDirective: Directive<
  HTMLElement,
  DebounceBinding | undefined
> = {
  mounted(el, binding) {
    bind(el, binding.value, binding.arg);
  },
  updated(el, binding) {
    const state = states.get(el);
    const options = parseOptions(binding.value, binding.arg);
    if (
      !state ||
      state.options.event !== options.event ||
      Boolean(state.options.handler) !== Boolean(options.handler)
    ) {
      bind(el, binding.value, binding.arg);
      return;
    }
    if (
      state.options.delay !== options.delay ||
      state.options.leading !== options.leading ||
      state.options.trailing !== options.trailing ||
      (!state.options.disabled && options.disabled)
    ) {
      if (state.timer) clearTimeout(state.timer);
      if (state.lastEvent) state.options.onCancel?.();
      state.timer = undefined;
      state.lastEvent = undefined;
      state.leadingInvoked = false;
      state.callCount = 0;
    }
    state.options = options;
  },
  unmounted: unbind,
};

export default debounceDirective;

import type { Directive } from "vue";
import {
  assertDelay,
  isRedispatchedEvent,
  redispatchEvent,
} from "../internal/event";

export interface ThrottleOptions<E extends Event = Event> {
  disabled?: boolean;
  delay?: number;
  wait?: number;
  leading?: boolean;
  trailing?: boolean;
  event?: string;
  handler?: (event: E) => void;
  onExecute?: (event: E) => void;
  onThrottle?: (event: E) => void;
}

export type ThrottleBinding =
  | number
  | ((event: Event) => void)
  | ThrottleOptions;

interface NormalizedOptions extends ThrottleOptions {
  delay: number;
  disabled: boolean;
  leading: boolean;
  trailing: boolean;
  event: string;
}

interface ThrottleState {
  options: NormalizedOptions;
  listener: EventListener;
  timer?: ReturnType<typeof setTimeout>;
  lastEvent?: Event;
  lastInvoke: number;
}

const states = new WeakMap<HTMLElement, ThrottleState>();

function parseOptions(
  value: ThrottleBinding | undefined,
  argument?: string,
): NormalizedOptions {
  const raw: ThrottleOptions =
    typeof value === "number"
      ? { delay: value }
      : typeof value === "function"
        ? { handler: value }
        : (value ?? {});
  const delay = raw.wait ?? raw.delay ?? 300;
  assertDelay(delay);
  return {
    ...raw,
    delay,
    disabled: raw.disabled ?? false,
    leading: raw.leading ?? true,
    trailing: raw.trailing ?? true,
    event: argument ?? raw.event ?? "click",
  };
}

function stopLegacyEvent(event: Event): void {
  event.preventDefault();
  event.stopImmediatePropagation();
}

function invoke(el: HTMLElement, state: ThrottleState, event: Event): void {
  state.lastInvoke = Date.now();
  state.options.handler?.(event);
  state.options.onExecute?.(event);
  if (!state.options.handler) redispatchEvent(el, event);
}

function scheduleTrailing(el: HTMLElement, state: ThrottleState, wait: number) {
  if (!state.options.trailing || state.timer) return;
  state.timer = setTimeout(() => {
    state.timer = undefined;
    const event = state.lastEvent;
    state.lastEvent = undefined;
    if (event) invoke(el, state, event);
  }, Math.max(0, wait));
}

function handleEvent(
  el: HTMLElement,
  state: ThrottleState,
  event: Event,
): void {
  if (isRedispatchedEvent(event) || state.options.disabled) return;
  const ownedMode = Boolean(state.options.handler);
  const now = Date.now();
  if (state.lastInvoke === 0 && !state.options.leading) state.lastInvoke = now;
  const remaining = state.options.delay - (now - state.lastInvoke);

  if (remaining <= 0 || remaining > state.options.delay) {
    if (state.timer) clearTimeout(state.timer);
    state.timer = undefined;
    state.lastEvent = undefined;
    if (ownedMode) invoke(el, state, event);
    else {
      state.lastInvoke = now;
      state.options.onExecute?.(event);
    }
    return;
  }

  state.lastEvent = event;
  state.options.onThrottle?.(event);
  if (!ownedMode) stopLegacyEvent(event);
  scheduleTrailing(el, state, remaining);
}

function bind(
  el: HTMLElement,
  value: ThrottleBinding | undefined,
  argument?: string,
): void {
  unbind(el);
  const options = parseOptions(value, argument);
  const state = {} as ThrottleState;
  state.options = options;
  state.lastInvoke = 0;
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

const throttleDirective: Directive<
  HTMLElement,
  ThrottleBinding | undefined
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
      state.timer = undefined;
      state.lastEvent = undefined;
      state.lastInvoke = 0;
    }
    state.options = options;
  },
  unmounted: unbind,
};

export default throttleDirective;

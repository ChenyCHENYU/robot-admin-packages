import type { Directive } from "vue";
import { assertDelay } from "../internal/event";

export interface LongPressOptions {
  disabled?: boolean;
  duration?: number;
  movementTolerance?: number;
  preventContextMenu?: boolean;
  onStart?: (event: Event) => void;
  onProgress?: (progress: number, elapsed: number) => void;
  onTrigger?: (event: Event) => void;
  onCancel?: (event: Event) => void;
  /** 每次已开始的按压结束时通知，包括触发后释放、取消和卸载。 */
  onEnd?: (event: Event, triggered: boolean) => void;
}

export type LongPressBinding =
  | number
  | ((event: Event) => void)
  | LongPressOptions;

interface NormalizedOptions extends LongPressOptions {
  disabled: boolean;
  duration: number;
  movementTolerance: number;
  preventContextMenu: boolean;
}

interface LongPressState {
  options: NormalizedOptions;
  timer?: ReturnType<typeof setTimeout>;
  frame?: number;
  pointerId?: number;
  startX: number;
  startY: number;
  startTime: number;
  sourceEvent?: Event;
  triggered: boolean;
  pointerdown: (event: PointerEvent) => void;
  pointermove: (event: PointerEvent) => void;
  pointerup: (event: PointerEvent) => void;
  pointercancel: (event: PointerEvent) => void;
  keydown: (event: KeyboardEvent) => void;
  keyup: (event: KeyboardEvent) => void;
  blur: (event: FocusEvent) => void;
  contextmenu: (event: Event) => void;
}

const states = new WeakMap<HTMLElement, LongPressState>();

function now(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

function parseOptions(value: LongPressBinding | undefined): NormalizedOptions {
  const raw: LongPressOptions =
    typeof value === "number"
      ? { duration: value }
      : typeof value === "function"
        ? { onTrigger: value }
        : (value ?? {});
  const duration = raw.duration ?? 800;
  assertDelay(duration, "duration");
  const movementTolerance = raw.movementTolerance ?? 10;
  if (!Number.isFinite(movementTolerance) || movementTolerance < 0) {
    throw new RangeError("movementTolerance 必须是大于或等于 0 的有限数值");
  }
  return {
    ...raw,
    disabled: raw.disabled ?? false,
    duration,
    movementTolerance,
    preventContextMenu: raw.preventContextMenu ?? true,
  };
}

function clearTimers(state: LongPressState): void {
  if (state.timer) clearTimeout(state.timer);
  if (state.frame !== undefined) cancelAnimationFrame(state.frame);
  state.timer = undefined;
  state.frame = undefined;
}

function updateProgress(state: LongPressState): void {
  const source = state.sourceEvent;
  if (!source || state.triggered) return;
  const elapsed = now() - state.startTime;
  state.options.onProgress?.(
    Math.min(1, elapsed / state.options.duration),
    elapsed,
  );
  if (state.sourceEvent === source) {
    state.frame = requestAnimationFrame(() => updateProgress(state));
  }
}

function start(state: LongPressState, event: Event): void {
  if (state.options.disabled || state.sourceEvent) return;
  state.sourceEvent = event;
  state.startTime = now();
  state.triggered = false;
  state.options.onStart?.(event);
  if (state.sourceEvent !== event) return;
  if (state.options.onProgress) {
    state.options.onProgress(0, 0);
    if (state.sourceEvent !== event) return;
    state.frame = requestAnimationFrame(() => updateProgress(state));
  }
  state.timer = setTimeout(() => {
    state.timer = undefined;
    state.triggered = true;
    if (state.frame !== undefined) cancelAnimationFrame(state.frame);
    state.frame = undefined;
    state.options.onProgress?.(1, state.options.duration);
    if (state.sourceEvent === event) state.options.onTrigger?.(event);
  }, state.options.duration);
}

function finish(
  state: LongPressState,
  event: Event,
  reason: "release" | "cancel" | "dispose",
): void {
  if (!state.sourceEvent) return;
  const { triggered, options } = state;
  clearTimers(state);
  state.pointerId = undefined;
  state.sourceEvent = undefined;
  state.triggered = false;
  try {
    if (reason !== "dispose" && (reason === "cancel" || !triggered)) {
      options.onCancel?.(event);
    }
  } finally {
    options.onEnd?.(event, triggered);
  }
}

function bind(el: HTMLElement, value: LongPressBinding | undefined): void {
  unbind(el);
  const state = {} as LongPressState;
  state.options = parseOptions(value);
  state.startX = 0;
  state.startY = 0;
  state.startTime = 0;
  state.triggered = false;
  state.pointerdown = (event) => {
    if (
      state.options.disabled ||
      state.sourceEvent ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return;
    }
    state.pointerId = event.pointerId;
    state.startX = event.clientX;
    state.startY = event.clientY;
    try {
      el.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is an enhancement, not a requirement.
    }
    start(state, event);
  };
  state.pointermove = (event) => {
    if (state.pointerId !== event.pointerId || !state.sourceEvent) return;
    const distance = Math.hypot(
      event.clientX - state.startX,
      event.clientY - state.startY,
    );
    if (distance > state.options.movementTolerance) finish(state, event, "cancel");
  };
  state.pointerup = (event) => {
    if (state.pointerId === event.pointerId) finish(state, event, "release");
  };
  state.pointercancel = (event) => {
    if (state.pointerId === event.pointerId) finish(state, event, "cancel");
  };
  state.keydown = (event) => {
    if (state.options.disabled || state.pointerId !== undefined) return;
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    if (!event.repeat) start(state, event);
  };
  state.keyup = (event) => {
    const source = state.sourceEvent;
    if (source && "key" in source && source.key === event.key) {
      event.preventDefault();
      finish(state, event, "release");
    }
  };
  state.blur = (event) => {
    if (state.pointerId === undefined) finish(state, event, "cancel");
  };
  state.contextmenu = (event) => {
    if (state.options.preventContextMenu && state.sourceEvent) {
      event.preventDefault();
    }
  };
  states.set(el, state);
  el.addEventListener("pointerdown", state.pointerdown);
  el.addEventListener("pointermove", state.pointermove);
  el.addEventListener("pointerup", state.pointerup);
  el.addEventListener("pointercancel", state.pointercancel);
  el.addEventListener("lostpointercapture", state.pointercancel);
  el.addEventListener("keydown", state.keydown);
  el.addEventListener("keyup", state.keyup);
  el.addEventListener("blur", state.blur);
  el.addEventListener("contextmenu", state.contextmenu);
}

function unbind(el: HTMLElement): void {
  const state = states.get(el);
  if (!state) return;
  el.removeEventListener("pointerdown", state.pointerdown);
  el.removeEventListener("pointermove", state.pointermove);
  el.removeEventListener("pointerup", state.pointerup);
  el.removeEventListener("pointercancel", state.pointercancel);
  el.removeEventListener("lostpointercapture", state.pointercancel);
  el.removeEventListener("keydown", state.keydown);
  el.removeEventListener("keyup", state.keyup);
  el.removeEventListener("blur", state.blur);
  el.removeEventListener("contextmenu", state.contextmenu);
  states.delete(el);
  if (state.sourceEvent) finish(state, state.sourceEvent, "dispose");
}

const longPressDirective: Directive<
  HTMLElement,
  LongPressBinding | undefined
> = {
  mounted(el, binding) {
    bind(el, binding.value);
  },
  updated(el, binding) {
    const state = states.get(el);
    if (!state) {
      bind(el, binding.value);
      return;
    }
    const next = parseOptions(binding.value);
    if (next.disabled && state.sourceEvent) {
      finish(state, state.sourceEvent, "cancel");
    }
    state.options = next;
  },
  unmounted: unbind,
};

export default longPressDirective;

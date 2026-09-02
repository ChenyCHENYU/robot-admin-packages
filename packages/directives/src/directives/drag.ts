import type { Directive } from "vue";

export interface Position {
  x: number;
  y: number;
}

export interface DragOptions {
  disabled?: boolean;
  handle?: string;
  boundary?: boolean | string | HTMLElement;
  grid?: readonly [number, number];
  axis?: "x" | "y" | "both";
  onStart?: (el: HTMLElement, event: PointerEvent) => void;
  onDrag?: (el: HTMLElement, position: Position, event: PointerEvent) => void;
  onEnd?: (el: HTMLElement, position: Position, event: PointerEvent) => void;
}

export type DragBinding = boolean | DragOptions;

interface DragState {
  options: Required<Pick<DragOptions, "disabled" | "grid" | "axis">> &
    DragOptions;
  trigger: HTMLElement;
  original: {
    cursor: string;
    position: string;
    left: string;
    top: string;
    touchAction: string;
  };
  applied: Partial<DragState["original"]>;
  pointerId?: number;
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
  startRect?: DOMRect;
  boundaryRect?: DOMRect;
  lastPosition: Position;
  pendingEvent?: PointerEvent;
  frame?: number;
  pointerdown: (event: PointerEvent) => void;
  pointermove: (event: PointerEvent) => void;
  pointerup: (event: PointerEvent) => void;
}

const states = new WeakMap<HTMLElement, DragState>();
const selectionLocks = new WeakMap<
  Document,
  { count: number; original: string }
>();

function lockSelection(doc: Document): void {
  const current = selectionLocks.get(doc);
  if (current) current.count += 1;
  else {
    selectionLocks.set(doc, {
      count: 1,
      original: doc.body.style.userSelect,
    });
    doc.body.style.userSelect = "none";
  }
}

function unlockSelection(doc: Document): void {
  const current = selectionLocks.get(doc);
  if (!current) return;
  current.count -= 1;
  if (current.count <= 0) {
    doc.body.style.userSelect = current.original;
    selectionLocks.delete(doc);
  }
}

function parseOptions(value: DragBinding | undefined): DragState["options"] {
  if (typeof value === "boolean") {
    return { disabled: !value, boundary: true, grid: [1, 1], axis: "both" };
  }
  const raw = value ?? {};
  const options = {
    ...raw,
    disabled: raw.disabled ?? false,
    boundary: raw.boundary ?? true,
    grid: raw.grid ?? ([1, 1] as const),
    axis: raw.axis ?? ("both" as const),
  };
  const [gridX, gridY] = options.grid;
  if (gridX <= 0 || gridY <= 0 || !Number.isFinite(gridX + gridY)) {
    throw new RangeError("grid 必须包含两个大于 0 的有限数值");
  }
  if (options.axis !== "x" && options.axis !== "y" && options.axis !== "both") {
    throw new TypeError("axis 必须是 x、y 或 both");
  }
  return options;
}

function resolveTrigger(el: HTMLElement, handle?: string): HTMLElement {
  if (!handle) return el;
  let trigger: Element | null;
  try {
    trigger = el.querySelector(handle);
  } catch (error) {
    throw new SyntaxError(
      `无效的拖拽 handle 选择器: ${
        error instanceof Error ? error.message : handle
      }`,
    );
  }
  const HTMLElementConstructor = el.ownerDocument.defaultView?.HTMLElement;
  if (
    !trigger ||
    (HTMLElementConstructor && !(trigger instanceof HTMLElementConstructor))
  ) {
    throw new Error(`未找到拖拽 handle: ${handle}`);
  }
  return trigger as HTMLElement;
}

function resolveBoundary(
  el: HTMLElement,
  boundary: DragOptions["boundary"],
): HTMLElement | undefined {
  if (!boundary) return undefined;
  if (typeof boundary === "object" && "getBoundingClientRect" in boundary) {
    return boundary;
  }
  if (typeof boundary === "string") {
    let match: Element | null;
    try {
      match = el.ownerDocument.querySelector(boundary);
    } catch (error) {
      throw new SyntaxError(
        `无效的拖拽 boundary 选择器: ${
          error instanceof Error ? error.message : boundary
        }`,
      );
    }
    const HTMLElementConstructor = el.ownerDocument.defaultView?.HTMLElement;
    return match &&
      (!HTMLElementConstructor || match instanceof HTMLElementConstructor)
      ? (match as HTMLElement)
      : undefined;
  }
  return el.parentElement ?? undefined;
}

function constrain(state: DragState, event: PointerEvent): Position {
  let dx = event.clientX - state.startX;
  let dy = event.clientY - state.startY;
  if (state.options.axis === "x") dy = 0;
  if (state.options.axis === "y") dx = 0;
  const [gridX, gridY] = state.options.grid;
  dx = Math.round(dx / gridX) * gridX;
  dy = Math.round(dy / gridY) * gridY;

  if (state.startRect && state.boundaryRect) {
    dx = Math.max(
      state.boundaryRect.left - state.startRect.left,
      Math.min(state.boundaryRect.right - state.startRect.right, dx),
    );
    dy = Math.max(
      state.boundaryRect.top - state.startRect.top,
      Math.min(state.boundaryRect.bottom - state.startRect.bottom, dy),
    );
  }
  return { x: state.startLeft + dx, y: state.startTop + dy };
}

function flushMove(el: HTMLElement, state: DragState): void {
  state.frame = undefined;
  const event = state.pendingEvent;
  if (!event || state.pointerId !== event.pointerId) return;
  const position = constrain(state, event);
  state.applied.left = el.style.left = `${position.x}px`;
  state.applied.top = el.style.top = `${position.y}px`;
  state.lastPosition = position;
  state.options.onDrag?.(el, position, event);
}

function cancelFrame(el: HTMLElement, state: DragState): void {
  if (state.frame === undefined) return;
  const view = el.ownerDocument.defaultView;
  if (view?.cancelAnimationFrame) view.cancelAnimationFrame(state.frame);
  else globalThis.cancelAnimationFrame?.(state.frame);
  state.frame = undefined;
}

function releaseActiveDrag(el: HTMLElement, state: DragState): void {
  const pointerId = state.pointerId;
  if (pointerId === undefined) return;
  state.pointerId = undefined;
  state.pendingEvent = undefined;
  const doc = el.ownerDocument;
  doc.removeEventListener("pointermove", state.pointermove);
  doc.removeEventListener("pointerup", state.pointerup);
  doc.removeEventListener("pointercancel", state.pointerup);
  unlockSelection(doc);
  try {
    state.trigger.releasePointerCapture(pointerId);
  } catch {
    // Pointer capture is optional and may already be released by the browser.
  }
}

function endDrag(el: HTMLElement, state: DragState, event: PointerEvent): void {
  if (state.pointerId !== event.pointerId) return;
  if (state.frame !== undefined) {
    cancelFrame(el, state);
    state.pendingEvent = event;
    flushMove(el, state);
  }
  releaseActiveDrag(el, state);
  state.options.onEnd?.(el, state.lastPosition, event);
}

function restoreOwnedStyle(
  target: HTMLElement,
  property: keyof DragState["original"],
  state: DragState,
): void {
  const applied = state.applied[property];
  if (applied !== undefined && target.style[property] === applied) {
    target.style[property] = state.original[property];
  }
}

function bind(el: HTMLElement, value: DragBinding | undefined): void {
  unbind(el);
  const options = parseOptions(value);
  const trigger = resolveTrigger(el, options.handle);
  const original = {
    cursor: trigger.style.cursor,
    position: el.style.position,
    left: el.style.left,
    top: el.style.top,
    touchAction: trigger.style.touchAction,
  };

  const state = {} as DragState;
  state.options = options;
  state.trigger = trigger;
  state.original = original;
  state.applied = {};
  state.startX = 0;
  state.startY = 0;
  state.startLeft = 0;
  state.startTop = 0;
  state.lastPosition = { x: el.offsetLeft, y: el.offsetTop };
  state.pointermove = (event) => {
    if (state.pointerId !== event.pointerId) return;
    event.preventDefault();
    state.pendingEvent = event;
    if (state.frame === undefined) {
      const view = el.ownerDocument.defaultView;
      state.frame = view?.requestAnimationFrame
        ? view.requestAnimationFrame(() => flushMove(el, state))
        : globalThis.requestAnimationFrame(() => flushMove(el, state));
    }
  };
  state.pointerup = (event) => endDrag(el, state, event);
  state.pointerdown = (event) => {
    if (state.options.disabled || state.pointerId !== undefined) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const startRect = el.getBoundingClientRect();
    const boundaryRect = resolveBoundary(
      el,
      state.options.boundary,
    )?.getBoundingClientRect();
    event.preventDefault();
    state.pointerId = event.pointerId;
    state.startX = event.clientX;
    state.startY = event.clientY;
    state.startLeft = el.offsetLeft;
    state.startTop = el.offsetTop;
    state.lastPosition = { x: state.startLeft, y: state.startTop };
    state.startRect = startRect;
    state.boundaryRect = boundaryRect;
    const doc = el.ownerDocument;
    doc.addEventListener("pointermove", state.pointermove, { passive: false });
    doc.addEventListener("pointerup", state.pointerup);
    doc.addEventListener("pointercancel", state.pointerup);
    lockSelection(doc);
    try {
      trigger.setPointerCapture(event.pointerId);
    } catch {
      // Older DOM implementations may not support pointer capture.
    }
    try {
      state.options.onStart?.(el, event);
    } catch (cause) {
      releaseActiveDrag(el, state);
      throw cause;
    }
  };

  states.set(el, state);
  if (!options.disabled) {
    const computedPosition =
      el.ownerDocument.defaultView?.getComputedStyle(el).position;
    if (computedPosition === "static") {
      state.applied.position = el.style.position = "relative";
    }
    state.applied.cursor = trigger.style.cursor = "move";
    state.applied.touchAction = trigger.style.touchAction = "none";
    trigger.addEventListener("pointerdown", state.pointerdown, {
      passive: false,
    });
  }
}

function unbind(el: HTMLElement): void {
  const state = states.get(el);
  if (!state) return;
  state.trigger.removeEventListener("pointerdown", state.pointerdown);
  const doc = el.ownerDocument;
  doc.removeEventListener("pointermove", state.pointermove);
  doc.removeEventListener("pointerup", state.pointerup);
  doc.removeEventListener("pointercancel", state.pointerup);
  cancelFrame(el, state);
  releaseActiveDrag(el, state);
  restoreOwnedStyle(state.trigger, "cursor", state);
  restoreOwnedStyle(state.trigger, "touchAction", state);
  restoreOwnedStyle(el, "position", state);
  restoreOwnedStyle(el, "left", state);
  restoreOwnedStyle(el, "top", state);
  states.delete(el);
}

const dragDirective: Directive<HTMLElement, DragBinding | undefined> = {
  mounted(el, binding) {
    bind(el, binding.value);
  },
  updated(el, binding) {
    const current = states.get(el);
    const next = parseOptions(binding.value);
    if (
      !current ||
      current.options.disabled !== next.disabled ||
      current.options.handle !== next.handle ||
      current.options.boundary !== next.boundary ||
      current.options.axis !== next.axis ||
      current.options.grid[0] !== next.grid[0] ||
      current.options.grid[1] !== next.grid[1]
    ) {
      bind(el, binding.value);
      return;
    }
    current.options = next;
  },
  unmounted: unbind,
};

export default dragDirective;

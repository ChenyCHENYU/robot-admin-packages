import type { Directive } from "vue";
import { assertDelay } from "../internal/event";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

export interface TooltipOptions {
  content: string;
  placement?: TooltipPlacement;
  showDelay?: number;
  hideDelay?: number;
  ellipsis?: boolean;
  disabled?: boolean;
  maxWidth?: number;
  styleNonce?: string;
}

export type TooltipBinding = string | TooltipOptions;

interface NormalizedOptions extends TooltipOptions {
  placement: TooltipPlacement;
  showDelay: number;
  hideDelay: number;
  ellipsis: boolean;
  disabled: boolean;
  maxWidth: number;
}

interface TooltipState {
  options: NormalizedOptions;
  tip?: HTMLElement;
  showTimer?: ReturnType<typeof setTimeout>;
  hideTimer?: ReturnType<typeof setTimeout>;
  removeTimer?: ReturnType<typeof setTimeout>;
  frame?: number;
  originalDescribedBy: string | null;
  pointerenter: () => void;
  pointerleave: () => void;
  focus: () => void;
  blur: () => void;
  keydown: (event: KeyboardEvent) => void;
  reposition: () => void;
}

const states = new WeakMap<HTMLElement, TooltipState>();
const STYLE_ID = "robot-admin-directives-tooltip";
let tooltipId = 0;

function injectStyles(doc: Document, nonce?: string): void {
  const existing = doc.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (existing) {
    if (nonce && !existing.nonce) existing.nonce = nonce;
    return;
  }
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  if (nonce) style.nonce = nonce;
  style.textContent = `
.ra-tooltip{position:fixed;z-index:9999;padding:6px 10px;font-size:12px;line-height:1.5;overflow-wrap:anywhere;color:#fff;background:rgba(0,0,0,.82);border-radius:4px;pointer-events:none;opacity:0;transition:opacity .15s}
.ra-tooltip.is-visible{opacity:1}.ra-tooltip::after{content:'';position:absolute;border:5px solid transparent}
.ra-tooltip[data-placement=top]::after{bottom:-10px;left:50%;transform:translateX(-50%);border-top-color:rgba(0,0,0,.82)}
.ra-tooltip[data-placement=bottom]::after{top:-10px;left:50%;transform:translateX(-50%);border-bottom-color:rgba(0,0,0,.82)}
.ra-tooltip[data-placement=left]::after{right:-10px;top:50%;transform:translateY(-50%);border-left-color:rgba(0,0,0,.82)}
.ra-tooltip[data-placement=right]::after{left:-10px;top:50%;transform:translateY(-50%);border-right-color:rgba(0,0,0,.82)}
@media (prefers-reduced-motion:reduce){.ra-tooltip{transition:none}}
`;
  doc.head.appendChild(style);
}

function parseOptions(
  value: TooltipBinding | undefined,
  modifiers: Partial<Record<string, boolean>>,
): NormalizedOptions {
  const raw = typeof value === "string" ? { content: value } : (value ?? { content: "" });
  let placement = raw.placement ?? "top";
  for (const candidate of ["top", "bottom", "left", "right"] as const) {
    if (modifiers[candidate]) placement = candidate;
  }
  const showDelay = raw.showDelay ?? 200;
  const hideDelay = raw.hideDelay ?? 100;
  assertDelay(showDelay, "showDelay");
  assertDelay(hideDelay, "hideDelay");
  const maxWidth = raw.maxWidth ?? 300;
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) {
    throw new RangeError("maxWidth 必须是大于 0 的有限数值");
  }
  return {
    ...raw,
    placement,
    showDelay,
    hideDelay,
    ellipsis: raw.ellipsis ?? Boolean(modifiers.ellipsis),
    disabled: raw.disabled ?? false,
    maxWidth,
  };
}

function isTextOverflow(el: HTMLElement): boolean {
  return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
}

function calculatePosition(
  el: HTMLElement,
  tip: HTMLElement,
  preferred: TooltipPlacement,
): { top: number; left: number; placement: TooltipPlacement } {
  const rect = el.getBoundingClientRect();
  const tipRect = tip.getBoundingClientRect();
  const view = el.ownerDocument.defaultView;
  const width = view?.innerWidth ?? 0;
  const height = view?.innerHeight ?? 0;
  const gap = 8;
  const fits: Record<TooltipPlacement, boolean> = {
    top: rect.top >= tipRect.height + gap,
    bottom: height - rect.bottom >= tipRect.height + gap,
    left: rect.left >= tipRect.width + gap,
    right: width - rect.right >= tipRect.width + gap,
  };
  const opposite: Record<TooltipPlacement, TooltipPlacement> = {
    top: "bottom",
    bottom: "top",
    left: "right",
    right: "left",
  };
  const placement = fits[preferred] ? preferred : opposite[preferred];
  let top = 0;
  let left = 0;
  if (placement === "top" || placement === "bottom") {
    top = placement === "top" ? rect.top - tipRect.height - gap : rect.bottom + gap;
    left = rect.left + (rect.width - tipRect.width) / 2;
  } else {
    top = rect.top + (rect.height - tipRect.height) / 2;
    left = placement === "left" ? rect.left - tipRect.width - gap : rect.right + gap;
  }
  return {
    top: Math.max(4, Math.min(height - tipRect.height - 4, top)),
    left: Math.max(4, Math.min(width - tipRect.width - 4, left)),
    placement,
  };
}

function position(el: HTMLElement, state: TooltipState): void {
  const tip = state.tip;
  if (!tip) return;
  const result = calculatePosition(el, tip, state.options.placement);
  tip.dataset.placement = result.placement;
  tip.style.top = `${result.top}px`;
  tip.style.left = `${result.left}px`;
}

function detachViewportListeners(el: HTMLElement, state: TooltipState): void {
  const view = el.ownerDocument.defaultView;
  view?.removeEventListener("resize", state.reposition);
  view?.removeEventListener("scroll", state.reposition, true);
}

function hide(el: HTMLElement, state: TooltipState, immediate = false): void {
  if (state.showTimer) clearTimeout(state.showTimer);
  if (state.hideTimer) clearTimeout(state.hideTimer);
  state.showTimer = undefined;
  const run = () => {
    state.hideTimer = undefined;
    const tip = state.tip;
    if (!tip) return;
    tip.classList.remove("is-visible");
    detachViewportListeners(el, state);
    state.removeTimer = setTimeout(() => {
      if (state.tip === tip) {
        tip.remove();
        state.tip = undefined;
        if (state.originalDescribedBy === null) {
          el.removeAttribute("aria-describedby");
        } else {
          el.setAttribute("aria-describedby", state.originalDescribedBy);
        }
      }
      state.removeTimer = undefined;
    }, immediate ? 0 : 160);
  };
  if (immediate) run();
  else state.hideTimer = setTimeout(run, state.options.hideDelay);
}

function show(el: HTMLElement, state: TooltipState): void {
  if (
    state.options.disabled ||
    !state.options.content ||
    (state.options.ellipsis && !isTextOverflow(el))
  ) {
    return;
  }
  if (state.showTimer) clearTimeout(state.showTimer);
  if (state.hideTimer) clearTimeout(state.hideTimer);
  if (state.removeTimer) clearTimeout(state.removeTimer);
  state.hideTimer = undefined;
  state.removeTimer = undefined;
  state.showTimer = setTimeout(() => {
    state.showTimer = undefined;
    injectStyles(el.ownerDocument, state.options.styleNonce);
    const tip = el.ownerDocument.createElement("div");
    tip.id = `ra-tooltip-${++tooltipId}`;
    tip.className = "ra-tooltip";
    tip.dataset.placement = state.options.placement;
    tip.setAttribute("role", "tooltip");
    tip.style.maxWidth = `${state.options.maxWidth}px`;
    tip.textContent = state.options.content;
    state.tip?.remove();
    state.tip = tip;
    el.ownerDocument.body.appendChild(tip);
    const describedBy = [state.originalDescribedBy, tip.id].filter(Boolean).join(" ");
    el.setAttribute("aria-describedby", describedBy);
    state.frame = requestAnimationFrame(() => {
      state.frame = undefined;
      if (state.tip !== tip) return;
      position(el, state);
      tip.classList.add("is-visible");
    });
    const view = el.ownerDocument.defaultView;
    view?.addEventListener("resize", state.reposition);
    view?.addEventListener("scroll", state.reposition, true);
  }, state.options.showDelay);
}

const tooltipDirective: Directive<HTMLElement, TooltipBinding | undefined> = {
  mounted(el, binding) {
    const state = {} as TooltipState;
    state.options = parseOptions(binding.value, binding.modifiers);
    state.originalDescribedBy = el.getAttribute("aria-describedby");
    state.pointerenter = () => show(el, state);
    state.pointerleave = () => hide(el, state);
    state.focus = () => show(el, state);
    state.blur = () => hide(el, state);
    state.keydown = (event) => {
      if (event.key === "Escape") hide(el, state, true);
    };
    state.reposition = () => position(el, state);
    states.set(el, state);
    el.addEventListener("pointerenter", state.pointerenter);
    el.addEventListener("pointerleave", state.pointerleave);
    el.addEventListener("focus", state.focus);
    el.addEventListener("blur", state.blur);
    el.addEventListener("keydown", state.keydown);
  },
  updated(el, binding) {
    const state = states.get(el);
    if (!state) return;
    state.options = parseOptions(binding.value, binding.modifiers);
    if (state.options.disabled || !state.options.content) hide(el, state, true);
    else if (state.tip) {
      state.tip.textContent = state.options.content;
      state.tip.style.maxWidth = `${state.options.maxWidth}px`;
      position(el, state);
    }
  },
  unmounted(el) {
    const state = states.get(el);
    if (!state) return;
    if (state.showTimer) clearTimeout(state.showTimer);
    if (state.hideTimer) clearTimeout(state.hideTimer);
    if (state.removeTimer) clearTimeout(state.removeTimer);
    if (state.frame !== undefined) cancelAnimationFrame(state.frame);
    detachViewportListeners(el, state);
    state.tip?.remove();
    if (state.originalDescribedBy === null) el.removeAttribute("aria-describedby");
    else el.setAttribute("aria-describedby", state.originalDescribedBy);
    el.removeEventListener("pointerenter", state.pointerenter);
    el.removeEventListener("pointerleave", state.pointerleave);
    el.removeEventListener("focus", state.focus);
    el.removeEventListener("blur", state.blur);
    el.removeEventListener("keydown", state.keydown);
    states.delete(el);
  },
};

export default tooltipDirective;

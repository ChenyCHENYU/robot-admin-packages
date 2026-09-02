import type { Directive } from "vue";

export interface LoadingOptions {
  value: boolean;
  text?: string;
  background?: string;
  spinnerColor?: string;
  spinnerSize?: number;
  minDuration?: number;
  fullscreen?: boolean;
  className?: string;
  ariaLabel?: string;
  styleNonce?: string;
}

export type LoadingBinding = boolean | LoadingOptions;

interface LoadingState {
  options: LoadingOptions;
  overlay?: HTMLElement;
  showTime?: number;
  hideTimer?: ReturnType<typeof setTimeout>;
  removeTimer?: ReturnType<typeof setTimeout>;
  frame?: number;
  originalPosition: string;
  originalAriaBusy: string | null;
  changedPosition: boolean;
}

const states = new WeakMap<HTMLElement, LoadingState>();
const STYLE_ID = "robot-admin-directives-loading";

function parseOptions(value: LoadingBinding | undefined): LoadingOptions {
  const options =
    typeof value === "boolean" ? { value } : { value: false, ...(value ?? {}) };
  const minDuration = options.minDuration ?? 0;
  if (!Number.isFinite(minDuration) || minDuration < 0) {
    throw new RangeError("minDuration 必须是大于或等于 0 的有限数值");
  }
  return { ...options, minDuration };
}

export function createSpinnerElement(
  color: string,
  size: number,
  doc: Document = document,
): SVGSVGElement {
  const namespace = "http://www.w3.org/2000/svg";
  const safeSize = Number.isFinite(Number(size))
    ? Math.min(256, Math.max(8, Number(size)))
    : 32;
  const svg = doc.createElementNS(namespace, "svg");
  svg.setAttribute("width", String(safeSize));
  svg.setAttribute("height", String(safeSize));
  svg.setAttribute("viewBox", "0 0 44 44");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "ra-loading-spinner");
  const circle = doc.createElementNS(namespace, "circle");
  circle.setAttribute("cx", "22");
  circle.setAttribute("cy", "22");
  circle.setAttribute("r", "18");
  circle.setAttribute("fill", "none");
  circle.setAttribute("stroke", String(color));
  circle.setAttribute("stroke-width", "4");
  circle.setAttribute("stroke-linecap", "round");
  circle.setAttribute("stroke-dasharray", "90,150");
  circle.setAttribute("class", "ra-loading-circle");
  svg.appendChild(circle);
  return svg;
}

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
@keyframes ra-loading-rotate{to{transform:rotate(360deg)}}
@keyframes ra-loading-dash{0%{stroke-dasharray:1,200;stroke-dashoffset:0}50%{stroke-dasharray:90,150;stroke-dashoffset:-40px}to{stroke-dasharray:90,150;stroke-dashoffset:-120px}}
.ra-loading-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:2000;opacity:0;transition:opacity .2s}
.ra-loading-overlay.is-fullscreen{position:fixed;z-index:9999}
.ra-loading-spinner{animation:ra-loading-rotate .8s linear infinite}
.ra-loading-circle{animation:ra-loading-dash 1.5s ease-in-out infinite}
.ra-loading-text{font-size:14px;color:inherit}
@media (prefers-reduced-motion:reduce){.ra-loading-overlay{transition:none}.ra-loading-spinner,.ra-loading-circle{animation:none}}
`;
  doc.head.appendChild(style);
}

function createOverlay(options: LoadingOptions, doc: Document): HTMLElement {
  const overlay = doc.createElement("div");
  overlay.className = `ra-loading-overlay${options.fullscreen ? " is-fullscreen" : ""}${options.className ? ` ${options.className}` : ""}`;
  overlay.setAttribute("role", "status");
  overlay.setAttribute("aria-live", "polite");
  overlay.setAttribute("aria-label", options.ariaLabel ?? options.text ?? "加载中");
  overlay.style.background = options.background ?? "rgba(255, 255, 255, 0.7)";
  overlay.style.color = options.spinnerColor ?? "#409eff";
  overlay.appendChild(
    createSpinnerElement(
      options.spinnerColor ?? "#409eff",
      options.spinnerSize ?? 32,
      doc,
    ),
  );
  if (options.text) {
    const text = doc.createElement("span");
    text.className = "ra-loading-text";
    text.textContent = options.text;
    overlay.appendChild(text);
  }
  return overlay;
}

function clearAsync(state: LoadingState): void {
  if (state.hideTimer) clearTimeout(state.hideTimer);
  if (state.removeTimer) clearTimeout(state.removeTimer);
  if (state.frame !== undefined) cancelAnimationFrame(state.frame);
  state.hideTimer = undefined;
  state.removeTimer = undefined;
  state.frame = undefined;
}

function restoreHost(el: HTMLElement, state: LoadingState): void {
  if (state.changedPosition) el.style.position = state.originalPosition;
  state.changedPosition = false;
  if (state.originalAriaBusy === null) el.removeAttribute("aria-busy");
  else el.setAttribute("aria-busy", state.originalAriaBusy);
}

function mountOverlay(el: HTMLElement, state: LoadingState): void {
  clearAsync(state);
  state.overlay?.remove();
  injectStyles(el.ownerDocument, state.options.styleNonce);
  if (!state.options.fullscreen) {
    const position = getComputedStyle(el).position;
    if (!position || position === "static") {
      el.style.position = "relative";
      state.changedPosition = true;
    }
  }
  const overlay = createOverlay(state.options, el.ownerDocument);
  (state.options.fullscreen ? el.ownerDocument.body : el).appendChild(overlay);
  state.overlay = overlay;
  state.showTime = Date.now();
  el.setAttribute("aria-busy", "true");
  state.frame = requestAnimationFrame(() => {
    state.frame = undefined;
    if (state.overlay === overlay) overlay.style.opacity = "1";
  });
}

function hide(el: HTMLElement, state: LoadingState, immediate = false): void {
  if (!state.overlay) {
    restoreHost(el, state);
    return;
  }
  if (state.hideTimer) clearTimeout(state.hideTimer);
  const elapsed = Date.now() - (state.showTime ?? 0);
  const remaining = immediate
    ? 0
    : Math.max(0, (state.options.minDuration ?? 0) - elapsed);
  const run = () => {
    state.hideTimer = undefined;
    const overlay = state.overlay;
    if (!overlay) return;
    overlay.style.opacity = "0";
    state.removeTimer = setTimeout(() => {
      if (state.overlay === overlay) {
        overlay.remove();
        state.overlay = undefined;
        state.showTime = undefined;
        restoreHost(el, state);
      }
      state.removeTimer = undefined;
    }, 220);
  };
  if (remaining > 0) state.hideTimer = setTimeout(run, remaining);
  else run();
}

const loadingDirective: Directive<HTMLElement, LoadingBinding | undefined> = {
  mounted(el, binding) {
    const state: LoadingState = {
      options: parseOptions(binding.value),
      originalPosition: el.style.position,
      originalAriaBusy: el.getAttribute("aria-busy"),
      changedPosition: false,
    };
    states.set(el, state);
    if (state.options.value) mountOverlay(el, state);
  },
  updated(el, binding) {
    const state = states.get(el);
    if (!state) return;
    const previous = state.options;
    state.options = parseOptions(binding.value);
    if (!state.options.value) {
      hide(el, state);
      return;
    }
    const visualChanged =
      !previous.value ||
      previous.text !== state.options.text ||
      previous.background !== state.options.background ||
      previous.spinnerColor !== state.options.spinnerColor ||
      previous.spinnerSize !== state.options.spinnerSize ||
      previous.fullscreen !== state.options.fullscreen ||
      previous.className !== state.options.className ||
      previous.ariaLabel !== state.options.ariaLabel ||
      previous.styleNonce !== state.options.styleNonce;
    if (visualChanged || state.hideTimer || state.removeTimer) mountOverlay(el, state);
  },
  unmounted(el) {
    const state = states.get(el);
    if (!state) return;
    clearAsync(state);
    state.overlay?.remove();
    restoreHost(el, state);
    states.delete(el);
  },
};

export default loadingDirective;

import type { Directive } from "vue";

export interface WatermarkOptions {
  text?: string | readonly string[];
  textColor?: string;
  /** @deprecated Use fontFamily. */
  font?: string;
  fontFamily?: string;
  fontSize?: number;
  textXGap?: number;
  textYGap?: number;
  gap?: readonly [number, number];
  rotate?: number;
  opacity?: number;
  zIndex?: number;
  preventDelete?: boolean;
  onUpdate?: (el: HTMLElement) => void;
  onError?: (error: Error) => void;
}

export type WatermarkBinding = string | readonly string[] | WatermarkOptions;

interface NormalizedOptions extends WatermarkOptions {
  text: readonly string[];
  textColor: string;
  fontFamily: string;
  fontSize: number;
  textXGap: number;
  textYGap: number;
  rotate: number;
  opacity: number;
  zIndex: number;
  preventDelete: boolean;
}

interface WatermarkState {
  options: NormalizedOptions;
  overlay?: HTMLElement;
  observer?: MutationObserver;
  originalPosition: string;
  changedPosition: boolean;
}

const states = new WeakMap<HTMLElement, WatermarkState>();
const watermarkCache = new Map<string, string>();
const MAX_CACHE_ENTRIES = 100;

function positive(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} 必须是大于 0 的有限数值`);
  }
  return value;
}

function parseOptions(value: WatermarkBinding | undefined): NormalizedOptions {
  let raw: WatermarkOptions;
  if (typeof value === "string") raw = { text: value };
  else if (Array.isArray(value)) raw = { text: [...value] };
  else raw = (value ?? {}) as WatermarkOptions;
  const gap = raw.gap;
  const opacity = raw.opacity ?? 1;
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new RangeError("opacity 必须位于 0 到 1 之间");
  }
  return {
    ...raw,
    text: Array.isArray(raw.text)
      ? raw.text.map(String)
      : [String(raw.text ?? "Robot Admin")],
    textColor: raw.textColor ?? "rgba(120, 120, 120, 0.4)",
    fontFamily: raw.fontFamily ?? raw.font ?? "sans-serif",
    fontSize: positive(raw.fontSize ?? 16, "fontSize"),
    textXGap: positive(gap?.[0] ?? raw.textXGap ?? 160, "textXGap"),
    textYGap: positive(gap?.[1] ?? raw.textYGap ?? 80, "textYGap"),
    rotate: Number.isFinite(raw.rotate) ? (raw.rotate as number) : -20,
    opacity,
    zIndex: Number.isFinite(raw.zIndex) ? (raw.zIndex as number) : 1000,
    preventDelete: raw.preventDelete ?? false,
  };
}

function visualKey(options: NormalizedOptions): string {
  return JSON.stringify({
    text: options.text,
    textColor: options.textColor,
    fontFamily: options.fontFamily,
    fontSize: options.fontSize,
    textXGap: options.textXGap,
    textYGap: options.textYGap,
    rotate: options.rotate,
    opacity: options.opacity,
  });
}

function cacheSet(key: string, value: string): void {
  if (watermarkCache.has(key)) watermarkCache.delete(key);
  watermarkCache.set(key, value);
  if (watermarkCache.size > MAX_CACHE_ENTRIES) {
    const oldest = watermarkCache.keys().next().value;
    if (oldest) watermarkCache.delete(oldest);
  }
}

function createImage(options: NormalizedOptions, doc: Document): string {
  const key = visualKey(options);
  const cached = watermarkCache.get(key);
  if (cached) {
    watermarkCache.delete(key);
    watermarkCache.set(key, cached);
    return cached;
  }
  const canvas = doc.createElement("canvas");
  canvas.width = Math.ceil(options.textXGap);
  canvas.height = Math.ceil(options.textYGap);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前环境不支持 Canvas 2D 上下文");
  context.globalAlpha = options.opacity;
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((options.rotate * Math.PI) / 180);
  context.font = `${options.fontSize}px ${options.fontFamily}`;
  context.fillStyle = options.textColor;
  context.textAlign = "center";
  context.textBaseline = "middle";
  const lineHeight = options.fontSize * 1.4;
  const offset = ((options.text.length - 1) * lineHeight) / 2;
  options.text.forEach((line, index) => {
    context.fillText(line, 0, index * lineHeight - offset);
  });
  const image = canvas.toDataURL("image/png");
  cacheSet(key, image);
  return image;
}

function observe(el: HTMLElement, state: WatermarkState): void {
  state.observer?.disconnect();
  if (!state.options.preventDelete || !state.overlay) return;
  const Observer = el.ownerDocument.defaultView?.MutationObserver;
  if (!Observer) return;
  state.observer = new Observer((mutations) => {
    const overlay = state.overlay;
    if (!overlay) return;
    const tampered = mutations.some((mutation) => {
      if (mutation.type === "attributes") return mutation.target === overlay;
      return [...mutation.removedNodes].some(
        (node) => node === overlay || (node instanceof Element && node.contains(overlay)),
      );
    });
    if (tampered) render(el, state);
  });
  state.observer.observe(el, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style"],
  });
}

function render(el: HTMLElement, state: WatermarkState): void {
  try {
    state.observer?.disconnect();
    state.overlay?.remove();
    if (getComputedStyle(el).position === "static") {
      el.style.position = "relative";
      state.changedPosition = true;
    }
    const overlay = el.ownerDocument.createElement("div");
    overlay.className = "ra-watermark";
    Object.assign(overlay.style, {
      position: "absolute",
      inset: "0",
      pointerEvents: "none",
      backgroundImage: `url(${JSON.stringify(createImage(state.options, el.ownerDocument))})`,
      backgroundRepeat: "repeat",
      zIndex: String(state.options.zIndex),
      userSelect: "none",
    });
    overlay.setAttribute("aria-hidden", "true");
    el.appendChild(overlay);
    state.overlay = overlay;
    observe(el, state);
    state.options.onUpdate?.(el);
  } catch (cause) {
    const error = cause instanceof Error ? cause : new Error(String(cause));
    if (state.options.onError) state.options.onError(error);
    else throw error;
  }
}

const watermarkDirective: Directive<
  HTMLElement,
  WatermarkBinding | undefined
> = {
  mounted(el, binding) {
    const state: WatermarkState = {
      options: parseOptions(binding.value),
      originalPosition: el.style.position,
      changedPosition: false,
    };
    states.set(el, state);
    render(el, state);
  },
  updated(el, binding) {
    const state = states.get(el);
    if (!state) return;
    const previous = state.options;
    const next = parseOptions(binding.value);
    state.options = next;
    if (
      visualKey(previous) !== visualKey(next) ||
      previous.zIndex !== next.zIndex ||
      previous.preventDelete !== next.preventDelete
    ) {
      render(el, state);
    }
  },
  unmounted(el) {
    const state = states.get(el);
    if (!state) return;
    state.observer?.disconnect();
    state.overlay?.remove();
    if (state.changedPosition && el.style.position === "relative") {
      el.style.position = state.originalPosition;
    }
    states.delete(el);
  },
};

export function clearWatermarkCache(): void {
  watermarkCache.clear();
}

export default watermarkDirective;

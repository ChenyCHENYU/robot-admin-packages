import type { Directive } from "vue";

export interface LazyOptions {
  src: string;
  loading?: string;
  error?: string;
  rootMargin?: string;
  threshold?: number | readonly number[];
  root?: Element | Document | null;
  crossOrigin?: "anonymous" | "use-credentials";
  referrerPolicy?: ReferrerPolicy;
  onLoad?: (src: string) => void;
  onError?: (error: Error, src: string) => void;
}

export type LazyBinding = string | LazyOptions;

interface NormalizedOptions extends LazyOptions {
  loading: string;
  error: string;
  rootMargin: string;
  threshold: number | readonly number[];
  root: Element | Document | null;
}

interface LazyState {
  options: NormalizedOptions;
  mode: "img" | "background";
  observer?: IntersectionObserver;
  loader?: HTMLImageElement;
  generation: number;
}

const states = new WeakMap<HTMLElement, LazyState>();
const PLACEHOLDER =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';

function parseOptions(value: LazyBinding | undefined): NormalizedOptions {
  const raw = typeof value === "string" ? { src: value } : (value ?? { src: "" });
  const threshold = raw.threshold ?? 0;
  const values = Array.isArray(threshold) ? threshold : [threshold];
  if (values.some((item) => !Number.isFinite(item) || item < 0 || item > 1)) {
    throw new RangeError("threshold 必须位于 0 到 1 之间");
  }
  return {
    ...raw,
    loading: raw.loading ?? PLACEHOLDER,
    error: raw.error ?? PLACEHOLDER,
    rootMargin: raw.rootMargin ?? "200px 0px",
    threshold,
    root: raw.root ?? null,
  };
}

function setSource(el: HTMLElement, state: LazyState, src: string): void {
  if (state.mode === "background") {
    el.style.backgroundImage = `url(${JSON.stringify(src)})`;
  } else {
    (el as HTMLImageElement).src = src;
  }
}

function stop(state: LazyState): void {
  state.observer?.disconnect();
  state.observer = undefined;
  if (state.loader) {
    state.loader.onload = null;
    state.loader.onerror = null;
    state.loader.src = "";
    state.loader = undefined;
  }
}

function load(el: HTMLElement, state: LazyState): void {
  const { src } = state.options;
  if (!src) return;
  const generation = ++state.generation;
  const ImageConstructor = el.ownerDocument.defaultView?.Image;
  if (!ImageConstructor) {
    const error = new Error("当前环境不支持图片加载");
    if (state.options.error) setSource(el, state, state.options.error);
    el.classList.remove("ra-lazy-loading", "ra-lazy-loaded");
    el.classList.add("ra-lazy-error");
    state.options.onError?.(error, src);
    return;
  }
  const image = new ImageConstructor();
  state.loader = image;
  if (state.options.crossOrigin) image.crossOrigin = state.options.crossOrigin;
  if (state.options.referrerPolicy) {
    image.referrerPolicy = state.options.referrerPolicy;
  }
  image.onload = () => {
    if (generation !== state.generation || states.get(el) !== state) return;
    setSource(el, state, src);
    el.classList.remove("ra-lazy-loading", "ra-lazy-error");
    el.classList.add("ra-lazy-loaded");
    state.loader = undefined;
    state.options.onLoad?.(src);
  };
  image.onerror = () => {
    if (generation !== state.generation || states.get(el) !== state) return;
    if (state.options.error) setSource(el, state, state.options.error);
    el.classList.remove("ra-lazy-loading", "ra-lazy-loaded");
    el.classList.add("ra-lazy-error");
    state.loader = undefined;
    state.options.onError?.(new Error(`图片加载失败: ${src}`), src);
  };
  image.src = src;
}

function observe(el: HTMLElement, state: LazyState): void {
  stop(state);
  state.generation += 1;
  el.classList.remove("ra-lazy-loaded", "ra-lazy-error");
  el.classList.add("ra-lazy-loading");
  if (state.options.loading) setSource(el, state, state.options.loading);

  if (typeof IntersectionObserver === "undefined") {
    load(el, state);
    return;
  }
  state.observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        state.observer?.disconnect();
        state.observer = undefined;
        load(el, state);
      }
    },
    {
      root: state.options.root,
      rootMargin: state.options.rootMargin,
      threshold: state.options.threshold as number | number[],
    },
  );
  state.observer.observe(el);
}

const lazyDirective: Directive<HTMLElement, LazyBinding | undefined> = {
  mounted(el, binding) {
    const state: LazyState = {
      options: parseOptions(binding.value),
      mode: binding.arg === "background" ? "background" : "img",
      generation: 0,
    };
    states.set(el, state);
    observe(el, state);
  },
  updated(el, binding) {
    const state = states.get(el);
    if (!state) return;
    const next = parseOptions(binding.value);
    const nextMode = binding.arg === "background" ? "background" : "img";
    const changed =
      state.options.src !== next.src ||
      state.options.loading !== next.loading ||
      state.options.error !== next.error ||
      state.options.root !== next.root ||
      state.options.rootMargin !== next.rootMargin ||
      JSON.stringify(state.options.threshold) !== JSON.stringify(next.threshold) ||
      state.options.crossOrigin !== next.crossOrigin ||
      state.options.referrerPolicy !== next.referrerPolicy ||
      state.mode !== nextMode;
    state.options = next;
    state.mode = nextMode;
    if (changed) observe(el, state);
  },
  unmounted(el) {
    const state = states.get(el);
    if (!state) return;
    state.generation += 1;
    stop(state);
    states.delete(el);
  },
};

export default lazyDirective;

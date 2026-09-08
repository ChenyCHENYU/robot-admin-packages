/**
 * View Transition API 工具函数
 */

export interface ViewTransitionOptions {
  /** 过渡中添加的 CSS 类名 */
  transitioningClass?: string;
}

const DEFAULT_TRANSITIONING_CLASS = "theme-transitioning";
const activeTransitionClasses = new WeakMap<
  HTMLElement,
  Map<string, number>
>();

/**
 * 检查用户是否开启了“减少动态效果”偏好（无障碍）。
 * 开启后应跳过动画，直接更新 DOM。
 */
function prefersReducedMotion(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }

  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** 为并发过渡安全地增加根元素标记类。 */
function retainTransitionClass(root: HTMLElement, className: string): void {
  const classCounts = activeTransitionClasses.get(root) ?? new Map();
  const count = classCounts.get(className) ?? 0;
  if (count === 0) root.classList.add(className);
  classCounts.set(className, count + 1);
  activeTransitionClasses.set(root, classCounts);
}

/** 仅在最后一个并发过渡完成后移除根元素标记类。 */
function releaseTransitionClass(root: HTMLElement, className: string): void {
  const classCounts = activeTransitionClasses.get(root);
  const count = classCounts?.get(className) ?? 0;
  if (count <= 1) {
    classCounts?.delete(className);
    root.classList.remove(className);
    if (classCounts?.size === 0) activeTransitionClasses.delete(root);
    return;
  }
  classCounts?.set(className, count - 1);
}

/**
 * 使用 View Transition API 执行主题切换
 * @param callback - 执行 DOM 更新的回调函数（支持异步）
 * @param options - 配置选项
 */
export async function useViewTransition(
  callback: () => void | Promise<void>,
  options: ViewTransitionOptions = {},
): Promise<void> {
  const transitioningClass =
    options.transitioningClass?.trim() || DEFAULT_TRANSITIONING_CLASS;

  // SSR 环境或 API 不支持：直接执行回调
  if (
    typeof document === "undefined" ||
    typeof document.startViewTransition !== "function"
  ) {
    await callback();
    return;
  }

  // 无障碍：尊重“减少动态效果”，不触发过渡
  if (prefersReducedMotion()) {
    await callback();
    return;
  }

  const root = document.documentElement;

  // 添加标记类，用于禁用所有 CSS transitions（防止冲突）
  retainTransitionClass(root, transitioningClass);

  let callbackStarted = false;
  let callbackPromise: Promise<void> | undefined;
  const guardedCallback = () => {
    if (callbackPromise) return callbackPromise;
    callbackStarted = true;
    callbackPromise = Promise.resolve().then(callback);
    return callbackPromise;
  };

  try {
    const transition = document.startViewTransition(guardedCallback);

    // 等待过渡完成
    await transition.finished;
  } catch (error) {
    // 浏览器过渡属于渐进增强：无论 API 如何失败，都必须完成且只完成一次 DOM 更新。
    // 如果业务 callback 自身失败，await 会继续将原始错误传播给调用方。
    if (!callbackStarted) await guardedCallback();
    else await callbackPromise;
  } finally {
    releaseTransitionClass(root, transitioningClass);
  }
}

/**
 * 检查浏览器是否支持 View Transition API
 */
export function isViewTransitionSupported(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof document.startViewTransition === "function"
  );
}

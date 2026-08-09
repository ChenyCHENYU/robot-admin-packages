/**
 * View Transition API 工具函数
 */

export interface ViewTransitionOptions {
  /** 过渡中添加的 CSS 类名 */
  transitioningClass?: string;
}

/**
 * 检查用户是否开启了“减少动态效果”偏好（无障碍）。
 * 开启后应跳过动画，直接更新 DOM。
 */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
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
  const { transitioningClass = "theme-transitioning" } = options;

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
  root.classList.add(transitioningClass);

  let callbackStarted = false;
  let callbackFailed = false;
  let callbackError: unknown;
  const guardedCallback = async () => {
    callbackStarted = true;
    try {
      await callback();
    } catch (error) {
      callbackFailed = true;
      callbackError = error;
      throw error;
    }
  };

  try {
    const transition = document.startViewTransition(guardedCallback);

    // 等待过渡完成
    await transition.finished;
  } catch (error) {
    // callback 失败属于业务错误，必须原样传播给调用方
    if (callbackFailed) throw callbackError;

    // 区分浏览器主动跳过/中断过渡与真实 API 错误
    const isAbort =
      typeof DOMException !== "undefined" &&
      error instanceof DOMException &&
      (error.name === "AbortError" ||
        error.name === "InvalidStateError" ||
        error.name === "NotAllowedError");
    if (isAbort) {
      // startViewTransition 在执行 callback 前失败时，仍需保证 DOM 更新完成
      if (!callbackStarted) await callback();
      return;
    }
    throw error;
  } finally {
    // 移除标记类
    root.classList.remove(transitioningClass);
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

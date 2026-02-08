/**
 * View Transition API 工具函数
 */

export interface ViewTransitionOptions {
  /** 过渡动画时长（毫秒） */
  duration?: number;
  /** 过渡中添加的 CSS 类名 */
  transitioningClass?: string;
}

/**
 * 使用 View Transition API 执行主题切换
 * @param callback - 执行 DOM 更新的回调函数
 * @param options - 配置选项
 */
export async function useViewTransition(
  callback: () => void,
  options: ViewTransitionOptions = {},
): Promise<void> {
  const { transitioningClass = "theme-transitioning" } = options;

  // 检查浏览器是否支持 View Transition API
  if (!document.startViewTransition) {
    // 不支持则直接执行回调
    callback();
    return;
  }

  const root = document.documentElement;

  // 添加标记类，用于禁用所有 CSS transitions（防止冲突）
  root.classList.add(transitioningClass);

  try {
    const transition = document.startViewTransition(callback);

    // 等待过渡完成
    await transition.finished;
  } catch (error) {
    // 忽略用户中断过渡的错误
    console.debug("[ViewTransition] Transition interrupted:", error);
  } finally {
    // 移除标记类
    root.classList.remove(transitioningClass);
  }
}

/**
 * 检查浏览器是否支持 View Transition API
 */
export function isViewTransitionSupported(): boolean {
  return typeof document !== "undefined" && "startViewTransition" in document;
}

/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-06-25 17:45:29
 * @LastEditors: ChenYu ycyplus@gmail.com
 * @LastEditTime: 2025-06-25 18:59:11
 * @FilePath: \Robot_Admin\src\directives\modules\watermark.ts
 * @Description: 水印指令
 * Copyright (c) 2025 by CHENY, All Rights Reserved 😎.
 */

import type { Directive, DirectiveBinding } from 'vue'

// 类型定义
export interface WatermarkOptions {
  text?: string
  textColor?: string
  font?: string
  fontSize?: number
  textXGap?: number
  textYGap?: number
  rotate?: number
  opacity?: number
  zIndex?: number
  preventDelete?: boolean
  onUpdate?: (el: HTMLElement) => void
  onError?: (error: Error) => void
}

export interface WatermarkBinding extends Omit<DirectiveBinding, 'value'> {
  value?: string | WatermarkOptions
}

// 扩展 HTMLElement 类型定义
declare global {
  interface HTMLElement {
    _watermarkResizeObserver?: ResizeObserver
    _watermarkMutationObserver?: MutationObserver
    _watermarkOptions?: Required<WatermarkOptions>
  }
}

// 缓存生成的水印图片
const watermarkCache = new Map<string, string>()

/**
 * * @description 生成缓存键
 * ? @param options - 水印配置选项
 * ! @return 缓存键字符串
 */
function getCacheKey(options: Required<WatermarkOptions>): string {
  const {
    text,
    textColor,
    font,
    fontSize,
    textXGap,
    textYGap,
    rotate,
    opacity,
  } = options
  return `${text}-${textColor}-${font}-${fontSize}-${textXGap}-${textYGap}-${rotate}-${opacity}`
}

/**
 * * @description 解析指令参数配置
 * ? @param value - 指令绑定的值，可以是字符串、配置对象或 undefined
 * ! @return 解析后的配置对象
 */
function parseOptions(
  value: string | WatermarkOptions | undefined
): Required<WatermarkOptions> {
  // 默认配置
  const defaultOptions: Required<WatermarkOptions> = {
    text: 'Robot Admin',
    textColor: 'rgba(120, 120, 120, 0.4)',
    font: 'Microsoft JhengHei',
    fontSize: 16,
    textXGap: 160,
    textYGap: 80,
    rotate: -20,
    opacity: 1,
    zIndex: 1000,
    preventDelete: true,
    onUpdate: () => {},
    onError: () => {},
  }

  // 如果没有传参数，返回默认配置
  if (!value) {
    return defaultOptions
  }

  // 如果是字符串，只设置文本内容
  if (typeof value === 'string') {
    return {
      ...defaultOptions,
      text: value,
    }
  }

  // 如果是对象配置，合并默认配置
  return {
    ...defaultOptions,
    ...value,
  }
}

/**
 * * @description 生成水印base64图片
 * ? @param options - 水印配置选项
 * ! @return base64图片字符串
 */
function createWatermarkImage(options: Required<WatermarkOptions>): string {
  const cacheKey = getCacheKey(options)

  // 检查缓存
  if (watermarkCache.has(cacheKey)) {
    return watermarkCache.get(cacheKey)!
  }

  try {
    const canvas = document.createElement('canvas')
    const {
      textXGap,
      textYGap,
      fontSize,
      font,
      textColor,
      rotate,
      opacity,
      text,
    } = options

    canvas.width = textXGap
    canvas.height = textYGap

    const ctx = canvas.getContext('2d')!

    // 设置透明度
    ctx.globalAlpha = opacity

    // 保存当前状态
    ctx.save()

    // 移动到中心点
    ctx.translate(textXGap / 2, textYGap / 2)

    // 旋转
    ctx.rotate((rotate * Math.PI) / 180)

    // 设置字体
    ctx.font = `${fontSize}px ${font}`
    ctx.fillStyle = textColor
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // 绘制文字
    ctx.fillText(text, 0, 0)

    // 恢复状态
    ctx.restore()

    const base64 = canvas.toDataURL('image/png')

    // 缓存结果
    watermarkCache.set(cacheKey, base64)

    return base64
  } catch (error) {
    console.error('生成水印图片失败:', error)
    return ''
  }
}

/**
 * * @description 创建水印元素
 * ? @param el - 目标元素
 * ? @param options - 水印配置选项
 * ! @return 水印元素
 */
function createWatermarkElement(
  el: HTMLElement,
  options: Required<WatermarkOptions>
): HTMLElement {
  const watermarkEl = document.createElement('div')
  const base64 = createWatermarkImage(options)

  if (!base64) {
    options.onError(new Error('生成水印图片失败'))
    return watermarkEl
  }

  watermarkEl.className = 'vue-watermark'
  watermarkEl.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    background-image: url(${base64});
    background-repeat: repeat;
    z-index: ${options.zIndex};
    user-select: none;
  `

  // 防删除保护
  if (options.preventDelete) {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          const removedNodes = Array.from(mutation.removedNodes)
          if (removedNodes.includes(watermarkEl)) {
            console.warn('水印被删除，正在恢复...')
            if (el.contains(watermarkEl) === false) {
              el.appendChild(watermarkEl)
            }
          }
        }
      })
    })

    observer.observe(el, {
      childList: true,
      subtree: true,
    })

    // 保存observer到元素上
    el._watermarkMutationObserver = observer
  }

  return watermarkEl
}

/**
 * * @description 更新水印
 * ? @param el - 目标元素
 * ? @param options - 水印配置选项
 * ! @return void
 */
function updateWatermark(
  el: HTMLElement,
  options: Required<WatermarkOptions>
): void {
  try {
    // 确保父元素是相对定位
    const computedStyle = getComputedStyle(el)
    if (computedStyle.position === 'static') {
      el.style.position = 'relative'
    }

    // 移除旧的水印
    const oldWatermark = el.querySelector('.vue-watermark') as HTMLElement
    if (oldWatermark) {
      oldWatermark.remove()
    }

    // 清理旧的 MutationObserver
    if (el._watermarkMutationObserver) {
      el._watermarkMutationObserver.disconnect()
      delete el._watermarkMutationObserver
    }

    // 创建新的水印
    const watermarkEl = createWatermarkElement(el, options)
    el.appendChild(watermarkEl)

    // 触发更新回调
    options.onUpdate(el)
  } catch (error) {
    options.onError(error as Error)
  }
}

/**
 * * @description 清理水印相关资源
 * ? @param el - 目标元素
 * ! @return void
 */
function cleanupWatermark(el: HTMLElement): void {
  // 清理ResizeObserver
  if (el._watermarkResizeObserver) {
    el._watermarkResizeObserver.disconnect()
    delete el._watermarkResizeObserver
  }

  // 清理MutationObserver
  if (el._watermarkMutationObserver) {
    el._watermarkMutationObserver.disconnect()
    delete el._watermarkMutationObserver
  }

  // 移除水印元素
  const watermarkEl = el.querySelector('.vue-watermark')
  if (watermarkEl) {
    watermarkEl.remove()
  }

  // 清理缓存的选项
  delete el._watermarkOptions
}

// 指令实现
const watermarkDirective: Directive<
  HTMLElement,
  string | WatermarkOptions | undefined
> = {
  /**
   * * @description 指令挂载时的钩子函数
   * ? @param el - 绑定指令的 HTML 元素
   * ? @param binding - 指令绑定对象
   * ! @return void
   */
  mounted(el: HTMLElement, binding: WatermarkBinding): void {
    const options = parseOptions(binding.value)

    // 初始化水印
    updateWatermark(el, options)

    // 使用ResizeObserver监听尺寸变化（读取最新的 options，避免闭包过期）
    const resizeObserver = new ResizeObserver(() => {
      updateWatermark(el, el._watermarkOptions || options)
    })

    resizeObserver.observe(el)

    // 保存到元素上
    el._watermarkResizeObserver = resizeObserver
    el._watermarkOptions = options
  },

  /**
   * * @description 指令更新时的钩子函数
   * ? @param el - 绑定指令的 HTML 元素
   * ? @param binding - 指令绑定对象
   * ! @return void
   */
  updated(el: HTMLElement, binding: WatermarkBinding): void {
    const newOptions = parseOptions(binding.value)
    const oldOptions = el._watermarkOptions

    // 只有当选项真正改变时才更新
    if (
      !oldOptions ||
      JSON.stringify(newOptions) !== JSON.stringify(oldOptions)
    ) {
      updateWatermark(el, newOptions)
      el._watermarkOptions = newOptions
    }
  },

  /**
   * * @description 指令卸载时的钩子函数
   * ? @param el - 绑定指令的 HTML 元素
   * ! @return void
   */
  unmounted(el: HTMLElement): void {
    cleanupWatermark(el)
  },
}

/**
 * * @description: 清理缓存 工具函数
 */
export function clearWatermarkCache(): void {
  watermarkCache.clear()
}

// 默认导出
export default watermarkDirective

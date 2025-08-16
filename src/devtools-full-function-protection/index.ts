// ==UserScript==
// @name         DevTools 全功能防护 (TS 版本)
// @namespace    https://github.com/ryanuo/userscripts
// @version      2.0
// @description  一站式解除网页的防调试、重定向、右键屏蔽，同时屏蔽 disable-devtool / devtools-detector，让 DevTools 自由使用。
// @author       you
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

declare global {
  interface Window {
    devtoolsDetector?: any
  }
}

(function () {
  'use strict'

  /********************
   * 0. 补丁：绕过 disable-devtool / devtools-detector
   ********************/
  if (!(document instanceof XMLDocument)) {
    const slice = Array.prototype.slice
    Array.prototype.slice = function (this: any[], ...args: [number?, number?]): any[] {
      if (
        args.length === 0
        && Array.prototype.every.call(
          this,
          (v: any) =>
            v
            && typeof v === 'object'
            && typeof v.name === 'string'
            && typeof v.isOpen === 'function'
            && typeof v.isEnable === 'function',
        )
      ) {
        Array.prototype.slice = slice
        return []
      }
      return slice.apply(this, args)
    }

    const assign = Object.assign

    Object.assign = function (...args: [object, object]): any {
      if (
        args.length === 2
        && typeof args[0] === 'function'
        && typeof args[1] === 'object'
        && args[1] !== null
        && typeof (args[1] as any).isDevToolOpened === 'function'
        && typeof (args[1] as any).version === 'string'
        && typeof (args[1] as any).isRunning === 'boolean'
        && typeof (args[1] as any).isSuspend === 'boolean'
      ) {
        Object.assign = assign
        const result = Object.assign(...args)
        console.log('[补丁] 检测到 disable-devtool 组件 → 已拦截:', result)
        return Object.assign(
          function () {
            console.trace('disable-devtool 被调用')
          } as unknown as typeof args[0],
          args[1],
        )
      }
      return assign.call(this, ...args)
    }
  }

  /********************
   * 1. 阻止重定向
   ********************/
  const blockRedirect = (obj: any, prop: string) => {
    try {
      Object.defineProperty(obj, prop, {
        configurable: true,
        get: () => window.location,
        set: v => console.warn(`[拦截] ${prop} 修改 ->`, v),
      })
    }
    catch {}
  }
  blockRedirect(window, 'location')
  blockRedirect(window.top, 'location');

  (['assign', 'replace', 'reload'] as const).forEach((fn) => {
    try {
      (window.location as any)[fn] = (url?: string) =>
        console.warn(`[拦截] location.${fn}(${url})`);
      (window.top?.location as any)[fn] = (url?: string) =>
        console.warn(`[拦截] top.location.${fn}(${url})`)
    }
    catch {}
  })

  /********************
   * 2. 阻止键盘封锁
   ********************/
  window.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.shiftKey && ['I', 'C', 'J'].includes(e.key.toUpperCase()))
      ) {
        e.stopImmediatePropagation()
      }

      // 阻止 F12 键
      if (e.keyCode === 123) {
        e.preventDefault()
        e.stopImmediatePropagation()
        console.warn('[拦截] F12 键被按下')
      }
    },
    true,
  )

  /********************
   * 3. 允许右键菜单
   ********************/
  window.addEventListener(
    'contextmenu',
    (e: MouseEvent) => e.stopImmediatePropagation(),
    true,
  )

  /********************
   * 4. 防止 debugger 死循环
   ********************/
  const _debugger = Function.prototype.constructor
  Function.prototype.constructor = (function (str: string) {
    if (str.includes('debugger')) {
      console.warn('[拦截] debugger 注入')
      return function () {}
    }
    return _debugger(str)
  }) as any

  /********************
   * 5. 清理 setInterval 检测
   ********************/
  const _setInterval = window.setInterval
  window.setInterval = function (
    fn: TimerHandler,
    delay?: number,
    ...args: any[]
  ) {
    if (fn && fn.toString().match(/debugger|devtools|console/)) {
      console.warn('[拦截] 可疑 setInterval ->', fn.toString().slice(0, 50))
      return 0
    }
    return _setInterval(fn, delay, ...args) as any
  }

  /********************
   * 6. 移除 beforeunload 限制
   ********************/
  Object.defineProperty(window, 'onbeforeunload', {
    set: () => console.warn('[拦截] onbeforeunload 设置'),
    get: () => null,
  })

  /********************
   * 7. 常见 DevTools 检测兼容
   ********************/
  const devtoolsDetector = /./
  devtoolsDetector.toString = () => ''
  window.devtoolsDetector = devtoolsDetector

  console.log('%c[DevTools 全功能防护已启用]', 'color: green; font-weight: bold;')
})()

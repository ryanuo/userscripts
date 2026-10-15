// ==UserScript==
// @name DeepSeek 用量页金额隐藏
// @namespace deepseek-usage-privacy
// @version 1.0.0
// @description 在 DeepSeek 开放平台用量页加一个「小眼睛」，一键遮挡所有金额（充值余额、消费金额、图表 tooltip），Alt+M 切换，状态本地记忆
// @author ryanuo
// @match https://platform.deepseek.com/*
// @grant none
// @run-at document-idle
// @license apache-2.0
// @updateURL https://raw.githubusercontent.com/ryanuo/userscripts/main/scripts/deepseek-usage-privacy.user.js
// @downloadURL https://raw.githubusercontent.com/ryanuo/userscripts/main/scripts/deepseek-usage-privacy.user.js
// ==/UserScript==

(() => {
  'use strict'
  const STORAGE_KEY = 'dsm:hide-money'
  const TOGGLE_ID = 'dsm-money-toggle'
  const STYLE_ID = 'dsm-money-style'
  const BODY_CLASS = 'dsm-hide-money'
  const MARK_ATTR = 'data-dsm-money'
  const USAGE_ROOT = '[data-usage-layout-root]'
  const MONEY_RE = /^[¥￥]\s?\d[\d,]*(?:\.\d+)?$/
  const ICON_EYE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1.8 12S5.6 5.8 12 5.8 22.2 12 22.2 12 18.4 18.2 12 18.2 1.8 12 1.8 12Z"/><circle cx="12" cy="12" r="3.1"/></svg>'
  const ICON_EYE_OFF = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1.8 12S5.6 5.8 12 5.8 22.2 12 22.2 12 18.4 18.2 12 18.2 1.8 12 1.8 12Z"/><circle cx="12" cy="12" r="3.1"/><path d="M3.5 3.5l17 17"/></svg>'
  const CSS = `
body.${BODY_CLASS} [${MARK_ATTR}] {
  visibility: hidden !important;
  user-select: none !important;
}
#${TOGGLE_ID} {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--dsw-alias-border-secondary, #e5e6eb);
  border-radius: 50%;
  background-color: var(--dsw-alias-bg-layer-1, transparent);
  color: var(--dsw-alias-label-secondary, #6b7280);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}
#${TOGGLE_ID}:hover {
  background-color: var(--dsw-alias-interactive-bg-hover, #f2f3f5);
  color: var(--dsw-alias-label-primary, #111827);
}
#${TOGGLE_ID} svg { display: block; }
#${TOGGLE_ID}.dsm-fixed {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 99999;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
`
  let hideMoney = readState()
  let marked = /* @__PURE__ */ new Set()
  let pending = false
  function readState() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1'
    }
    catch {
      return false
    }
  }
  function writeState() {
    try {
      localStorage.setItem(STORAGE_KEY, hideMoney ? '1' : '0')
    }
    catch {
    }
  }
  function injectStyle() {
    if (document.getElementById(STYLE_ID))
      return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = CSS
    document.head.appendChild(style)
  }
  function findAnchor() {
    const buttons = document.querySelectorAll('[role="button"]')
    for (const el of Array.from(buttons)) {
      if (el.textContent && el.textContent.trim() === '导出' && el.parentElement)
        return el.parentElement
    }
    return null
  }
  function applyState() {
    document.body.classList.toggle(BODY_CLASS, hideMoney)
    const btn = document.getElementById(TOGGLE_ID)
    if (!btn)
      return
    btn.innerHTML = hideMoney ? ICON_EYE_OFF : ICON_EYE
    btn.title = hideMoney ? '金额已隐藏，点了或 Alt+M 显示' : '隐藏页面金额（Alt+M）'
    btn.setAttribute('aria-label', btn.title)
    btn.setAttribute('aria-pressed', String(hideMoney))
  }
  function toggle() {
    hideMoney = !hideMoney
    writeState()
    applyState()
  }
  function ensureToggle() {
    if (!document.querySelector(USAGE_ROOT)) {
      document.getElementById(TOGGLE_ID)?.remove()
      return
    }
    if (document.getElementById(TOGGLE_ID))
      return
    const btn = document.createElement('button')
    btn.id = TOGGLE_ID
    btn.type = 'button'
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      toggle()
    })
    const anchor = findAnchor()
    if (anchor) {
      anchor.appendChild(btn)
    }
    else {
      btn.classList.add('dsm-fixed')
      document.body.appendChild(btn)
    }
    applyState()
  }
  function markMoney() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const seen = /* @__PURE__ */ new Set()
    let node = walker.nextNode()
    while (node) {
      const text = (node.nodeValue || '').trim()
      if ((text[0] === '¥' || text[0] === '￥') && MONEY_RE.test(text)) {
        const el = node.parentElement
        if (el && !el.closest(`#${TOGGLE_ID}`)) {
          seen.add(el)
          if (!el.hasAttribute(MARK_ATTR))
            el.setAttribute(MARK_ATTR, '')
        }
      }
      node = walker.nextNode()
    }
    marked.forEach((el) => {
      if (!seen.has(el))
        el.removeAttribute(MARK_ATTR)
    })
    marked = seen
  }
  function sync() {
    ensureToggle()
    if (hideMoney)
      markMoney()
  }
  function scheduleSync() {
    if (pending)
      return
    pending = true
    const run = () => {
      if (!pending)
        return
      pending = false
      sync()
    }
    requestAnimationFrame(run)
    setTimeout(run, 100)
  }
  function onKeydown(e) {
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyM') {
      e.preventDefault()
      toggle()
    }
  }
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      hideMoney = readState()
      applyState()
    }
  })
  injectStyle()
  applyState()
  scheduleSync()
  new MutationObserver(scheduleSync).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  })
  console.warn('[DeepSeek 金额隐藏] 已加载：点用量页右上角小眼睛或按 Alt+M 切换')
})()

// ========== 配置区 ==========
const STORAGE_KEY = 'dsm:hide-money' // localStorage 记忆开关状态
const TOGGLE_ID = 'dsm-money-toggle' // 小眼睛按钮 id
const STYLE_ID = 'dsm-money-style' // 注入样式 id
const BODY_CLASS = 'dsm-hide-money' // 打开时挂在 body 上
const MARK_ATTR = 'data-dsm-money' // 被遮挡元素上的标记（调试/自检用）
const USAGE_ROOT = '[data-usage-layout-root]' // 用量页容器（稳定 data 属性）
const MASK_TEXT = '***' // 遮挡后显示的占位文本
// 金额文本：¥3.86 / ¥ 1,234.56，兼容全角 ￥
const MONEY_RE = /^[¥￥]\s?\d[\d,]*(?:\.\d+)?$/

const ICON_EYE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1.8 12S5.6 5.8 12 5.8 22.2 12 22.2 12 18.4 18.2 12 18.2 1.8 12 1.8 12Z"/><circle cx="12" cy="12" r="3.1"/></svg>'
const ICON_EYE_OFF = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1.8 12S5.6 5.8 12 5.8 22.2 12 22.2 12 18.4 18.2 12 18.2 1.8 12 1.8 12Z"/><circle cx="12" cy="12" r="3.1"/><path d="M3.5 3.5l17 17"/></svg>'

const CSS = `
#${TOGGLE_ID} {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  flex: 0 0 auto; /* flex 行里不被拉伸/压缩 */
  align-self: center; /* flex 行里垂直居中 */
  vertical-align: middle; /* inline 行里按中线对齐（默认 baseline 会让按钮掉下去） */
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
/* 遮挡后把 *** 挪回数字所在的光学中线。
   星号是贴 em 框上部的字符、数字贴基线，两者墨迹中心差 ≈ 0.145em
   （站点字体 Inter Medium 实测：29px 卡片值差 4px），而 line-height / flex 居中
   只摆行盒、摆不动字形本身，只能做相对位移；em 让 29px 卡片值、16px tooltip、
   14px 图表标题一起适配。实测残差：29px 0px、16px 0px、14px 0.25px。
   相对定位只影响绘制，不动布局：CNY 单位、卡片高度、flex 基线都不变。 */
body.${BODY_CLASS} [${MARK_ATTR}] {
  position: relative;
  top: 0.145em;
}
`

// ========== 开关状态 ==========
let hideMoney = readState()
// 被换成 *** 的文本节点 -> 它的真实金额（关掉时原样还回去）
const masked = new Map<Text, string>()
let pending = false

function readState(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  }
  catch {
    return false
  }
}

function writeState(): void {
  try {
    localStorage.setItem(STORAGE_KEY, hideMoney ? '1' : '0')
  }
  catch {
    // 隐私模式下 localStorage 不可用，仅当次会话生效
  }
}

// ========== 样式与按钮 ==========
function injectStyle(): void {
  if (document.getElementById(STYLE_ID))
    return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  document.head.appendChild(style)
}

// 靠文本找「导出」按钮所在的操作区，插入小眼睛（class 是哈希，只能用文本定位）
function findAnchor(): Element | null {
  const buttons = document.querySelectorAll('[role="button"]')
  for (const el of Array.from(buttons)) {
    if (el.textContent && el.textContent.trim() === '导出' && el.parentElement)
      return el.parentElement
  }
  return null
}

function applyState(): void {
  document.body.classList.toggle(BODY_CLASS, hideMoney)
  const btn = document.getElementById(TOGGLE_ID)
  if (!btn)
    return
  btn.innerHTML = hideMoney ? ICON_EYE_OFF : ICON_EYE
  btn.title = hideMoney ? `金额已显示为 ${MASK_TEXT}，点了或 Alt+M 恢复` : '隐藏页面金额（Alt+M）'
  btn.setAttribute('aria-label', btn.title)
  btn.setAttribute('aria-pressed', String(hideMoney))
}

function toggle(): void {
  hideMoney = !hideMoney
  writeState()
  applyState()
  scan() // 点了立刻生效，不等下一帧
}

// ========== 遮挡：把金额文本换成 *** ==========
function isMoney(value: string): boolean {
  return (value[0] === '¥' || value[0] === '￥') && MONEY_RE.test(value)
}

function restoreAll(): void {
  masked.forEach((real, node) => {
    if (node.isConnected)
      node.nodeValue = real
    node.parentElement?.removeAttribute(MARK_ATTR)
  })
  masked.clear()
}

function scan(): void {
  if (!hideMoney) {
    restoreAll()
    return
  }

  const seen = new Set<Text>()
  // 值还是 *** 的说明没人动过，记录继续留着
  masked.forEach((real, node) => {
    if (!node.isConnected) {
      masked.delete(node)
      return
    }
    if (node.nodeValue === MASK_TEXT)
      seen.add(node)
  })

  // 全量扫一遍：新出现的金额，以及遮挡期间被页面刷新成真实金额的节点
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode() as Text | null
  while (node) {
    const value = node.nodeValue || ''
    if (isMoney(value.trim()) && !node.parentElement?.closest(`#${TOGGLE_ID}`)) {
      seen.add(node)
      masked.set(node, value) // 关键：页面自己写入的新金额当成真实值存下来
    }
    node = walker.nextNode() as Text | null
  }

  // 页面把节点复用成别的文本了：清掉记录和标记，不动它的新内容
  masked.forEach((real, node) => {
    if (seen.has(node))
      return
    masked.delete(node)
    node.parentElement?.removeAttribute(MARK_ATTR)
  })

  masked.forEach((real, node) => {
    if (node.nodeValue !== MASK_TEXT)
      node.nodeValue = MASK_TEXT
    node.parentElement?.setAttribute(MARK_ATTR, '')
  })
}

function ensureToggle(): void {
  // 不在用量页（SPA 路由切走）就撤掉按钮
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

// ========== 调度：一帧内合并多次 DOM 变化 ==========
function sync(): void {
  ensureToggle()
  scan()
}

function scheduleSync(): void {
  if (pending)
    return
  pending = true
  const run = (): void => {
    if (!pending)
      return
    pending = false
    sync()
  }
  // rAF 合并同一帧内的多次变化；后台标签页 rAF 被节流，用定时器兜底
  requestAnimationFrame(run)
  setTimeout(run, 100)
}

// ========== 事件绑定 ==========
function onKeydown(e: KeyboardEvent): void {
  // 用 code 而不是 key：macOS 下 Alt+M 会输入 µ
  if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyM') {
    e.preventDefault()
    toggle()
  }
}

window.addEventListener('keydown', onKeydown)
// 多标签页同步开关状态
window.addEventListener('storage', (e: StorageEvent) => {
  if (e.key === STORAGE_KEY) {
    hideMoney = readState()
    applyState()
    scan()
  }
})

// ========== 主流程 ==========
injectStyle()
applyState()
scan()
scheduleSync()
// 页面数据是异步拉的、图表 tooltip 是悬停才插入的，靠 observer 跟着重新扫描
new MutationObserver(scheduleSync).observe(document.documentElement, {
  childList: true,
  subtree: true,
  characterData: true,
})

console.warn(`[DeepSeek 金额隐藏] 已加载：点用量页右上角小眼睛或按 Alt+M，金额会显示为 ${MASK_TEXT}`)

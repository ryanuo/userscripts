const BUTTON_ID = 'tm-back-to-top-btn-ryanuo'
const SCROLL_THRESHOLD = 300

const style = `
    #${BUTTON_ID} {
      position: fixed;
      right: 20px;
      bottom: 28px;
      z-index: 999999;
      width: 46px;
      height: 46px;
      border-radius: 999px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.2);
      background: linear-gradient(135deg,#1d9bf0 0%,#0b7cd6 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0;
      transform: translateY(10px) scale(0.98);
      transition: opacity 200ms ease, transform 200ms ease;
      font-size: 20px;
      user-select: none;
    }
    #${BUTTON_ID}.visible {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    #${BUTTON_ID}:hover {
      box-shadow: 0 12px 28px rgba(0,0,0,0.3);
      transform: translateY(-2px) scale(1.02);
    }
    #${BUTTON_ID}.hidden-for-input {
      opacity: 0.4;
    }
    /* small screens */
    @media (max-width:480px){
      #${BUTTON_ID} { right: 12px; bottom: 20px; width:42px; height:42px; font-size:18px; }
    }
  `

function injectStyle(cssText: string): void {
  const s = document.createElement('style')
  s.setAttribute('type', 'text/css')
  s.textContent = cssText
  document.head.appendChild(s)
}

function createButton(): HTMLDivElement {
  const existBtn = document.getElementById(BUTTON_ID)
  if (existBtn)
    return existBtn as HTMLDivElement

  const btn = document.createElement('div')
  btn.id = BUTTON_ID
  btn.setAttribute('role', 'button')
  btn.setAttribute('aria-label', '回到顶部 (按 T)')
  btn.title = '回到顶部 (按 T)'
  btn.innerHTML = '↑' // 简单箭头，也可以换成 svg
  btn.addEventListener('click', scrollToTop)
  document.body.appendChild(btn)
  return btn
}

function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function shouldShowButton(): boolean {
  return window.scrollY > SCROLL_THRESHOLD
}

function updateButtonVisibility(btn: HTMLDivElement): void {
  if (shouldShowButton())
    btn.classList.add('visible')
  else btn.classList.remove('visible')
}

function isTypingInInput(): boolean {
  const active = document.activeElement as HTMLElement | null
  if (!active)
    return false
  const tag = active.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || active.isContentEditable
}

function setupKeyboardShortcuts(_btn: HTMLDivElement): void {
  window.addEventListener('keydown', (e) => {
    if ((e.key === 't' || e.key === 'T') && !isTypingInInput()) {
      e.preventDefault()
      scrollToTop()
    }
  })
}

function init(): void {
  injectStyle(style)
  let btn = createButton()
  updateButtonVisibility(btn)

  let ticking = false
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateButtonVisibility(btn)
        ticking = false
      })
      ticking = true
    }
  }, { passive: true })

  document.addEventListener('focusin', () => {
    btn.classList.toggle('hidden-for-input', isTypingInInput())
  })
  document.addEventListener('focusout', () => {
    btn.classList.toggle('hidden-for-input', isTypingInInput())
  })

  setupKeyboardShortcuts(btn)

  const mo = new MutationObserver(() => {
    if (!document.getElementById(BUTTON_ID)) {
      btn = createButton()
      setupKeyboardShortcuts(btn)
    }
  })
  mo.observe(document.documentElement || document.body, { childList: true, subtree: true })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
}
else {
  init()
}

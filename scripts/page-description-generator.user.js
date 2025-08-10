// ==UserScript==
// @name 页面描述生成器
// @namespace page-description-generator
// @version 1.1.1
// @description 使用 AI 对当前页面内容进行描述分析，生成详细文字，支持快捷键和按钮触发，按钮带loading和折叠功能
// @author ryanuo
// @match *://*/*
// @grant GM_xmlhttpRequest
// @connect api.openai.com
// @connect api.kkyyxx.xyz
// @run-at document-idle
// @license apache-2.0
// ==/UserScript==

(() => {
  'use strict'
  const OPENAI_API_KEY = 'xxxx'
  const OPENAI_API_BASE_URL = 'https://api.kkyyxx.xyz'
  const MODEL = 'gemini-2.5-flash'
  const TEMPERATURE = 0.7
  const POPUP_ID = 'openai-description-popup'
  const POPUP_WIDTH = '320px'
  const POPUP_MAX_HEIGHT = '60vh'
  const TRIGGER_BTN_ID = 'openai-description-trigger-btn'
  const COLLAPSE_BAR_ID = 'openai-description-collapse-bar'
  function extractPageText() {
    return (document.body.textContent || '').trim().slice(0, 2e3)
  }
  function callOpenAI(prompt, callback) {
    GM_xmlhttpRequest({
      method: 'POST',
      url: `${OPENAI_API_BASE_URL}/v1/chat/completions`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      data: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: '你是一个网页内容分析专家。' },
          { role: 'user', content: prompt },
        ],
        temperature: TEMPERATURE,
      }),
      onload(response) {
        if (response.status === 200) {
          try {
            const data = JSON.parse(response.responseText)
            const text = data.choices[0].message.content.trim()
            callback(null, text)
          }
          catch (e) {
            callback(e)
          }
        }
        else {
          callback(new Error(`OpenAI API 错误，状态码：${response.status}`))
        }
      },
      onerror(e) {
        callback(e)
      },
    })
  }
  function showResult(text) {
    let div = document.getElementById(POPUP_ID)
    if (!div) {
      div = document.createElement('div')
      div.id = POPUP_ID
      Object.assign(div.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: POPUP_WIDTH,
        maxHeight: POPUP_MAX_HEIGHT,
        overflowY: 'auto',
        padding: '12px',
        background: '#1a1a1a',
        color: '#eee',
        fontSize: '14px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
        borderRadius: '8px',
        zIndex: '999999',
        whiteSpace: 'pre-wrap',
      })
      const btn = document.createElement('button')
      btn.textContent = '关闭'
      Object.assign(btn.style, {
        position: 'absolute',
        top: '6px',
        right: '6px',
        cursor: 'pointer',
        background: 'transparent',
        border: 'none',
        color: '#ccc',
        fontSize: '14px',
      })
      btn.onclick = () => div && div.remove()
      div.appendChild(btn)
      const content2 = document.createElement('pre')
      content2.id = `${POPUP_ID}-content`
      content2.style.marginTop = '24px'
      div.appendChild(content2)
      document.body.appendChild(div)
    }
    const content = document.getElementById(`${POPUP_ID}-content`)
    if (content)
      content.textContent = text
  }
  function createLoadingIcon() {
    const svgNS = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(svgNS, 'svg')
    svg.setAttribute('viewBox', '0 0 50 50')
    svg.setAttribute('width', '16')
    svg.setAttribute('height', '16')
    svg.style.marginRight = '6px'
    svg.style.verticalAlign = 'middle'
    svg.style.animation = 'spin 1s linear infinite'
    const circle = document.createElementNS(svgNS, 'circle')
    circle.setAttribute('cx', '25')
    circle.setAttribute('cy', '25')
    circle.setAttribute('r', '20')
    circle.setAttribute('fill', 'none')
    circle.setAttribute('stroke', '#fff')
    circle.setAttribute('stroke-width', '5')
    circle.setAttribute('stroke-linecap', 'round')
    circle.setAttribute('stroke-dasharray', '31.4 31.4')
    circle.setAttribute('stroke-dashoffset', '0')
    svg.appendChild(circle)
    return svg
  }
  function injectSpinStyle() {
    if (document.getElementById('openai-spin-style'))
      return
    const style = document.createElement('style')
    style.id = 'openai-spin-style'
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg);}
        100% { transform: rotate(360deg);}
      }
    `
    document.head.appendChild(style)
  }
  function createTriggerButton() {
    if (document.getElementById(TRIGGER_BTN_ID))
      return
    injectSpinStyle()
    const triggerBtn = document.createElement('button')
    const collapseBar = document.createElement('div')
    collapseBar.id = COLLAPSE_BAR_ID
    Object.assign(collapseBar.style, {
      position: 'fixed',
      top: '50%',
      right: '0',
      width: '8px',
      height: '60px',
      backgroundColor: 'rgba(29, 155, 240, 0.3)',
      borderTopLeftRadius: '4px',
      borderBottomLeftRadius: '4px',
      cursor: 'pointer',
      transform: 'translateY(-50%)',
      zIndex: '999998',
      display: 'none',
      transition: 'background-color 0.3s ease',
    })
    collapseBar.title = '展开 AI 分析按钮'
    collapseBar.onmouseenter = () => collapseBar.style.backgroundColor = 'rgba(29, 155, 240, 0.6)'
    collapseBar.onmouseleave = () => collapseBar.style.backgroundColor = 'rgba(29, 155, 240, 0.3)'
    collapseBar.onclick = () => {
      collapseBar.style.display = 'none'
      triggerBtn.style.display = 'inline-flex'
    }
    document.body.appendChild(collapseBar)
    triggerBtn.id = TRIGGER_BTN_ID
    triggerBtn.type = 'button'
    triggerBtn.title = '点击使用 OpenAI 分析当前页面内容，Ctrl+Shift+D 也可触发'
    triggerBtn.style.position = 'fixed'
    triggerBtn.style.right = '20px'
    triggerBtn.style.bottom = '20px'
    triggerBtn.style.zIndex = '999999'
    triggerBtn.style.padding = '8px 12px'
    triggerBtn.style.backgroundColor = 'rgba(29, 155, 240, 0.4)'
    triggerBtn.style.color = '#ddd'
    triggerBtn.style.border = '1px solid rgba(29, 155, 240, 0.6)'
    triggerBtn.style.borderRadius = '6px'
    triggerBtn.style.cursor = 'pointer'
    triggerBtn.style.fontSize = '13px'
    triggerBtn.style.userSelect = 'none'
    triggerBtn.style.display = 'inline-flex'
    triggerBtn.style.alignItems = 'center'
    triggerBtn.style.transition = 'background-color 0.3s ease, color 0.3s ease'
    triggerBtn.onmouseenter = () => {
      triggerBtn.style.backgroundColor = 'rgba(29, 155, 240, 0.7)'
      triggerBtn.style.color = '#fff'
    }
    triggerBtn.onmouseleave = () => {
      triggerBtn.style.backgroundColor = 'rgba(29, 155, 240, 0.4)'
      triggerBtn.style.color = '#ddd'
    }
    const textSpan = document.createElement('span')
    textSpan.textContent = 'AI 分析'
    triggerBtn.appendChild(textSpan)
    let loadingIcon = null
    function setLoading(loading) {
      if (loading) {
        triggerBtn.disabled = true
        textSpan.textContent = '分析中...'
        if (!loadingIcon) {
          loadingIcon = createLoadingIcon()
          triggerBtn.insertBefore(loadingIcon, textSpan)
        }
      }
      else {
        triggerBtn.disabled = false
        textSpan.textContent = 'AI 分析'
        if (loadingIcon) {
          triggerBtn.removeChild(loadingIcon)
          loadingIcon = null
        }
      }
    }
    triggerBtn.onclick = () => {
      setLoading(true)
      main(() => setLoading(false))
    }
    triggerBtn.oncontextmenu = (e) => {
      e.preventDefault()
      triggerBtn.style.display = 'none'
      collapseBar.style.display = 'block'
    }
    document.body.appendChild(triggerBtn)
  }
  function main(done) {
    const pageText = extractPageText()
    if (!pageText) {
      window.dispatchEvent(new CustomEvent('openai-description-error', { detail: '无法获取页面内容，请稍后重试' }))
      if (done)
        done()
      return
    }
    const prompt = `请帮我详细描述分析以下网页内容，内容为：
${pageText},不超过200字`
    callOpenAI(prompt, (err, text) => {
      if (err) {
        console.error(`调用 OpenAI API 失败: ${err}`)
        window.dispatchEvent(new CustomEvent('openai-description-error', { detail: '调用 OpenAI API 失败，请查看控制台' }))
        if (done)
          done()
        return
      }
      if (text)
        showResult(text)
      if (done)
        done()
    })
  }
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') {
      e.preventDefault()
      main()
    }
  })
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createTriggerButton)
  }
  else {
    createTriggerButton()
  }
  console.warn('OpenAI 页面描述生成器已加载，快捷键 Ctrl+Shift+D，右下角按钮均可触发分析。右键点击按钮可折叠。')
})()

import fs from 'node:fs'
import * as path from 'node:path'
import { readMetaField } from './readMetaDescription'

// 转义后写进 HTML，避免描述里的 & < > 破坏结构
function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatSize(bytes: number): string {
  if (bytes < 1024)
    return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

const RAW_BASE = 'https://raw.githubusercontent.com/ryanuo/userscripts/main/scripts'

const STYLE = `
  :root {
    --bg: #f6f7f9;
    --bg-soft: #eceef2;
    --card: #ffffff;
    --fg: #1f2328;
    --fg-soft: #61697a;
    --line: #e6e8ee;
    --accent: #4f6ef7;
    --accent-soft: #eaeefe;
    --shadow-sm: 0 1px 2px rgba(16, 24, 40, .04), 0 1px 3px rgba(16, 24, 40, .06);
    --shadow-lg: 0 12px 30px rgba(16, 24, 40, .10);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #14161a;
      --bg-soft: #1b1e24;
      --card: #1c1f26;
      --fg: #e9ebef;
      --fg-soft: #98a1b0;
      --line: #2a2f39;
      --accent: #7b93ff;
      --accent-soft: #232a44;
      --shadow-sm: 0 1px 2px rgba(0, 0, 0, .3);
      --shadow-lg: 0 12px 30px rgba(0, 0, 0, .45);
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--fg);
    font-family: "Inter", -apple-system, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
    font-size: 16px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    transition: background .3s, color .3s;
  }
  a { color: inherit; }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 6px; }
  .page { max-width: 1120px; margin: 0 auto; padding: 40px 24px 32px; }

  /* ---------- 顶部 ---------- */
  .hero {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--line);
  }
  .brand { display: flex; align-items: center; gap: 16px; text-decoration: none; }
  .brand img {
    width: 56px;
    height: 56px;
    border-radius: 16px;
    object-fit: contain;
    background: var(--card);
    border: 1px solid var(--line);
    padding: 6px;
  }
  h1 {
    margin: 0;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: .2px;
    background: linear-gradient(96deg, var(--accent), #8aa2ff);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .sub { margin: 4px 0 0; font-size: 13.5px; color: var(--fg-soft); }
  .stats { display: flex; gap: 10px; }
  .stat {
    min-width: 96px;
    padding: 10px 16px;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: var(--card);
    box-shadow: var(--shadow-sm);
    text-align: center;
  }
  .stat b { display: block; font-size: 17px; font-weight: 650; }
  .stat span { font-size: 12px; color: var(--fg-soft); }

  /* ---------- 工具条 ---------- */
  .toolbar {
    display: flex;
    align-items: center;
    gap: 16px;
    margin: 24px 0 18px;
  }
  .search {
    position: relative;
    flex: 1;
    max-width: 380px;
  }
  .search svg {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--fg-soft);
  }
  .search input {
    width: 100%;
    height: 40px;
    padding: 0 14px 0 36px;
    font: inherit;
    font-size: 14px;
    color: var(--fg);
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 10px;
    box-shadow: var(--shadow-sm);
    transition: border-color .2s, box-shadow .2s;
  }
  .search input::placeholder { color: var(--fg-soft); opacity: .8; }
  .search input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
  .count { font-size: 13px; color: var(--fg-soft); }

  /* ---------- 卡片 ---------- */
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 18px;
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 20px;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 16px;
    box-shadow: var(--shadow-sm);
    transition: transform .2s ease, box-shadow .25s ease, border-color .2s ease;
  }
  .card:hover {
    transform: translateY(-3px);
    border-color: var(--accent);
    box-shadow: var(--shadow-lg);
  }
  .card[hidden] { display: none; }
  .card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .card-head h2 {
    margin: 0;
    font-size: 16.5px;
    font-weight: 650;
    line-height: 1.35;
  }
  .tag {
    flex: 0 0 auto;
    padding: 1px 9px;
    font-size: 12px;
    font-weight: 600;
    line-height: 18px;
    color: var(--accent);
    background: var(--accent-soft);
    border-radius: 999px;
  }
  .file {
    align-self: flex-start;
    max-width: 100%;
    padding: 2px 8px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    color: var(--fg-soft);
    background: var(--bg-soft);
    border-radius: 6px;
    word-break: break-all;
  }
  .desc {
    flex: 1;
    margin: 0;
    font-size: 14px;
    line-height: 1.65;
    color: var(--fg-soft);
  }
  .metrics {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12.5px;
    color: var(--fg-soft);
  }
  .metrics .dot { width: 3px; height: 3px; border-radius: 50%; background: currentColor; opacity: .5; }
  .actions { display: flex; gap: 8px; margin-top: 2px; }
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    height: 34px;
    padding: 0 12px;
    font-size: 13.5px;
    font-weight: 500;
    text-decoration: none;
    color: var(--fg-soft);
    background: transparent;
    border: 1px solid var(--line);
    border-radius: 10px;
    transition: color .18s, background .18s, border-color .18s, transform .18s;
  }
  .btn:hover { color: var(--fg); background: var(--bg-soft); border-color: var(--fg-soft); }
  .btn-primary {
    color: #fff;
    background: var(--accent);
    border-color: transparent;
    box-shadow: 0 2px 8px rgba(79, 110, 247, .28);
  }
  .btn-primary:hover {
    color: #fff;
    background: #4058e0;
    border-color: transparent;
    transform: translateY(-1px);
  }

  .empty {
    padding: 56px 0;
    text-align: center;
    font-size: 14px;
    color: var(--fg-soft);
  }
  footer {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: space-between;
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid var(--line);
    font-size: 12.5px;
    color: var(--fg-soft);
  }
  footer a { color: var(--accent); text-decoration: none; }
  footer a:hover { text-decoration: underline; }

  @media (max-width: 640px) {
    .page { padding: 24px 16px; }
    .hero { flex-direction: column; align-items: flex-start; }
    .stats { width: 100%; }
    .stat { flex: 1; min-width: 0; padding: 8px 10px; }
    .stat b { font-size: 15px; }
    .grid { grid-template-columns: 1fr; }
    .toolbar { flex-direction: column; align-items: flex-start; gap: 10px; }
    .search { max-width: none; width: 100%; }
  }
`

export function genIndexHtml(distDir: string, rootDir: string) {
  const srcDir = path.join(rootDir, 'src')
  const userjsFiles = fs.readdirSync(distDir).filter(f => f.endsWith('.user.js'))

  const fileInfos = userjsFiles.map((f) => {
    const stat = fs.statSync(path.join(distDir, f))
    const base = f.replace(/\.user\.js$/, '')
    const name = String(readMetaField(srcDir, base, 'name') || base)
    const version = String(readMetaField(srcDir, base, 'version') || '')
    const desc = String(readMetaField(srcDir, base, 'description') || '（无描述）')
    return {
      name: f,
      title: name,
      version,
      desc,
      size: formatSize(stat.size),
      mtime: formatDate(stat.mtime),
      text: `${name} ${base} ${desc}`.toLowerCase(),
    }
  }).sort((a, b) => b.mtime.localeCompare(a.mtime))

  const totalSize = formatSize(fileInfos.reduce((sum, f) => sum + fs.statSync(path.join(distDir, f.name)).size, 0))
  const newest = fileInfos[0]?.mtime.slice(0, 10) ?? '-'

  const cards = fileInfos.map(f => `
      <article class="card" data-text="${esc(f.text)}">
        <div class="card-head">
          <h2>${esc(f.title)}</h2>
          ${f.version ? `<span class="tag">v${esc(f.version)}</span>` : ''}
        </div>
        <code class="file">${esc(f.name)}</code>
        <p class="desc">${esc(f.desc)}</p>
        <div class="metrics">
          <span>${esc(f.size)}</span>
          <span class="dot"></span>
          <span>${esc(f.mtime)}</span>
        </div>
        <div class="actions">
          <a class="btn btn-primary" href="${RAW_BASE}/${encodeURIComponent(f.name)}" target="_blank" rel="noopener noreferrer">安装</a>
          <a class="btn" href="./scripts/${encodeURIComponent(f.name)}" download>下载</a>
          <a class="btn" href="./scripts/${encodeURIComponent(f.name)}" target="_blank" rel="noopener noreferrer">源码</a>
        </div>
      </article>`).join('')

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>Userscripts 预览</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="icon" href="./favicon.ico">
  <style>${STYLE}
  </style>
</head>

<body>
  <div class="page">
    <header class="hero">
      <a class="brand" href="https://github.com/ryanuo/userscripts" target="_blank" rel="noopener noreferrer">
        <img src="./favicon.ico" alt="Userscripts">
        <span>
          <h1>Userscripts</h1>
          <p class="sub">自用油猴脚本集合 · 点「安装」由 Tampermonkey 接管</p>
        </span>
      </a>
      <div class="stats">
        <div class="stat"><b>${fileInfos.length}</b><span>个脚本</span></div>
        <div class="stat"><b>${esc(totalSize)}</b><span>总大小</span></div>
        <div class="stat"><b>${esc(newest)}</b><span>最近更新</span></div>
      </div>
    </header>

    <div class="toolbar">
      <label class="search">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/></svg>
        <input id="q" type="search" placeholder="搜索脚本名 / 文件 / 描述  按 / 聚焦" autocomplete="off">
      </label>
      <span class="count" id="count"></span>
    </div>

    <main class="grid">${cards}
    </main>
    <p class="empty" id="empty" hidden>没有匹配的脚本</p>

    <footer>
      <span>本页由 <code>pnpm build</code> 自动生成于 ${esc(formatDate(new Date()))}</span>
      <a href="https://github.com/ryanuo/userscripts" target="_blank" rel="noopener noreferrer">GitHub · ryanuo/userscripts</a>
    </footer>
  </div>

  <script>
    (function () {
      var q = document.getElementById('q')
      var count = document.getElementById('count')
      var empty = document.getElementById('empty')
      var cards = Array.prototype.slice.call(document.querySelectorAll('.card'))

      function run() {
        var kw = q.value.trim().toLowerCase()
        var shown = 0
        cards.forEach(function (card) {
          var hit = !kw || (card.getAttribute('data-text') || '').indexOf(kw) > -1
          card.hidden = !hit
          if (hit) shown++
        })
        count.textContent = shown + ' / ' + cards.length + ' 个脚本'
        empty.hidden = shown !== 0
      }

      q.addEventListener('input', run)
      document.addEventListener('keydown', function (e) {
        if (e.key === '/' && document.activeElement !== q) {
          e.preventDefault()
          q.focus()
        }
      })
      run()
    })()
  </script>
</body>
</html>`

  fs.writeFileSync(path.join(rootDir, 'index.html'), html, 'utf8')
}

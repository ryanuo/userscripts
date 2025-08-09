// 拼接 meta block 并输出 userscript
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

function metaBlock(meta: Record<string, any>): string {
  const lines = ['// ==UserScript==']
  for (const [key, value] of Object.entries(meta)) {
    if (Array.isArray(value)) {
      value.forEach(v => lines.push(`// @${key} ${v}`))
    }
    else {
      lines.push(`// @${key} ${value}`)
    }
  }
  lines.push('// ==/UserScript==\n')
  return lines.join('\n')
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '.')
const srcDir = path.join(rootDir, 'src')
const distDir = path.join(rootDir, 'scripts')

const subdirs = fs.readdirSync(srcDir).filter((name) => {
  const full = path.join(srcDir, name)
  return fs.statSync(full).isDirectory()
})

let found = false;
(async () => {
  for (const dir of subdirs) {
    const metaPath = path.join(srcDir, dir, 'meta.ts')
    const mjsPath = path.join(distDir, `${dir}.mjs`)
    const output = path.join(distDir, `${dir}.user.js`)
    if (fs.existsSync(metaPath) && fs.existsSync(mjsPath)) {
      try {
        const meta = (await import(metaPath.replace(/\\/g, '/'))).default
        const code = fs.readFileSync(mjsPath, 'utf8')
        const metaStr = metaBlock(meta)
        // 用 IIFE 包裹代码
        const wrapped = `(() => {\n'use strict';\n${code}\n})();`
        fs.writeFileSync(output, `${metaStr}\n${wrapped}`, { encoding: 'utf8' })
        // eslint-disable-next-line no-console
        console.log('UserScript 构建完成:', output)
        // 删除 .mjs 文件
        try {
          fs.unlinkSync(mjsPath)
          // eslint-disable-next-line no-console
          console.log('已删除:', mjsPath)
        }
        catch (err) {
          console.warn('删除 .mjs 失败:', mjsPath, err)
        }
        found = true
      }
      catch (e) {
        console.error('meta 读取失败:', metaPath, e)
      }
    }
  }
  if (!found) {
    console.warn('未发现可用的 userscript 子目录或未编译 mjs 文件')
  }

  // 生成 index.html 预览页面
  const userjsFiles = fs.readdirSync(distDir).filter(f => f.endsWith('.user.js'))
  const fileInfos = userjsFiles.map((f) => {
    const stat = fs.statSync(path.join(distDir, f))
    return {
      name: f,
      size: `${(stat.size / 1024).toFixed(1)} KB`,
      mtime: stat.mtime.toLocaleString(),
    }
  })
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>Userscripts 预览</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body {
      font-family: system-ui, sans-serif;
      margin: 0; padding: 0; background: var(--bg,#f7f7fa); min-height: 100vh;
      color: var(--fg,#222); transition: background .3s,color .3s;
    }
    @media (prefers-color-scheme: dark) {
      body { --bg: #181a1b; --fg: #eee; }
      .card { background: #23272e; box-shadow: 0 2px 8px #0004; }
      a { color: #90caf9; }
    }
    h1 { font-size: 2em; margin: 1.2em 0 0.5em 0; text-align:center; }
    .container { max-width: 800px; margin: 0 auto; padding: 2em 1em; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(260px,1fr)); gap: 1.5em; }
    .card {
      background: #fff; border-radius: 12px; box-shadow: 0 2px 8px #0001;
      padding: 1.2em 1em 1em 1em; display: flex; flex-direction: column; gap: 0.7em;
      transition: box-shadow .2s;
    }
    .card:hover { box-shadow: 0 4px 16px #1976d233; }
    .filename { font-weight: 600; font-size: 1.1em; word-break: break-all; }
    .meta { color: #888; font-size: 0.97em; }
    .actions { margin-top: 0.5em; }
    .btn {
      display: inline-block; padding: 0.4em 1.1em; border-radius: 6px;
      background: linear-gradient(90deg,#1976d2 60%,#42a5f5 100%);
      color: #fff; text-decoration: none; font-weight: 500; font-size: 1em;
      border: none; cursor: pointer; transition: background .2s;
      box-shadow: 0 2px 8px #1976d233;
    }
    .btn:hover { background: linear-gradient(90deg,#1565c0 60%,#1976d2 100%); }
    @media (max-width: 600px) {
      .container { padding: 1em 0.2em; }
      h1 { font-size: 1.3em; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Userscripts 预览</h1>
    <div class="grid">
      ${fileInfos.map(f => `
        <div class="card">
          <div class="filename">${f.name}</div>
          <div class="meta">大小: ${f.size} &nbsp;|&nbsp; 更新时间: ${f.mtime}</div>
          <div class="actions">
            <a class="btn" href="./scripts/${f.name}" download>下载</a>
            <a class="btn" href="./scripts/${f.name}" target="_blank">预览</a>
          </div>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>`
  fs.writeFileSync(path.join(rootDir, 'index.html'), html, { encoding: 'utf8' })
  // eslint-disable-next-line no-console
  console.log('index.html 已生成')
})()

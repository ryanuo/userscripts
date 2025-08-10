import fs from 'node:fs'
import * as path from 'node:path'

export function genIndexHtml(distDir: string, rootDir: string) {
  const userjsFiles = fs.readdirSync(distDir).filter(f => f.endsWith('.user.js'))
  const fileInfos = userjsFiles.map((f) => {
    const stat = fs.statSync(path.join(distDir, f))
    return {
      name: f,
      size: `${(stat.size / 1024).toFixed(1)} KB`,
      mtime: stat.mtime.toLocaleString(),
    }
  })
  const html = `<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>\n  <meta charset=\"utf-8\">\n  <title>Userscripts 预览</title>\n  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n  <style>\n    body {\n      font-family: system-ui, sans-serif;\n      margin: 0; padding: 0; background: var(--bg,#f7f7fa); min-height: 100vh;\n      color: var(--fg,#222); transition: background .3s,color .3s;\n    }\n    @media (prefers-color-scheme: dark) {\n      body { --bg: #181a1b; --fg: #eee; }\n      .card { background: #23272e; box-shadow: 0 2px 8px #0004; }\n      a { color: #90caf9; }\n    }\n    h1 { font-size: 2em; margin: 1.2em 0 0.5em 0; text-align:center; }\n    .container { max-width: 800px; margin: 0 auto; padding: 2em 1em; }\n    .grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(260px,1fr)); gap: 1.5em; }\n    .card {\n      background: #fff; border-radius: 12px; box-shadow: 0 2px 8px #0001;\n      padding: 1.2em 1em 1em 1em; display: flex; flex-direction: column; gap: 0.7em;\n      transition: box-shadow .2s;\n    }\n    .card:hover { box-shadow: 0 4px 16px #1976d233; }\n    .filename { font-weight: 600; font-size: 1.1em; word-break: break-all; }\n    .meta { color: #888; font-size: 0.97em; }\n    .actions { margin-top: 0.5em; }\n    .btn {\n      display: inline-block; padding: 0.4em 1.1em; border-radius: 6px;\n      background: linear-gradient(90deg,#1976d2 60%,#42a5f5 100%);\n      color: #fff; text-decoration: none; font-weight: 500; font-size: 1em;\n      border: none; cursor: pointer; transition: background .2s;\n      box-shadow: 0 2px 8px #1976d233;\n    }\n    .btn:hover { background: linear-gradient(90deg,#1565c0 60%,#1976d2 100%); }\n    @media (max-width: 600px) {\n      .container { padding: 1em 0.2em; }\n      h1 { font-size: 1.3em; }\n    }\n  </style>\n</head>\n<body>\n  <div class=\"container\">\n    <h1>Userscripts 预览</h1>\n    <div class=\"grid\">\n      ${fileInfos.map(f => `\n        <div class=\"card\">\n          <div class=\"filename\">${f.name}</div>\n          <div class=\"meta\">大小: ${f.size} &nbsp;|&nbsp; 更新时间: ${f.mtime}</div>\n          <div class=\"actions\">\n            <a class=\"btn\" href=\"./scripts/${f.name}\" download>下载</a>\n            <a class=\"btn\" href=\"./scripts/${f.name}\" target=\"_blank\">预览</a>\n          </div>\n        </div>\n      `).join('')}\n    </div>\n  </div>\n</body>\n</html>`
  fs.writeFileSync(path.join(rootDir, 'index.html'), html, { encoding: 'utf8' })
}

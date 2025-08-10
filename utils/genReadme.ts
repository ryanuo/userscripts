import type { ScriptVersionCache } from './versionCache'
import fs from 'node:fs'

import * as path from 'node:path'
import { readMetaDescription } from './readMetaDescription'
import { readVersionCache, writeVersionCache } from './versionCache'

function formatSize(bytes: number): string {
  if (bytes < 1024)
    return `${bytes} B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function formatDate(date: Date): string {
  return date.toISOString().replace('T', ' ').slice(0, 16)
}

function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}
export function genReadme(distDir: string, rootDir: string) {
  const userjsFiles = fs.readdirSync(distDir).filter(f => f.endsWith('.user.js'))
  const cachePath = path.join(rootDir, '.userjs-version-cache.json')
  const versionCache: ScriptVersionCache = readVersionCache(cachePath)
  let cacheChanged = false

  // 读取meta信息
  const fileInfos = userjsFiles.map((f) => {
    const stat = fs.statSync(path.join(distDir, f))
    const base = f.replace(/\.user\.js$/, '')
    const meta: { version?: string } = {}
    try {
      const metaPath = path.join(rootDir, 'src', base, 'meta.ts')
      if (fs.existsSync(metaPath)) {
        const content = fs.readFileSync(metaPath, 'utf8')
        // 简单提取 version
        const m = content.match(/['"]version['"]\s*:\s*['"]([^'"]+)['"]/)
        if (m)
          meta.version = m[1]
      }
    }
    catch {}
    const version = meta.version || ''
    // 只有版本变化才更新时间
    let mtime = stat.mtime
    if (versionCache[f] && versionCache[f] === version) {
      // 版本没变，读取缓存时间
      if (versionCache[`${f}__mtime`]) {
        mtime = new Date(versionCache[`${f}__mtime`])
      }
    }
    else {
      // 版本变了，更新缓存
      versionCache[f] = version
      versionCache[`${f}__mtime`] = stat.mtime.toISOString()
      cacheChanged = true
    }
    return {
      name: f,
      size: stat.size,
      sizeStr: formatSize(stat.size),
      mtime,
      mtimeStr: formatDate(mtime),
      day: formatDay(mtime),
      desc: readMetaDescription(path.join(rootDir, 'src'), base) || '（无描述）',
      version,
    }
  }).sort((a, b) => a.name.localeCompare(b.name, 'en'))

  if (cacheChanged)
    writeVersionCache(cachePath, versionCache)

  const totalSize = formatSize(fileInfos.reduce((sum, f) => sum + f.size, 0))

  // shields.io
  const badge = (label: string, message: string, color = 'blue', logo = '') => {
    let url = `https://img.shields.io/badge/${encodeURIComponent(label)}-${encodeURIComponent(message)}-${color}`
    if (logo)
      url += `?logo=${encodeURIComponent(logo)}`
    return `![${label}: ${message}](${url})`
  }

  // 生成表格行
  const tableRows = fileInfos.map(f =>
    `| ${f.name} | ${f.desc.replace(/\n+/g, ' ')} | ${badge('version', f.version, 'informational')} | ${f.sizeStr} | ${f.mtimeStr} | [下载](./scripts/${f.name}) | [预览](./scripts/${f.name}) |`,
  ).join('\n')

  // 按日期分组生成最近更新列表
  const updatesByDay = fileInfos.reduce<Record<string, { name: string, desc: string }[]>>((acc, cur) => {
    if (!acc[cur.day])
      acc[cur.day] = []
    acc[cur.day].push({ name: cur.name, desc: cur.desc.replace(/\n+/g, ' ') })
    return acc
  }, {})

  const updatesMd = Object.entries(updatesByDay)
    .sort((a, b) => b[0].localeCompare(a[0])) // 最新日期在前
    .map(([day, infos]) => {
      const items = infos.map(i => `- \`${i.name}\` — ${i.desc}`).join('\n')
      return `**${day}**\n${items}`
    })
    .join('\n\n')

  const md = `# 🛠 Userscripts 列表

${badge('脚本数量', String(fileInfos.length), 'success', 'code')}
${badge('总大小', totalSize, 'orange', 'files')}
> 本表自动生成于 ${formatDate(new Date())} ，请勿手动修改。

| 脚本 | 描述 | 版本 | 大小 | 更新时间 | 下载 | 预览 |
|------|------|------|------|----------|-------|-------|
${tableRows}

---

## 🗓 最近更新

${updatesMd}
`

  fs.writeFileSync(path.join(rootDir, 'README.md'), md, { encoding: 'utf8' })
}

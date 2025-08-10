import fs from 'node:fs'
import * as path from 'node:path'
import { readMetaDescription } from './readMetaDescription.js'

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

  const fileInfos = userjsFiles.map((f) => {
    const stat = fs.statSync(path.join(distDir, f))
    const base = f.replace(/\.user\.js$/, '')
    return {
      name: f,
      size: stat.size,
      sizeStr: formatSize(stat.size),
      mtime: stat.mtime,
      mtimeStr: formatDate(stat.mtime),
      day: formatDay(stat.mtime),
      desc: readMetaDescription(path.join(rootDir, 'src'), base) || '（无描述）',
    }
  }).sort((a, b) => a.name.localeCompare(b.name, 'en'))

  const totalSize = formatSize(fileInfos.reduce((sum, f) => sum + f.size, 0))

  // 生成表格行
  const tableRows = fileInfos.map(f =>
    `| \`${f.name}\` | ${f.desc.replace(/\n+/g, ' ')} | ${f.sizeStr} | ${f.mtimeStr} | [下载](./scripts/${f.name}) | [预览](./scripts/${f.name}) |`,
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

共收录 **${fileInfos.length} 个脚本**，总大小约 **${totalSize}**  
> 本表自动生成于 ${formatDate(new Date())} ，请勿手动修改。

| 文件名 | 描述 | 大小 | 更新时间 | 下载 | 预览 |
|--------|------|------|----------|-------|-------|
${tableRows}

---

## 🗓 最近更新

${updatesMd}
`

  fs.writeFileSync(path.join(rootDir, 'README.md'), md, { encoding: 'utf8' })
}

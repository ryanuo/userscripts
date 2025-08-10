import fs from 'node:fs'
import * as path from 'node:path'
import { readMetaDescription } from './readMetaDescription.js'

export function genReadme(distDir: string, rootDir: string) {
  const userjsFiles = fs.readdirSync(distDir).filter(f => f.endsWith('.user.js'))
  const fileInfos = userjsFiles.map((f) => {
    const stat = fs.statSync(path.join(distDir, f))
    const base = f.replace(/\.user\.js$/, '')
    return {
      name: f,
      size: `${(stat.size / 1024).toFixed(1)} KB`,
      mtime: stat.mtime.toLocaleString(),
      desc: readMetaDescription(path.join(rootDir, 'src'), base),
    }
  })
  const md = `# Userscripts 列表\n\n| 文件名 | 描述 | 大小 | 更新时间 | 下载 | 预览 |\n|--------|------|------|----------|-------|-------|\n${fileInfos.map(f => `| ${f.name} | ${f.desc} | ${f.size} | ${f.mtime} | [下载](./scripts/${f.name}) | [预览](./scripts/${f.name}) |`).join('\n')}\n`
  fs.writeFileSync(path.join(rootDir, 'README.md'), md, { encoding: 'utf8' })
}

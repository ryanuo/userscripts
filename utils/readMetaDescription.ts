import fs from 'node:fs'
import * as path from 'node:path'

export function readMetaDescription(srcDir: string, name: string): string {
  const metaPath = path.join(srcDir, name, 'meta.ts')
  if (!fs.existsSync(metaPath))
    return ''
  const content = fs.readFileSync(metaPath, 'utf8')
  // 简单正则提取 description 字段
  const match = content.match(/['"]description['"]\s*:\s*['"]([^'"]+)['"]/)
  return match ? match[1] : ''
}

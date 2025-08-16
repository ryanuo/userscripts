import * as fs from 'node:fs'
import * as path from 'node:path'

// 同步版本 - 使用fs读取文件方式
export function readMetaDescriptionSync(srcDir: string, name: string): string {
  const metaPath = path.join(srcDir, name, 'meta.ts')

  // 检查文件是否存在
  if (!fs.existsSync(metaPath)) {
    return ''
  }

  // 读取文件内容并简单解析
  const content = fs.readFileSync(metaPath, 'utf-8')

  // 简单的正则匹配提取description
  const defaultDescMatch = content.match(/export\s+default\s*\{[^}]*description:\s*['"]([^'"]*)['"]/)
  if (defaultDescMatch) {
    return defaultDescMatch[1]
  }

  const descMatch = content.match(/description:\s*['"]([^'"]*)['"]/)
  if (descMatch) {
    return descMatch[1]
  }

  return ''
}

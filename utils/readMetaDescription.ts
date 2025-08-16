import fs from 'node:fs'
import path from 'node:path'

// 通用接口，增强类型安全
interface MetaObject {
  [key: string]: string | number | boolean | null | undefined
}

/**
 * 读取 meta.ts 中指定字段的值
 * @param srcDir 源目录
 * @param name 子目录
 * @param field 字段名
 * @returns 字段值（字符串）
 */
export function readMetaField(srcDir: string, name: string, field: string): string {
  const metaPath = path.join(srcDir, name, 'meta.ts')
  if (!fs.existsSync(metaPath))
    return ''

  const content = fs.readFileSync(metaPath, 'utf8')
  const lines = content.split(/\r?\n/).map(l => l.replace(/\/\/.*$/, '').trim()).filter(Boolean)

  const obj: MetaObject = {}
  let insideExport = false
  let currentKey = ''
  let multiLineValue: string[] = []
  let multiLineQuote: '`' | null = null

  for (const line of lines) {
    if (!insideExport) {
      if (/^export\s+default\s*\{/.test(line))
        insideExport = true
      continue
    }
    if (line.includes('}'))
      break

    // 多行反引号处理
    if (multiLineQuote) {
      multiLineValue.push(line)
      if (line.endsWith(multiLineQuote)) {
        obj[currentKey] = multiLineValue.join('\n').slice(1, -1)
        multiLineQuote = null
        multiLineValue = []
        currentKey = ''
      }
      continue
    }

    // 匹配 key: value
    // eslint-disable-next-line regexp/no-super-linear-backtracking
    const kvMatch = line.match(/^(\w+)\s*:\s*(.+?),?$/)
    if (!kvMatch)
      continue

    const [_, key, rawValue] = kvMatch
    const value = rawValue.trim()

    // 多行反引号开始
    if (value.startsWith('`') && !value.endsWith('`')) {
      multiLineQuote = '`'
      currentKey = key
      multiLineValue.push(value)
      continue
    }

    obj[key] = parseValue(value)
  }

  return typeof obj[field] === 'string' ? obj[field] : String(obj[field] ?? '')
}

/**
 * 解析单个值字符串为对应类型
 */
function parseValue(valueStr: string): string | number | boolean | null {
  if ((valueStr.startsWith('"') && valueStr.endsWith('"'))
    || (valueStr.startsWith('\'') && valueStr.endsWith('\''))) {
    return valueStr.slice(1, -1)
  }
  if (valueStr === 'true')
    return true
  if (valueStr === 'false')
    return false
  if (valueStr === 'null')
    return null
  const num = Number(valueStr)
  if (!Number.isNaN(num))
    return num
  return valueStr
}

/**
 * 简单获取 description 字段
 */
export function readMetaDescription(srcDir: string, name: string): string {
  return readMetaField(srcDir, name, 'description')
}

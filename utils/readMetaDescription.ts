import fs from 'node:fs'
import path from 'node:path'

// 通用接口
interface MetaObject {
  [key: string]: string | number | boolean | null | undefined
}

/**
 * 解析 meta.ts 并返回指定字段的原始类型
 * @param srcDir 源目录
 * @param name 子目录
 * @param field 字段名
 */
export function readMetaField(srcDir: string, name: string, field: string): string | number | boolean | null {
  const metaPath = path.join(srcDir, name, 'meta.ts')
  if (!fs.existsSync(metaPath))
    return ''

  const content = fs.readFileSync(metaPath, 'utf8')
  const lines = content
    .split(/\r?\n/)
    .map(l => l.replace(/\/\/.*$/, '').trim())
    .filter(Boolean)

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

    // 检测对象结束
    if (line.includes('}'))
      break

    // 多行反引号
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

    // 匹配 key: value，支持单/双引号和中划线
    // eslint-disable-next-line regexp/no-super-linear-backtracking
    const kvMatch = line.match(/^['"]?([\w-]+)['"]?\s*:\s*(.+?),?$/)
    if (!kvMatch)
      continue

    const [, key, rawValue] = kvMatch
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

  return obj[field] ?? ''
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
 * 简单获取 description
 */
export function readMetaDescription(srcDir: string, name: string): string {
  const val = readMetaField(srcDir, name, 'description')
  return typeof val === 'string' ? val : String(val ?? '')
}

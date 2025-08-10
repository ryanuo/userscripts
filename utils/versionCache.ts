// 记录每个脚本的版本号，避免无版本变更时更新时间字段变化
import fs from 'node:fs'

export interface ScriptVersionCache {
  [filename: string]: string // filename: version
}

export function readVersionCache(cachePath: string): ScriptVersionCache {
  if (!fs.existsSync(cachePath))
    return {}
  try {
    return JSON.parse(fs.readFileSync(cachePath, 'utf8'))
  }
  catch {
    return {}
  }
}

export function writeVersionCache(cachePath: string, cache: ScriptVersionCache) {
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8')
}

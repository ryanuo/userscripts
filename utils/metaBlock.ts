export function metaBlock(meta: Record<string, any>): string {
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

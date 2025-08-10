import fs from 'node:fs'
import { ESLint } from 'eslint'

export async function writeWrapped(metaStr: string, code: string, output: string) {
  const wrapped = `(() => {\n'use strict';\n${code}\n})();`
  const eslint = new ESLint({ fix: true })
  const [{ output: formatted }] = await eslint.lintText(`${metaStr}\n${wrapped}`, { filePath: output })
  fs.writeFileSync(output, formatted || `${metaStr}\n${wrapped}`, { encoding: 'utf8' })
}

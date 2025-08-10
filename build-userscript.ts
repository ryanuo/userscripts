// 拼接 meta block 并输出 userscript
import fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { genIndexHtml } from './utils/genIndexHtml.js'
import { genReadme } from './utils/genReadme.js'
import { metaBlock } from './utils/metaBlock.js'
import { writeWrapped } from './utils/writeWrapped.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '.')
const srcDir = path.join(rootDir, 'src')
const distDir = path.join(rootDir, 'scripts')

const subdirs = fs.readdirSync(srcDir).filter((name) => {
  const full = path.join(srcDir, name)
  return fs.statSync(full).isDirectory()
})

let found = false;
(async () => {
  for (const dir of subdirs) {
    const metaPath = path.join(srcDir, dir, 'meta.ts')
    const mjsPath = path.join(distDir, `${dir}.mjs`)
    const output = path.join(distDir, `${dir}.user.js`)
    if (fs.existsSync(metaPath) && fs.existsSync(mjsPath)) {
      try {
        const meta = (await import(metaPath.replace(/\\/g, '/'))).default
        const code = fs.readFileSync(mjsPath, 'utf8')
        const metaStr = metaBlock(meta)
        await writeWrapped(metaStr, code, output)
        // eslint-disable-next-line no-console
        console.log('UserScript 构建完成:', output)
        // 删除 .mjs 文件
        try {
          fs.unlinkSync(mjsPath)
          // eslint-disable-next-line no-console
          console.log('已删除:', mjsPath)
        }
        catch (err) {
          console.warn('删除 .mjs 失败:', mjsPath, err)
        }
        found = true
      }
      catch (e) {
        console.error('meta 读取失败:', metaPath, e)
      }
    }
  }
  if (!found) {
    console.warn('未发现可用的 userscript 子目录或未编译 mjs 文件')
  }

  // 生成 index.html 预览页面
  genIndexHtml(distDir, rootDir)
  // 生成 README.md
  genReadme(distDir, rootDir)
})()

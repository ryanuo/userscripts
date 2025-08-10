import fs from 'node:fs'
import path from 'node:path'

function getEntries() {
  const srcDir = path.resolve(__dirname, 'src')
  const entries: any = []
  for (const dir of fs.readdirSync(srcDir)) {
    const indexPath = path.join(srcDir, dir, 'index.ts')
    if (fs.existsSync(indexPath)) {
      const name = dir
      entries.push({
        input: `./src/${dir}/index`,
        name,
        format: ['esm'],
      })
    }
  }
  return entries
}

export default {
  entries: await getEntries(),
  outDir: 'scripts',
  declaration: false,
  clean: true,
  rollup: {
    esbuild: {
      charset: 'utf8',
    },
  },
}

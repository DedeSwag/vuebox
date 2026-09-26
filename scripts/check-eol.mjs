import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, lstatSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const fix = process.argv.includes('--fix')
const git = (args, input) => execFileSync('git', args, { cwd: root, input, encoding: 'utf8' })
const paths = [...new Set(git(['ls-files', '-c', '-o', '--exclude-standard', '-z']).split('\0').filter(Boolean))]
// Git 标记为 -text（包括 binary 宏）的文件不参与转换。
const attributes = paths.length ? git(['check-attr', '-z', '--stdin', 'text'], `${paths.join('\0')}\0`).split('\0') : []
const binary = new Set()
for (let i = 0; i + 2 < attributes.length; i += 3) {
  if (attributes[i + 2] === 'unset') binary.add(attributes[i])
}
const decoder = new TextDecoder('utf-8', { fatal: true })
let checked = 0, invalid = 0
for (const path of paths) {
  if (binary.has(path)) continue
  const absolute = fileURLToPath(new URL(path.split('/').map(encodeURIComponent).join('/'), new URL('../', import.meta.url)))
  try { if (!lstatSync(absolute).isFile()) continue } catch (error) {
    if (error.code === 'ENOENT') continue // 已删除但尚未提交的文件。
    throw error
  }
  const bytes = readFileSync(absolute)
  if (bytes.includes(0)) continue
  try { decoder.decode(bytes) } catch { continue } // 非 UTF-8 内容不自动改写。
  const text = bytes.toString('utf8') // 保留原文件的 UTF-8 BOM。
  checked++
  if (!/(?<!\r)\n|\r(?!\n)/.test(text) && (!text.length || text.endsWith('\r\n'))) continue
  invalid++
  if (fix) {
    const normalized = text.replace(/\r\n|\r|\n/g, '\r\n')
    writeFileSync(absolute, normalized.endsWith('\r\n') ? normalized : `${normalized}\r\n`, 'utf8')
  }
  console.log(`${fix ? '已修复' : '行尾不符合 CRLF 规范'}：${path}`)
}
console.log(`检查 ${checked} 个 UTF-8 文本文件，${fix ? '修复' : '发现'} ${invalid} 个行尾问题。`)
if (invalid && !fix) {
  console.error('请运行 npm run fix:eol 后重新检查。')
  process.exitCode = 1
}

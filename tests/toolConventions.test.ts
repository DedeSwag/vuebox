import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { effectScope, ref } from 'vue'
import { parse } from '@vue/compiler-sfc'
import { useManualResult } from '../src/composables/useManualResult.ts'

const root = fileURLToPath(new URL('../', import.meta.url))
function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? files(path) : [path]
  })
}

test('工具界面颜色只在主题文件集中定义，组件样式使用 components 层', () => {
  for (const file of files(join(root, 'src'))) {
    if (!/\.(css|vue)$/.test(file) || /(?:theme\.css|HotpotCalculator\.vue)$/.test(file)) continue
    const source = readFileSync(file, 'utf8')
    const styles = file.endsWith('.vue') ? parse(source).descriptor.styles.map(style => style.content) : [source]
    for (const style of styles) {
      assert.doesNotMatch(style, /#[\da-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(|:\s*(?:white|black|red|green|blue|purple)\b/i, relative(root, file))
      if (file.endsWith('.vue') || /(?:toolkit|time-tools|encoding-tools)\.css$/.test(file)) {
        assert.match(style, /@layer components\s*\{/, relative(root, file))
      }
    }
  }
  const main = readFileSync(join(root, 'src/main.ts'), 'utf8')
  assert.ok(main.indexOf("import './style.css'") < main.indexOf("import router"), '先初始化样式层顺序，再加载包含组件样式的路由')
})

test('手动结果：初始化、输入与选项改变均不执行计算；点击后生成并立即失效旧结果', () => {
  const scope = effectScope()
  const input = ref('示例'), mode = ref('encode')
  let runs = 0
  const action = scope.run(() => useManualResult([input, mode], () => {
    runs++
    return { output: `${mode.value}:${input.value}` }
  }, () => ({ output: '' })))!
  assert.equal(runs, 0)
  input.value = '新输入'
  assert.equal(runs, 0)
  action.execute()
  assert.equal(action.result.value.output, 'encode:新输入')
  assert.equal(runs, 1)
  mode.value = 'decode'
  assert.equal(action.result.value.output, '')
  assert.equal(runs, 1)
  action.execute()
  assert.equal(action.result.value.output, 'decode:新输入')
  input.value = ''
  assert.equal(action.result.value.output, '')
  assert.equal(runs, 2)
  action.reset()
  assert.equal(runs, 2)
  scope.stop()
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { largeJsonFixture } from './largeJsonFixture.ts'
import {
  flattenJsonTree,
  treeWindow,
  treeLiteral,
} from '../src/utils/jsonTree.ts'
import {
  readJson,
  renderJson,
  unescapeJson,
  highlightJson,
} from '../src/utils/json.ts'

test('格式化与压缩保留结构、字符串空白及 Tab 缩进', () => {
  const text = '{ "a": [1,true,null], "b":"a  b" }'
  const document = readJson(text)
  assert.equal(document.error, undefined)
  assert.equal(renderJson(document, ''), '{"a":[1,true,null],"b":"a  b"}')
  assert.ok(renderJson(document, '\t').includes('\n\t"a": [\n\t\t1,'))
  assert.deepEqual(JSON.parse(renderJson(document, '    ')), JSON.parse(text))
})

test('数字、顺序、重复键和危险属性名无损保留', () => {
  const text =
    '{"id":9007199254740993,"id":1.234567890123456789,"10":1e400,"2":-0,"__proto__":{"x":1}}'
  assert.equal(renderJson(readJson(renderJson(readJson(text), '  ')), ''), text)
  assert.equal(({} as Record<string, unknown>).x, undefined)
})

test('识别带外层引号、无外层引号以及多层转义 JSON', () => {
  const text = '{"a":"中文","nested":[true,null]}'
  for (const input of [
    JSON.stringify(text),
    JSON.stringify(text).slice(1, -1),
    JSON.stringify(JSON.stringify(text)),
  ]) {
    const parsed = readJson(input)
    assert.equal(parsed.decoded, true)
    assert.equal(renderJson(parsed, ''), text)
  }
  assert.equal(readJson(JSON.stringify(text), false).root?.type, 'string')
})

test('根节点基本类型与空容器不会被误判或丢失', () => {
  for (const text of ['null', 'false', '0', '"hello"', '""', '{}', '[]']) {
    assert.equal(renderJson(readJson(text), ''), text)
  }
  assert.equal(readJson('  ').root, undefined)
})

test('中文错误位置精确，拒绝注释、尾逗号、单引号等非法 JSON', () => {
  const parsed = readJson('{\n  "a" 1\n}')
  assert.equal(parsed.error?.line, 2)
  assert.equal(parsed.error?.column, 7)
  assert.match(parsed.error!.message, /冒号/)
  for (const text of [
    '{"a":1,}',
    '[1,]',
    "{'a':1}",
    '{/*x*/"a":1}',
    '{"a":undefined}',
    '[NaN]',
    '[01]',
    '[1.]',
    '[1e]',
    '{"x":"a\nb"}',
    '{"x":"\\q"}',
    '{} {}',
    '{',
    '[',
    '"x',
  ]) {
    assert.ok(readJson(text, false).error, text)
  }
  const crlf = readJson('{\r\n"a" 1}')
  assert.equal(crlf.error?.line, 2)
  assert.equal(crlf.error?.column, 5)
})

test('转义及反转义往返保留引号、反斜杠、中文、换行', () => {
  const text = '{"路径":"C:\\test","内容":"你好"}\n'
  assert.equal(unescapeJson(JSON.stringify(text)), text)
  assert.equal(unescapeJson(JSON.stringify(text).slice(1, -1)), text)
  assert.equal(unescapeJson('"hello\\nworld"'), 'hello\nworld')
  assert.throws(() => unescapeJson('{"a":1}'))
})

test('解码后的错误明确关联到解码后的文本', () => {
  const parsed = readJson(JSON.stringify('{\n"a":\n}'))
  assert.equal(parsed.decoded, true)
  assert.equal(parsed.error?.line, 3)
})

test('高亮区分类型，HTML 注入文本只作为内容展示', () => {
  const html = highlightJson(
    '{"key":"<img src=x onerror=alert(1)>","n":-2.5e+2,"ok":true,"nil":null}',
  )
  for (const kind of ['key', 'string', 'number', 'boolean', 'null'])
    assert.ok(html.includes(`class="json-${kind}"`))
  assert.ok(!html.includes('<img'))
  assert.ok(html.includes('&lt;img'))
  assert.ok(
    !highlightJson('</pre><script>alert(1)</script>').includes('<script>'),
  )
})

test('超长和超深文本返回错误，字符串中的括号不计深度', () => {
  assert.match(readJson(' '.repeat(1_000_001)).error!.message, /100 万/)
  assert.match(
    readJson('['.repeat(129) + '0' + ']'.repeat(129)).error!.message,
    /128/,
  )
  assert.equal(
    readJson(JSON.stringify('['.repeat(150)), false).error,
    undefined,
  )
})
test('长 JSON 的全部节点可访问，窗口渲染量不随节点总数增长', () => {
  const source = largeJsonFixture()
  const parsed = readJson(source)
  assert.equal(parsed.error, undefined)
  const rows = flattenJsonTree(parsed.root!, true, new Set())
  assert.ok(rows.length > 9000)
  assert.equal(new Set(rows.map((row) => row.id)).size, rows.length)
  for (const position of [0, 10000, rows.length * 28 - 400]) {
    const window = treeWindow(rows.length, position, 400)
    assert.ok(window.end - window.start <= 27)
    assert.ok(window.start >= 0 && window.end <= rows.length)
  }
  const end = treeWindow(rows.length, rows.length * 28 - 400, 400)
  assert.equal(end.end, rows.length)
  assert.equal(rows.at(-1)?.closing, true)
  assert.equal(flattenJsonTree(parsed.root!, false, new Set()).length, 1)
})

test('局部折叠不遗漏兄弟节点，重新展开恢复完整顺序', () => {
  const root = readJson('{"a":[1,{"child":2}],"b":3}').root!
  const array = root.children![0]!.children![1]!
  const all = flattenJsonTree(root, true, new Set())
  const collapsed = flattenJsonTree(root, true, new Set([array.offset]))
  assert.equal(collapsed.find((row) => row.name === 'a')?.open, false)
  assert.ok(collapsed.some((row) => row.name === 'b'))
  assert.ok(!collapsed.some((row) => row.name === 'child'))
  const openedRoot = flattenJsonTree(root, false, new Set([root.offset]))
  assert.equal(openedRoot.length, 4)
  assert.deepEqual(flattenJsonTree(root, true, new Set()), all)
})

test('超长字符串预览有界但源内容完整保留', () => {
  const source = JSON.stringify('长文本'.repeat(2000))
  const row = flattenJsonTree(
    readJson(source, false).root!,
    true,
    new Set(),
  )[0]!
  assert.equal(treeLiteral(row, source).length, 241)
  assert.equal(
    source.slice(row.node.offset, row.node.offset + row.node.length),
    source,
  )
})

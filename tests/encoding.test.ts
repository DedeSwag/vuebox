import assert from 'node:assert/strict'
import test from 'node:test'
import { decodeBase64, encodeBase64, decodeEscape, encodeEscape, generateUuids } from '../src/utils/encoding.ts'

test('Base64 标准向量和 UTF-8 往返，保留 BOM、换行、空白和 Emoji', () => {
  for (const [text, expected] of [['', ''], ['f', 'Zg=='], ['fo', 'Zm8='], ['foo', 'Zm9v'], ['foobar', 'Zm9vYmFy']]) {
    assert.equal(encodeBase64(text!, 'standard'), expected)
    assert.equal(decodeBase64(expected!, 'standard'), text)
  }
  for (const text of ['中文 👋', '\ufeff保留 BOM', ' \r\n\t ', 'a'.repeat(20000)]) {
    for (const mode of ['standard', 'url'] as const)
      assert.equal(decodeBase64(encodeBase64(text, mode), mode), text)
  }
  assert.equal(decodeBase64(' Z g = = \n', 'standard'), 'f')
  assert.equal(decodeBase64('Zm8', 'standard'), 'fo')
})

test('Base64URL 字符表与填充；拒绝非法字符、位数、尾部位及非 UTF-8', () => {
  const standard = encodeBase64('😀\uffff', 'standard')
  const url = encodeBase64('😀\uffff', 'url')
  assert.equal(url, standard.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''))
  assert.match(url, /[_-]/)
  assert.throws(() => decodeBase64(standard, 'url'))
  assert.throws(() => decodeBase64(url, 'standard'))
  for (const text of ['a', 'Zg=', 'Zg===', 'Z=g=', '!!!!', 'Zh==', '/w=='])
    assert.throws(() => decodeBase64(text, 'standard'), /Base64|UTF-8/)
  assert.throws(() => encodeBase64('\ud800', 'standard'), /Unicode/)
})

test('HTML 单层转义与实体解码不会执行 HTML，校验非法数字实体', () => {
  const text = '<script title="test">alert(\'中文\') & 😀</script>'
  const encoded = encodeEscape(text, 'html')
  assert.ok(!encoded.includes('<'))
  assert.equal(decodeEscape(encoded, 'html'), text)
  assert.equal(decodeEscape('&amp;lt;', 'html'), '&lt;')
  assert.equal(decodeEscape('&#x1f600;&#128512;&nbsp;', 'html'), '😀😀\u00a0')
  for (const entity of ['&#0;', '&#xD800;', '&#1114112;', '&unknown;']) assert.throws(() => decodeEscape(entity, 'html'))
})

test('Unicode / JSON 转义往返控制字符、引号、反斜杠和代理对', () => {
  const input = '中文 😀\n\t"\\'
  const encoded = encodeEscape(input, 'unicode')
  assert.ok(encoded.includes('\\u4e2d'))
  assert.ok(encoded.includes('\\ud83d\\ude00'))
  assert.equal(decodeEscape(encoded, 'unicode'), input)
  for (const text of ['\\u12', '\\x41', 'raw\nline', 'raw"quote']) assert.throws(() => decodeEscape(text, 'unicode'), /转义格式/)
})

test('UTF-8 十六进制往返、忽略分隔空白并拒绝损坏字节', () => {
  assert.equal(encodeEscape('中', 'hex'), 'e4 b8 ad')
  assert.equal(decodeEscape('E4B8AD', 'hex'), '中')
  assert.equal(decodeEscape('e4\nb8\tad', 'hex'), '中')
  for (const text of ['', '中文 😀', '\ufeff hi\n']) assert.equal(decodeEscape(encodeEscape(text, 'hex'), 'hex'), text)
  for (const text of ['f', '0xff', 'gg', 'ff', 'e4b8']) assert.throws(() => decodeEscape(text, 'hex'))
})

test('UUID 批量生成具有 v4 版本位、正确变体，拒绝无效数量', () => {
  const ids = generateUuids(1000)
  assert.equal(ids.length, 1000)
  assert.equal(new Set(ids).size, 1000)
  for (const id of ids) assert.match(id, /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/)
  for (const count of [0, -1, 1001, 1.5, NaN, Infinity]) assert.throws(() => generateUuids(count), /1–1000/)
})

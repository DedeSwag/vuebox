import assert from 'node:assert/strict'
import test from 'node:test'
import { decodeBase64, encodeBase64, generateUuids } from '../src/utils/encoding.ts'

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

test('UUID 批量生成具有 v4 版本位、正确变体，拒绝无效数量', () => {
  const ids = generateUuids(1000)
  assert.equal(ids.length, 1000)
  assert.equal(new Set(ids).size, 1000)
  for (const id of ids) assert.match(id, /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/)
  for (const count of [0, -1, 1001, 1.5, NaN, Infinity]) assert.throws(() => generateUuids(count), /1–1000/)
})

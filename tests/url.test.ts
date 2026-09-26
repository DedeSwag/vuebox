import assert from 'node:assert/strict'
import test from 'node:test'
import { encodeText, decodeText } from '../src/utils/url.ts'

test('普通与表单编码区分空格、加号、保留字符并往返 Unicode', () => {
  assert.equal(encodeText("a b+c!~'()", 'component'), "a%20b%2Bc!~'()")
  assert.equal(encodeText("a b+c!~'()", 'form'), 'a+b%2Bc%21%7E%27%28%29')
  assert.equal(decodeText('a+b%2Bc', 'component'), 'a+b+c')
  assert.equal(decodeText('a+b%2Bc', 'form'), 'a b+c')
  for (const mode of ['component', 'form'] as const) {
    for (const text of ['', '中文 😀 & = # ? / + %', 'line\nnext'])
      assert.equal(decodeText(encodeText(text, mode), mode), text)
    for (const text of ['%', '%GG', '%E4%B8', '%FF']) assert.throws(() => decodeText(text, mode), URIError)
    assert.throws(() => encodeText('\uD800', mode), URIError)
  }
})

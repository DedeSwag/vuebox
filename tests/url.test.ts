import assert from 'node:assert/strict'
import test from 'node:test'
import { parseUrl, rebuildQuery, encodeText, decodeText } from '../src/utils/url.ts'

test('解析完整地址、IPv6、国际化域名及默认端口', () => {
  const { url, error } = parseUrl('https://example.com:8080/path?q=中文#section')
  assert.equal(error, '')
  assert.equal(url?.protocol, 'https:')
  assert.equal(url?.hostname, 'example.com')
  assert.equal(url?.port, '8080')
  assert.equal(url?.pathname, '/path')
  assert.equal(url?.searchParams.get('q'), '中文')
  assert.equal(url?.hash, '#section')
  assert.equal(parseUrl('https://[::1]:443/').url?.port, '')
  assert.ok(parseUrl('https://例子.中国/路径').url?.hostname.startsWith('xn--'))
  assert.equal(parseUrl('mailto:user@example.com').url?.protocol, 'mailto:')
})

test('非法 URL 给出中文错误，空输入不报错', () => {
  for (const text of ['example.com', '/relative', 'https:example.com', 'https:///path', 'https://', 'https://example.com:99999', 'https://[::1', 'https://a b.com', 'https://a.com/%GG', 'https://a.com/\npath', 'https://a.com/\\path']) {
    const result = parseUrl(text)
    assert.equal(result.url, null, text)
    assert.match(result.error, /[\u4e00-\u9fff]/, text)
  }
  assert.deepEqual(parseUrl('  '), { url: null, error: '' })
})

test('编辑保留重复键、空键值、顺序、凭证、路径和 hash，安全编码分隔符', () => {
  const url = new URL('https://user:pass@example.com:8080/a%2Fb?old=1#keep?x=1')
  const entries = [{ key: 'tag', value: '中文 空格' }, { key: 'tag', value: '+&=#?' }, { key: '', value: '' }, { key: 'empty', value: '' }]
  const result = new URL(rebuildQuery(url, entries))
  assert.deepEqual([...result.searchParams], entries.map(({ key, value }) => [key, value]))
  assert.equal(result.username, 'user')
  assert.equal(result.password, 'pass')
  assert.equal(result.pathname, '/a%2Fb')
  assert.equal(result.port, '8080')
  assert.equal(result.hash, '#keep?x=1')
  assert.equal(new URL(rebuildQuery(result, [])).search, '')
  assert.equal(url.search, '?old=1')
})

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

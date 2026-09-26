import assert from 'node:assert/strict'
import test from 'node:test'
import { generatePasswords, passwordCharacters, type PasswordOptions } from '../src/utils/password.ts'
import { imageDataUrl, parseImageBase64, maxImageBytes } from '../src/utils/imageBase64.ts'
import { filterHttpStatuses, httpStatuses } from '../src/utils/httpStatus.ts'
const defaults: PasswordOptions = { length: 20, count: 10, lowercase: true, uppercase: true, digits: true, symbols: true, excludeAmbiguous: false }

test('密码：批量长度、所选字符覆盖、排除易混淆字符', () => {
  const passwords = generatePasswords({ ...defaults, count: 100, excludeAmbiguous: true })
  assert.equal(passwords.length, 100)
  for (const password of passwords) {
    assert.equal(password.length, 20)
    assert.doesNotMatch(password, /[Il1O0o]/)
    for (const chars of Object.values(passwordCharacters)) assert.ok([...password].some(char => chars.includes(char)))
  }
  const digits = generatePasswords({ ...defaults, length: 128, lowercase: false, uppercase: false, symbols: false })
  for (const password of digits) assert.match(password, /^\d{128}$/)
})

test('密码：拒绝无效长度、数量和空字符集合', () => {
  for (const length of [0, 3, 129, 10.5, NaN]) assert.throws(() => generatePasswords({ ...defaults, length }), /长度/)
  for (const count of [0, 101, 1.5, NaN]) assert.throws(() => generatePasswords({ ...defaults, count }), /数量/)
  assert.throws(() => generatePasswords({ ...defaults, lowercase: false, uppercase: false, digits: false, symbols: false }), /至少/)
  for (const password of generatePasswords({ ...defaults, length: 4 })) {
    for (const chars of Object.values(passwordCharacters)) assert.ok([...password].some(char => chars.includes(char)))
  }
})

test('密码：随机索引拒绝超出均匀区间的值，不直接取模', t => {
  t.mock.method(globalThis.crypto, 'getRandomValues', (array: Uint32Array) => { array.fill(0xffffffff); array[1] = 9; return array })
  assert.deepEqual(generatePasswords({ ...defaults, count: 1, length: 4, lowercase: false, uppercase: false, symbols: false }), ['9999'])
})

test('图片 Base64：完整字节范围往返、Data URL 类型及无填充输入', () => {
  const bytes = Uint8Array.from({ length: 256 }, (_, i) => i)
  const data = imageDataUrl(bytes, 'image/png')
  const result = parseImageBase64(data, 'image/jpeg')
  assert.equal(result.mime, 'image/png')
  assert.deepEqual(result.bytes, bytes)
  assert.equal(result.dataUrl, data)
  const raw = data.split(',')[1]!.replace(/=+$/, '')
  assert.deepEqual(parseImageBase64(` \n${raw}\n`, 'image/png').bytes, bytes)
  assert.equal(parseImageBase64('data:image/vnd.microsoft.icon;base64,YQ==', '').mime, 'image/x-icon')
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="purple"/></svg>')
  assert.deepEqual(parseImageBase64(imageDataUrl(svg, 'image/svg+xml'), '').bytes, svg)
})

test('图片 Base64：拒绝损坏编码、非图片 MIME、空文件和过大文件', () => {
  for (const text of ['', 'A', 'Zg=', 'Zh==', '!!!!', 'data:text/html;base64,YQ==', 'data:image/png,hello'])
    assert.throws(() => parseImageBase64(text, 'image/png'))
  assert.throws(() => imageDataUrl(new Uint8Array(0), 'image/png'), /为空/)
  assert.throws(() => imageDataUrl(new Uint8Array(maxImageBytes + 1), 'image/png'), /5 MiB/)
  assert.throws(() => parseImageBase64('a'.repeat(8_000_001), 'image/png'), /输入过长/)
})

test('HTTP：编号、英文、中文及多关键词检索，与分类及常用筛选组合', () => {
  assert.deepEqual(filterHttpStatuses('404', 0, false).map(item => item.code), [404])
  assert.deepEqual(filterHttpStatuses('NOT FOUND', 4, false).map(item => item.code), [404])
  assert.deepEqual(filterHttpStatuses('限流', 0, true).map(item => item.code), [429])
  assert.deepEqual(filterHttpStatuses('404', 5, false), [])
  assert.ok(filterHttpStatuses('', 2, true).every(item => item.code >= 200 && item.code < 300 && item.common))
  assert.deepEqual(filterHttpStatuses('不存在的状态', 0, false), [])
  assert.equal(new Set(httpStatuses.map(item => item.code)).size, httpStatuses.length)
  assert.match(httpStatuses.find(item => item.code === 104)!.note, /临时.*2026-11-13/)
  assert.equal(httpStatuses.find(item => item.code === 418)!.name, '(Unused)')
})

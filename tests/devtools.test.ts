import test from 'node:test'
import assert from 'node:assert/strict'
import { largeJsonFixture } from './largeJsonFixture.ts'
import { compareText, diffReport } from '../src/utils/textDiff.ts'
import { decodeJwt, jwtTime, jwtTiming } from '../src/utils/jwt.ts'
import { testRegex } from '../src/utils/regex.ts'
import { digestBytes, hashAlgorithms } from '../src/utils/hash.ts'
import { processLines, type TextBatchOptions } from '../src/utils/textBatch.ts'
import { parseInteger, formatInteger } from '../src/utils/radix.ts'
import { parseColor, colorFormats, contrastRatio } from '../src/utils/color.ts'

const options = { trim: false, ignoreCase: false, normalizeEol: true }
test('差异：新增、删除、行号、行内修改和报告', () => {
  const result = compareText({
    left: 'a\nbefore\nc',
    right: 'a\nafter\nc\nd',
    options,
  })
  assert.deepEqual([result.added, result.removed, result.changes], [2, 1, 1])
  assert.deepEqual(
    result.rows.map((r) => r.kind),
    ['same', 'change', 'same', 'add'],
  )
  assert.equal(result.rows[1]?.leftLine, 2)
  assert.ok(result.rows[1]?.leftSpans?.some((s) => s.changed))
  assert.equal(diffReport(result), '- 2: before\n+ 2: after\n+ 4: d')
})
test('差异：空内容、末尾换行与比较选项保留原文', () => {
  assert.equal(compareText({ left: '', right: '', options }).rows.length, 0)
  assert.equal(compareText({ left: 'a', right: 'a\n', options }).added, 1)
  assert.equal(compareText({ left: 'a\r\nb', right: 'a\nb', options }).added, 0)
  assert.equal(
    compareText({
      left: 'a\r\nb',
      right: 'a\nb',
      options: { ...options, normalizeEol: false },
    }).changes,
    1,
  )
  const result = compareText({
    left: ' Hello ',
    right: 'hello',
    options: { ...options, trim: true, ignoreCase: true },
  })
  assert.equal(result.added, 0)
  assert.equal(result.rows[0]?.left, ' Hello ')
  assert.equal(result.rows[0]?.right, 'hello')
})
test('差异：随机行修改后，结果能恢复左右全部原文', () => {
  let seed = 12345
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed
  }
  for (let attempt = 0; attempt < 100; attempt++) {
    const a = Array.from({ length: (random() % 60) + 1 }, () =>
      String(random() % 12),
    )
    const b = a.slice()
    for (let i = 0; i < 10; i++)
      b.splice(random() % (b.length + 1), random() % 3, `new ${random() % 10}`)
    const result = compareText({
      left: a.join('\n'),
      right: b.join('\n'),
      options,
    })
    assert.deepEqual(
      result.rows.filter((r) => r.left !== undefined).map((r) => r.left),
      a,
    )
    assert.deepEqual(
      result.rows.filter((r) => r.right !== undefined).map((r) => r.right),
      b,
    )
    assert.deepEqual(
      result.rows.filter((r) => r.left !== undefined).map((r) => r.leftLine),
      a.map((_, i) => i + 1),
    )
  }
})
test('差异：大 JSON 和 5 万行数据，越界输入给出提示', () => {
  const original = largeJsonFixture()
  assert.equal(
    compareText({ left: original, right: original, options }).added,
    0,
  )
  const lines = Array.from({ length: 50000 }, (_, i) => `line ${i}`).join('\n')
  const result = compareText({
    left: lines,
    right: lines.replace('line 40000', 'changed 40000'),
    options,
  })
  assert.equal(result.changes, 1)
  assert.throws(
    () => compareText({ left: 'a'.repeat(1_000_001), right: '', options }),
    /100 万/,
  )
  assert.throws(
    () => compareText({ left: '\n'.repeat(50000), right: '', options }),
    /50,000/,
  )
})

const encode = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString('base64url')
test('JWT：中文内容、Bearer 前缀和未签名示例解码', () => {
  const jwt = decodeJwt(
    `Bearer ${encode({ alg: 'none' })}.${encode({ sub: '测试用户', exp: 123 })}.`,
  )
  assert.equal(jwt.payload.sub, '测试用户')
  assert.equal(jwt.header.alg, 'none')
  assert.equal(jwt.signature, '')
})
test('JWT：非法格式、数组载荷、非法编码和时间声明', () => {
  assert.throws(() => decodeJwt('a.b.c.d.e'), /JWE/)
  assert.throws(() => decodeJwt('a.b'), /三段/)
  assert.throws(() => decodeJwt(`${encode({})}.${encode([])}.`), /对象/)
  assert.throws(() => decodeJwt('A.A.'), /Base64URL/)
  assert.match(jwtTiming({ exp: 100 }, 100), /已超过/)
  assert.match(jwtTiming({ nbf: 101, exp: 200 }, 100), /尚未到达/)
  assert.match(jwtTiming({ exp: '200' }, 100), /无效/)
  assert.match(jwtTiming({ exp: 101 }, 100), /未验签/)
  assert.equal(jwtTime(0), '1970-01-01T00:00:00.000Z')
  assert.match(jwtTime(Infinity), /无效/)
})
test('正则：捕获组、命名组、替换和 Unicode 零宽匹配', () => {
  const result = testRegex({
    pattern: '(?<name>[a-z]+)=(\\d+)',
    flags: 'g',
    text: 'count=12 limit=50',
    replacement: '$<name>: $2',
  })
  assert.equal(result.replaced, 'count: 12 limit: 50')
  assert.deepEqual(result.matches[1]?.groups, ['limit', '50'])
  assert.equal(result.matches[1]?.named?.name, 'limit')
  const zero = testRegex({
    pattern: '(?=)',
    flags: 'gu',
    text: '😀a',
    replacement: '_',
  })
  assert.deepEqual(
    zero.matches.map((m) => m.index),
    [0, 2, 3],
  )
  assert.equal(zero.replaced, '_😀_a_')
})
test('正则：非全局、替换上下文、截断和错误提示', () => {
  assert.equal(
    testRegex({ pattern: 'a', flags: '', text: 'aa', replacement: 'b' })
      .replaced,
    'ba',
  )
  assert.equal(
    testRegex({ pattern: 'b', flags: '', text: 'abc', replacement: "$`-$'" })
      .replaced,
    'aa-cc',
  )
  assert.equal(
    testRegex({
      pattern: 'a',
      flags: 'g',
      text: 'a'.repeat(1001),
      replacement: 'b',
    }).truncated,
    true,
  )
  assert.throws(
    () => testRegex({ pattern: '[', flags: 'g', text: '', replacement: '' }),
    /语法错误/,
  )
  assert.throws(
    () => testRegex({ pattern: 'a', flags: 'gg', text: '', replacement: '' }),
    /不能重复/,
  )
  const text = 'a'.padEnd(100, ' ').repeat(900)
  assert.equal(
    testRegex({ pattern: 'a', flags: 'g', text, replacement: 'b' }).replaced,
    text.replaceAll('a', 'b'),
  )
})
test('哈希：空字符串和 abc 标准摘要向量', async () => {
  const bytes = new TextEncoder().encode('abc').buffer
  assert.equal(
    await digestBytes(bytes, 'SHA-256'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  )
  assert.equal(
    await digestBytes(new ArrayBuffer(0), 'SHA-256'),
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  )
  const lengths = [64, 96, 128, 40]
  for (const [i, algorithm] of hashAlgorithms.entries())
    assert.equal((await digestBytes(bytes, algorithm)).length, lengths[i])
})
const batch: TextBatchOptions = {
  trim: true,
  removeEmpty: true,
  dedupe: true,
  ignoreCase: false,
  sort: 'none',
  numeric: true,
  casing: 'none',
  prefix: '',
  suffix: '',
}
test('文本批处理：去重顺序、自然排序、命名与前后缀', () => {
  assert.deepEqual(processLines(' b \r\na\r\nb\r\n\r\n', batch), {
    text: 'b\na',
    before: 5,
    after: 2,
  })
  assert.equal(
    processLines('item10\nitem2\nITEM2', {
      ...batch,
      ignoreCase: true,
      sort: 'asc',
      prefix: '[',
      suffix: ']',
    }).text,
    '[item2]\n[item10]',
  )
  assert.equal(
    processLines('HTTPServer\nuser_name', { ...batch, casing: 'camel' }).text,
    'httpServer\nuserName',
  )
  assert.equal(
    processLines('HTTPServer', { ...batch, casing: 'snake' }).text,
    'http_server',
  )
  assert.equal(processLines('', batch).after, 0)
})
test('进制：超长整数所有进制往返、前缀与非法字符', () => {
  const value = -1234567890123456789012345678901234567890n
  for (let base = 2; base <= 36; base++)
    assert.equal(parseInteger(formatInteger(value, base, true), base), value)
  assert.equal(parseInteger('-0xFF_FF', 16), -65535n)
  assert.equal(parseInteger('+0b101', 2), 5n)
  assert.equal(parseInteger('0o77', 8), 63n)
  assert.throws(() => parseInteger('102', 2), /不属于/)
  assert.throws(() => parseInteger('1__0', 10), /整数/)
  assert.throws(() => parseInteger('12', 37), /2–36/)
})
test('颜色：HEX/RGB/HSL、透明度、对比度及无效输入', () => {
  assert.equal(colorFormats(parseColor('#abc')).hex, '#AABBCC')
  assert.equal(colorFormats(parseColor('hsl(120, 100%, 50%)')).hex, '#00FF00')
  assert.equal(
    colorFormats(parseColor('rgb(100% 0% 0% / 50%)')).hex,
    '#FF000080',
  )
  assert.equal(colorFormats(parseColor('#0000')).rgb, 'rgba(0, 0, 0, 0)')
  assert.equal(contrastRatio(parseColor('#000'), parseColor('#fff')), 21)
  assert.equal(contrastRatio(parseColor('#fff'), parseColor('#fff')), 1)
  assert.equal(contrastRatio(parseColor('#0000'), parseColor('#fff')), 1)
  assert.throws(() => parseColor('rgb(256,0,0)'), /范围/)
  assert.throws(() => parseColor('hsl(10, 20, 30)'), /百分比/)
  assert.throws(() => parseColor('#abcd00ff00'), /支持/)
})

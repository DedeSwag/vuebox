import assert from 'node:assert/strict'
import test from 'node:test'
import { formatBeijing, parseTimestamp, parseBeijing, toDateInput } from '../src/utils/timestamp.ts'

test('秒和毫秒自动识别，格式化使用固定北京时间', () => {
  assert.equal(parseTimestamp('1704067200').milliseconds, 1704067200000)
  assert.equal(parseTimestamp('1704067200123').milliseconds, 1704067200123)
  assert.equal(formatBeijing(1704067200000), '2024-01-01 08:00:00')
  assert.equal(formatBeijing(1704067200000, 'yyyy-MM-dd'), '2024-01-01')
  assert.equal(formatBeijing(1704067200000, 'yyyy/MM/dd HH:mm:ss'), '2024/01/01 08:00:00')
})

test('零值、负值、毫秒和世纪边界可准确往返', () => {
  assert.equal(parseTimestamp('0').milliseconds, 0)
  assert.equal(formatBeijing(0), '1970-01-01 08:00:00')
  for (const input of ['1969-12-31T23:59:59.999', '2024-02-29T12:34:56.123', '0001-01-01T00:00:00.000', '0099-12-31T23:59:59.999', '9999-12-31T23:59:59.999']) {
    const milliseconds = parseBeijing(input)
    assert.equal(toDateInput(milliseconds), input)
    assert.equal(parseTimestamp(String(milliseconds), 'milliseconds').milliseconds, milliseconds)
  }
  assert.equal(parseBeijing('2024-01-01T08:00'), 1704067200000)
})

test('拒绝无效日期、越界值和含糊单位', () => {
  for (const input of ['2023-02-29T00:00', '2024-02-30T00:00', '2024-13-01T00:00', '2024-01-01T24:00', '2024-01-01T00:60', '0000-01-01T00:00', '2024-00-01T00:00']) {
    assert.throws(() => parseBeijing(input))
  }
  for (const input of ['', 'abc', '1e9', '123.4', '12345678901', '9007199254740993']) {
    assert.throws(() => parseTimestamp(input))
  }
  assert.equal(parseTimestamp('12345678901', 'milliseconds').milliseconds, 12345678901)
})

test('设备时区变化不影响北京时间解析', () => {
  const original = process.env.TZ
  try {
    for (const timezone of ['UTC', 'America/New_York', 'Asia/Tokyo']) {
      process.env.TZ = timezone
      assert.equal(parseBeijing('2024-03-10T02:30'), 1710009000000)
      assert.equal(formatBeijing(1710009000000), '2024-03-10 02:30:00')
    }
  } finally {
    if (original === undefined) delete process.env.TZ
    else process.env.TZ = original
  }
})

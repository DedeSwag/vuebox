import assert from 'node:assert/strict'
import test from 'node:test'
import {
  convertCron,
  cronTemplates,
  getFieldMode,
  nextCronDates,
  parseCron,
  serializeCron,
} from '../src/utils/cron.ts'

test('识别五位和六位，五位补零秒，格式转换保留其他字段', () => {
  const parsed = parseCron('  */5  8-18 * * 1-5  ')
  assert.equal(parsed.format, 5)
  assert.deepEqual(parsed.tokens, ['0', '*/5', '8-18', '*', '*', '1-5'])
  assert.equal(convertCron('*/5 8-18 * * 1-5', 6), '0 */5 8-18 * * 1-5')
  assert.equal(convertCron('15 */5 8-18 * * 1-5', 5), '*/5 8-18 * * 1-5')
})

test('常用模板在两种格式下均合法且执行时间一致', () => {
  for (const template of cronTemplates) {
    const five = convertCron(template.expression, 5)
    assert.equal(parseCron(template.expression).format, 6)
    assert.equal(parseCron(five).format, 5)
    assert.deepEqual(
      nextCronDates(
        five,
        10,
        new Date('2026-09-19T00:00:00Z'),
        'Asia/Shanghai',
      ),
      nextCronDates(
        template.expression,
        10,
        new Date('2026-09-19T00:00:00Z'),
        'Asia/Shanghai',
      ),
    )
  }
})

test('四种配置模式及组合规则可以无损往返', () => {
  for (const [token, mode] of [
    ['*', 'every'],
    ['1,3,5', 'values'],
    ['2-8', 'range'],
    ['*/5', 'interval'],
    ['3/5', 'interval'],
    ['3-23/5', 'interval'],
    ['1-5,10-20/2', 'custom'],
  ]) {
    assert.equal(getFieldMode(token!), mode)
    const expression = `0 ${token} * * * *`
    const parsed = parseCron(expression)
    assert.equal(serializeCron(parsed.tokens, 6), expression)
  }
})

test('拒绝空值、错误字段数、越界值、反向范围、非法步长和非支持语法', () => {
  for (const expression of [
    '',
    '* * *',
    '* * * * * * *',
    '60 * * * * *',
    '0 60 * * * *',
    '0 0 24 * * *',
    '0 0 0 0 * *',
    '0 0 0 * 13 *',
    '0 0 0 * * 8',
    '0 5-2 * * * *',
    '0 */0 * * * *',
    '0 */61 * * * *',
    '0 1,,2 * * * *',
    '0 1/2/3 * * * *',
    '0 1.5 * * * *',
    '0 0 0 ? * *',
    '@daily',
    '0 0 0 * JAN MON',
    '0 0 0 30 2 *',
  ]) {
    assert.throws(() => parseCron(expression), undefined, expression)
  }
})

test('执行时间严格晚于起点，秒级和分级步长准确', () => {
  const now = new Date('2026-09-19T00:00:00Z')
  assert.deepEqual(nextCronDates('*/15 * * * * *', 3, now, 'UTC'), [
    '2026-09-19T00:00:15.000Z',
    '2026-09-19T00:00:30.000Z',
    '2026-09-19T00:00:45.000Z',
  ])
  assert.equal(
    nextCronDates('* * * * *', 1, now, 'UTC')[0],
    '2026-09-19T00:01:00.000Z',
  )
})

test('正确处理本地时区、跨月、闰年和周日的两种写法', () => {
  assert.equal(
    nextCronDates(
      '0 0 0 * * *',
      1,
      new Date('2026-09-19T00:00:00Z'),
      'Asia/Shanghai',
    )[0],
    '2026-09-19T16:00:00.000Z',
  )
  assert.equal(
    nextCronDates(
      '0 0 0 31 * *',
      1,
      new Date('2026-04-01T00:00:00Z'),
      'UTC',
    )[0],
    '2026-05-31T00:00:00.000Z',
  )
  assert.equal(
    nextCronDates(
      '0 0 0 29 2 *',
      1,
      new Date('2026-01-01T00:00:00Z'),
      'UTC',
    )[0],
    '2028-02-29T00:00:00.000Z',
  )
  const now = new Date('2026-09-19T00:00:00Z')
  assert.deepEqual(
    nextCronDates('0 0 0 * * 0', 2, now, 'UTC'),
    nextCronDates('0 0 0 * * 7', 2, now, 'UTC'),
  )
})

test('日期与星期同时限制时按或匹配', () => {
  assert.deepEqual(
    nextCronDates('0 0 0 1 * 1', 2, new Date('2026-09-29T00:00:00Z'), 'UTC'),
    ['2026-10-01T00:00:00.000Z', '2026-10-05T00:00:00.000Z'],
  )
})

test('夏令时切换仍返回递增时间', () => {
  const dates = nextCronDates(
    '0 30 2 * * *',
    3,
    new Date('2026-03-07T00:00:00Z'),
    'America/New_York',
  )
  assert.equal(dates.length, 3)
  assert.ok(dates.every((date, i) => i === 0 || date > dates[i - 1]!))
})

test('限制预览数量', () => {
  for (const count of [0, 51, 1.5, NaN])
    assert.throws(() => nextCronDates('* * * * *', count, new Date(), 'UTC'))
  assert.equal(nextCronDates('* * * * *', 50, new Date(), 'UTC').length, 50)
})

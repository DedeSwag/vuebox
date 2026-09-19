import assert from 'node:assert/strict'
import test from 'node:test'
import { customZone, offsetLabel, parseZoneTime, presetZones, zoneInput, zoneOffset, zoneParts } from '../src/utils/timezones.ts'
const zone = (id: string) => presetZones.find(z => z.id === id)!

test('同一 UTC 时刻跨日期转换，目标时间可以准确反向解析', () => {
  const instant = Date.parse('2024-01-01T00:00:00Z')
  assert.equal(zoneInput(instant, zone('Asia/Shanghai')), '2024-01-01T08:00:00')
  assert.equal(zoneInput(instant, zone('America/New_York')), '2023-12-31T19:00:00')
  assert.equal(zoneInput(instant, zone('Asia/Tokyo')), '2024-01-01T09:00:00')
  for (const z of presetZones) assert.equal(parseZoneTime(zoneInput(instant, z), z).instant, instant)
  assert.equal(zoneParts(instant, zone('Asia/Shanghai')).weekday, '星期一')
  assert.equal(zoneParts(instant, zone('America/New_York')).weekday, '星期日')
})

test('城市偏移随所选日期的夏令时变化', () => {
  const winter = Date.parse('2024-01-01T12:00:00Z')
  const summer = Date.parse('2024-07-01T12:00:00Z')
  assert.equal(zoneOffset(winter, zone('America/New_York')), -300)
  assert.equal(zoneOffset(summer, zone('America/New_York')), -240)
  assert.equal(zoneOffset(winter, zone('Europe/London')), 0)
  assert.equal(zoneOffset(summer, zone('Europe/London')), 60)
  assert.equal(zoneOffset(summer + 789, zone('Asia/Shanghai')), 480)
})

test('春季跳过的时间报错，秋季重复时间可选择两次出现', () => {
  const ny = zone('America/New_York')
  assert.throws(() => parseZoneTime('2024-03-10T02:30', ny), /不存在/)
  const first = parseZoneTime('2024-11-03T01:30', ny)
  const second = parseZoneTime('2024-11-03T01:30', ny, 'later')
  assert.equal(first.ambiguous, true)
  assert.equal(second.instant - first.instant, 3600000)
  assert.equal(new Date(first.instant).toISOString(), '2024-11-03T05:30:00.000Z')
  assert.throws(() => parseZoneTime('2024-03-31T01:30', zone('Europe/London')), /不存在/)
})

test('自定义偏移支持半小时、四十五分钟、负值和边界', () => {
  for (const value of ['+05:30', '+05:45', '-03:30', '+14:00', '-14:00', '+00:00']) {
    const z = customZone(value)
    const instant = Date.parse('2024-12-31T23:45:12Z')
    assert.equal(parseZoneTime(zoneInput(instant, z), z).instant, instant)
  }
  assert.equal(customZone('+5:30').id, customZone('+05:30').id)
  assert.equal(customZone('-00:00').id, customZone('+00:00').id)
  assert.equal(offsetLabel(-210), 'UTC−03:30')
  for (const value of ['+14:01', '-15:00', '+05:60', '5.5', 'UTC+8', '']) assert.throws(() => customZone(value))
})

test('拒绝无效日期，不受设备本地时区影响', () => {
  for (const input of ['2023-02-29T12:00', '2024-04-31T12:00', '2024-01-01T24:00', '1899-01-01T00:00', '']) assert.throws(() => parseZoneTime(input, zone('UTC')))
  const previous = process.env.TZ
  try {
    for (const tz of ['UTC', 'Asia/Tokyo', 'America/New_York']) {
      process.env.TZ = tz
      assert.equal(parseZoneTime('2024-01-01T08:00', zone('Asia/Shanghai')).instant, 1704067200000)
    }
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous }
})

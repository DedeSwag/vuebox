import assert from 'node:assert/strict'
import test from 'node:test'
import { clockRegions, filterWorldTimeZones, getSupportedWorldTimeZones, relativeToBeijing, worldTimeZones } from '../src/utils/worldTimeZones.ts'
import { zoneOffset, zoneParts } from '../src/utils/timezones.ts'

test('全球目录覆盖各大区域且包含独立的多时区城市', () => {
  assert.ok(worldTimeZones.length > 400)
  assert.equal(new Set(worldTimeZones.map(zone => zone.id)).size, worldTimeZones.length)
  for (const region of clockRegions) assert.ok(worldTimeZones.some(zone => zone.region === region.id))
  for (const id of ['Asia/Kolkata', 'Asia/Kathmandu', 'Australia/Adelaide', 'Australia/Perth', 'Pacific/Chatham', 'America/St_Johns', 'Africa/Cairo', 'America/Argentina/Buenos_Aires']) {
    assert.ok(worldTimeZones.some(zone => zone.id === id), id)
  }
  for (const zone of worldTimeZones) {
    assert.ok(zone.label && zone.country)
    assert.match(zone.label + zone.country, /[\u3400-\u9fff]/)
  }
})

test('国家、城市、中英文和常用城市别名均可搜索，并可叠加地区筛选', () => {
  assert.ok(filterWorldTimeZones(worldTimeZones, '印度').some(zone => zone.id === 'Asia/Kolkata'))
  assert.equal(filterWorldTimeZones(worldTimeZones, '印度')[0]?.id, 'Asia/Kolkata')
  assert.ok(filterWorldTimeZones(worldTimeZones, '北京').some(zone => zone.id === 'Asia/Shanghai'))
  assert.ok(filterWorldTimeZones(worldTimeZones, '  NEW york ').some(zone => zone.id === 'America/New_York'))
  assert.ok(filterWorldTimeZones(worldTimeZones, 'Asia/Kolkata').some(zone => zone.id === 'Asia/Kolkata'))
  assert.ok(filterWorldTimeZones(worldTimeZones, '旧金山').some(zone => zone.id === 'America/Los_Angeles'))
  assert.ok(filterWorldTimeZones(worldTimeZones, 'USA').some(zone => zone.id === 'America/New_York'))
  assert.ok(filterWorldTimeZones(worldTimeZones, 'US').every(zone => zone.countryCode === 'US'))
  assert.ok(filterWorldTimeZones(worldTimeZones, 'UK').some(zone => zone.id === 'Europe/London'))
  assert.ok(filterWorldTimeZones(worldTimeZones, 'United States', 'America').length > 10)
  assert.equal(filterWorldTimeZones(worldTimeZones, 'New York', 'Asia').length, 0)
  assert.equal(filterWorldTimeZones(worldTimeZones, '不存在的城市123').length, 0)
  assert.equal(filterWorldTimeZones(worldTimeZones, '   ').length, worldTimeZones.length)
})

test('当前运行时可显示的每个时区都能安全生成日期时间', () => {
  const zones = getSupportedWorldTimeZones()
  assert.ok(zones.length > 400)
  assert.equal(new Set(zones.map(zone => zone.id)).size, zones.length)
  for (const zone of zones) {
    for (const instant of [Date.parse('2026-01-15T12:00:00Z'), Date.parse('2026-07-15T12:00:00Z')]) {
      assert.match(zoneParts(instant, zone).time, /^\d{2}:\d{2}:\d{2}$/)
      assert.ok(Number.isFinite(zoneOffset(instant, zone)), zone.id)
    }
  }
})

test('旧浏览器可使用等价旧名称，完全不支持的地区不进入列表', () => {
  const zones = getSupportedWorldTimeZones(id => ['UTC', 'Asia/Calcutta'].includes(id))
  assert.deepEqual(zones.map(zone => zone.id), ['UTC', 'Asia/Calcutta'])
  assert.equal(zones[1]?.country, '印度')
  assert.equal(getSupportedWorldTimeZones(() => false).length, 0)
})

test('与北京的时差使用时区实际偏移，支持半小时、45 分钟和夏令时', () => {
  const instant = Date.parse('2026-01-15T12:00:00Z')
  const beijing = zoneOffset(instant, { id: 'Asia/Shanghai', label: '' })
  const relative = (id: string, time = instant) => relativeToBeijing(zoneOffset(time, { id, label: '' }), beijing)
  assert.equal(relative('Asia/Kolkata'), '比北京时间慢2小时30分钟')
  assert.equal(relative('Asia/Kathmandu'), '比北京时间慢2小时15分钟')
  assert.equal(relative('Pacific/Chatham'), '比北京时间快5小时45分钟')
  assert.equal(relative('Asia/Singapore'), '与北京时间相同')
  assert.equal(relative('Australia/Sydney'), '比北京时间快3小时')
  assert.equal(relative('Australia/Sydney', Date.parse('2026-07-15T12:00:00Z')), '比北京时间快2小时')
})

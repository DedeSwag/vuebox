export interface TimeZone { id: string; label: string; offset?: number }
export const presetZones: TimeZone[] = [
  { id: 'UTC', label: 'UTC' },
  { id: 'Asia/Shanghai', label: '北京时间' },
  { id: 'Asia/Tokyo', label: '东京' },
  { id: 'Asia/Singapore', label: '新加坡' },
  { id: 'Europe/London', label: '伦敦' },
  { id: 'America/New_York', label: '纽约' },
  { id: 'America/Los_Angeles', label: '洛杉矶' },
]
const pad = (n: number) => String(n).padStart(2, '0')
const formatters = new Map<string, Intl.DateTimeFormat>()
export function zoneParts(instant: number, zone: TimeZone) {
  let formatter = formatters.get(zone.id)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', { timeZone: zone.offset === undefined ? zone.id : 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', weekday: 'long' })
    formatters.set(zone.id, formatter)
  }
  const parts = Object.fromEntries(formatter.formatToParts(instant + (zone.offset ?? 0) * 60000).map(p => [p.type, p.value]))
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}:${parts.second}`, weekday: ({ Monday: '星期一', Tuesday: '星期二', Wednesday: '星期三', Thursday: '星期四', Friday: '星期五', Saturday: '星期六', Sunday: '星期日' } as Record<string, string>)[parts.weekday!]! }
}
export function zoneInput(instant: number, zone: TimeZone) {
  const p = zoneParts(instant, zone)
  return `${p.date}T${p.time}`
}
export function zoneOffset(instant: number, zone: TimeZone) {
  if (zone.offset !== undefined) return zone.offset
  return (Date.parse(`${zoneInput(instant, zone)}Z`) - Math.floor(instant / 1000) * 1000) / 60000
}
export function offsetLabel(offset: number) {
  const minutes = Math.round(Math.abs(offset))
  return `UTC${offset < 0 ? '−' : '+'}${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}
export function customZone(input: string): TimeZone {
  const match = /^([+-])(\d{1,2}):(\d{2})$/.exec(input.trim())
  if (!match || Number(match[3]) > 59 || Number(match[2]) > 14 || (Number(match[2]) === 14 && Number(match[3]) !== 0)) throw new Error('请输入 −14:00 至 +14:00 的偏移，例如 +05:30（使用半角 + 或 -）。')
  const offset = (Number(match[2]) * 60 + Number(match[3])) * (match[1] === '-' ? -1 : 1)
  return { id: `fixed:${offset}`, label: `自定义 ${offsetLabel(offset)}`, offset }
}

// 枚举转换日附近实际出现的偏移，验证回转结果，识别夏令时跳过或重复的墙上时间。
export function parseZoneTime(input: string, zone: TimeZone, occurrence: 'earlier' | 'later' = 'earlier') {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(input)) throw new Error('请选择完整日期和时间。')
  const normalized = input.length === 16 ? `${input}:00` : input
  const wall = Date.parse(`${normalized}Z`)
  if (!Number.isFinite(wall) || new Date(wall).toISOString().slice(0, 19) !== normalized || Number(input.slice(0, 4)) < 1900 || Number(input.slice(0, 4)) > 9998) throw new Error('日期无效，支持 1900–9998 年。')
  const offsets = zone.offset === undefined
    ? new Set([-36, -24, -12, 0, 12, 24, 36].map(hours => zoneOffset(wall + hours * 3600000, zone)))
    : new Set([zone.offset])
  const candidates = [...offsets].map(offset => wall - offset * 60000).filter(instant => zoneInput(instant, zone) === normalized).sort((a, b) => a - b)
  if (!candidates.length) throw new Error('该当地时间因夏令时切换而不存在，请选择其他时间。')
  return { instant: candidates[occurrence === 'earlier' ? 0 : candidates.length - 1]!, ambiguous: candidates.length > 1 }
}

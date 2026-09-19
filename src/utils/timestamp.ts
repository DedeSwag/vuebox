export type TimestampUnit = 'auto' | 'seconds' | 'milliseconds'
export type DateFormat = 'yyyy-MM-dd HH:mm:ss' | 'yyyy-MM-dd' | 'yyyy/MM/dd HH:mm:ss'
const OFFSET = 8 * 60 * 60 * 1000
const pad = (value: number, length = 2) => String(value).padStart(length, '0')

export function beijingParts(milliseconds: number) {
  const date = new Date(milliseconds + OFFSET)
  if (!Number.isFinite(milliseconds) || Number.isNaN(date.getTime()) || date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) {
    throw new Error('日期超出支持范围（0001–9999 年）。')
  }
  return {
    date: `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
    time: `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`,
    fraction: pad(date.getUTCMilliseconds(), 3),
  }
}

export function formatBeijing(milliseconds: number, format: DateFormat = 'yyyy-MM-dd HH:mm:ss') {
  const parts = beijingParts(milliseconds)
  if (format === 'yyyy-MM-dd') return parts.date
  return `${format === 'yyyy/MM/dd HH:mm:ss' ? parts.date.replaceAll('-', '/') : parts.date} ${parts.time}`
}

export function toDateInput(milliseconds: number) {
  const parts = beijingParts(milliseconds)
  return `${parts.date}T${parts.time}.${parts.fraction}`
}

export function parseTimestamp(input: string, unit: TimestampUnit = 'auto') {
  const value = input.trim()
  if (!/^-?\d+$/.test(value)) throw new Error('请输入整数时间戳，不支持小数或其他字符。')
  const digits = value.replace(/^-/, '').length
  const resolved = unit === 'auto' ? (digits <= 10 ? 'seconds' : digits === 13 ? 'milliseconds' : null) : unit
  if (!resolved) throw new Error('无法自动识别，请输入 10 位秒或 13 位毫秒时间戳，或手动选择单位。')
  const milliseconds = Number(value) * (resolved === 'seconds' ? 1000 : 1)
  if (!Number.isSafeInteger(milliseconds)) throw new Error('时间戳超出安全整数范围。')
  beijingParts(milliseconds)
  return { milliseconds, unit: resolved }
}

export function parseBeijing(input: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(input)
  if (!match) throw new Error('请选择完整日期和时间。')
  const [, year, month, day, hour, minute, second = '00', fraction = '0'] = match
  const date = new Date(0)
  date.setUTCFullYear(Number(year), Number(month) - 1, Number(day))
  date.setUTCHours(Number(hour), Number(minute), Number(second), Number(fraction.padEnd(3, '0')))
  const milliseconds = date.getTime() - OFFSET
  const expected = `${year}-${month}-${day}T${hour}:${minute}:${second}.${fraction.padEnd(3, '0')}`
  if (toDateInput(milliseconds) !== expected) throw new Error('日期或时间无效，请检查年月日和时间。')
  return milliseconds
}

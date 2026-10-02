import { worldTimeZoneData } from './worldTimeZoneData.ts'

export const clockRegions = [
  { id: 'Asia', label: '亚洲' },
  { id: 'Europe', label: '欧洲' },
  { id: 'America', label: '美洲' },
  { id: 'Africa', label: '非洲' },
  { id: 'Oceania', label: '大洋洲 / 太平洋' },
  { id: 'Atlantic', label: '大西洋' },
  { id: 'Indian', label: '印度洋' },
  { id: 'Polar', label: '极地' },
  { id: 'UTC', label: '标准时间' },
] as const
export type ClockRegion = typeof clockRegions[number]['id']
export interface WorldTimeZone {
  id: string
  label: string
  country: string
  countryCode: string
  region: ClockRegion
  aliases: string[]
  searchText: string
}

// 常用城市可能共用一个 IANA 时区，搜索别名避免遗漏这些城市。
const cityKeywords: Record<string, string> = {
  'Asia/Shanghai': '北京 北京时间 广州 深圳 杭州 成都 重庆 Beijing Guangzhou Shenzhen Hangzhou Chengdu Chongqing China 中国',
  'Asia/Kolkata': '印度 新德里 德里 孟买 班加罗尔 印度标准时间 New Delhi Mumbai Bombay Bangalore Bengaluru India',
  'Asia/Dubai': '阿布扎比 阿联酋 Abu Dhabi UAE',
  'America/Los_Angeles': '旧金山 西雅图 拉斯维加斯 太平洋时间 San Francisco Seattle Las Vegas Pacific USA 美国',
  'America/New_York': '华盛顿 波士顿 迈阿密 美东时间 Washington Boston Miami Eastern USA 美国',
  'America/Chicago': '休斯敦 达拉斯 美中时间 Houston Dallas Central USA 美国',
  'America/Toronto': '渥太华 蒙特利尔 Ottawa Montreal Canada',
  'America/Sao_Paulo': '巴西利亚 里约热内卢 Brasilia Rio de Janeiro Brazil',
  'Europe/Berlin': '法兰克福 慕尼黑 汉堡 Frankfurt Munich Hamburg Germany',
  'Europe/Madrid': '巴塞罗那 西班牙 Barcelona Spain',
  'Europe/Rome': '米兰 威尼斯 Milan Venice Italy',
  'Europe/Zurich': '日内瓦 Geneva Switzerland',
  'Australia/Sydney': '堪培拉 Canberra Australia',
  'Pacific/Auckland': '惠灵顿 Wellington New Zealand',
  'Africa/Johannesburg': '开普敦 比勒陀利亚 Cape Town Pretoria South Africa',
}

function normalizeSearch(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/[_/]+/g, ' ')
}
function regionForZone(id: string): ClockRegion {
  const prefix = id.split('/')[0]
  if (prefix === 'Australia' || prefix === 'Pacific') return 'Oceania'
  if (prefix === 'Antarctica' || prefix === 'Arctic') return 'Polar'
  return clockRegions.find(region => region.id === prefix)?.id ?? 'UTC'
}

export const worldTimeZones: WorldTimeZone[] = [
  { id: 'UTC', label: 'UTC', country: '协调世界时', countryCode: '', region: 'UTC', aliases: [], searchText: 'utc gmt 协调世界时 格林尼治 标准时间' },
  ...worldTimeZoneData.map(([id, code, country, englishCountry, city, aliases]): WorldTimeZone => ({
    id,
    label: id === 'Asia/Shanghai' ? '北京 / 上海' : city,
    country,
    countryCode: code,
    region: regionForZone(id),
    aliases: aliases.split(' ').filter(Boolean),
    searchText: normalizeSearch(`${id} ${code} ${country} ${englishCountry} ${city} ${aliases} ${cityKeywords[id] ?? ''}`),
  })),
]

function isSupportedTimeZone(id: string) {
  try { new Intl.DateTimeFormat('en', { timeZone: id }); return true }
  catch { return false }
}

// 旧浏览器可能只认识更名前的 ID；仅使用 CLDR 确认等价的别名，不猜测固定偏移。
export function getSupportedWorldTimeZones(isSupported = isSupportedTimeZone): WorldTimeZone[] {
  return worldTimeZones.flatMap(zone => {
    const id = [zone.id, ...zone.aliases].find(isSupported)
    return id ? [{ ...zone, id }] : []
  })
}

export function filterWorldTimeZones(zones: readonly WorldTimeZone[], query: string, region: ClockRegion | 'all' = 'all') {
  const terms = normalizeSearch(query).trim().split(/\s+/).filter(Boolean)
  const countryAliases: Record<string, string> = { usa: 'US', uk: 'GB', uae: 'AE' }
  const countryCode = terms.length === 1 ? (countryAliases[terms[0]!] ?? terms[0]!.toUpperCase()) : ''
  if (countryCode && zones.some(zone => zone.countryCode === countryCode)) {
    return zones.filter(zone => zone.countryCode === countryCode && (region === 'all' || zone.region === region))
  }
  const matches = zones.filter(zone => (region === 'all' || zone.region === region) && terms.every(term => zone.searchText.includes(term)))
  const exactQuery = normalizeSearch(query).trim()
  const exactMatch = (zone: WorldTimeZone) => normalizeSearch(zone.country) === exactQuery || normalizeSearch(zone.label) === exactQuery
  return terms.length ? matches.sort((left, right) => Number(exactMatch(right)) - Number(exactMatch(left))) : matches
}

export function relativeToBeijing(offset: number, beijingOffset: number) {
  const difference = offset - beijingOffset
  if (difference === 0) return '与北京时间相同'
  const minutes = Math.round(Math.abs(difference))
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return `比北京时间${difference > 0 ? '快' : '慢'}${hours ? `${hours}小时` : ''}${remaining ? `${remaining}分钟` : ''}`
}

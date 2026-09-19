export type Base64Mode = 'standard' | 'url'
export type EscapeMode = 'html' | 'unicode' | 'hex'

function utf8(text: string): Uint8Array {
  // Reject incomplete surrogate pairs instead of silently replacing user input.
  try { encodeURIComponent(text) } catch { throw new Error('输入包含不完整的 Unicode 字符。') }
  return new TextEncoder().encode(text)
}
function fromUtf8(bytes: Uint8Array): string {
  try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes) }
  catch { throw new Error('结果不是有效的 UTF-8 文本，无法作为文本解码。') }
}
export function encodeBase64(text: string, mode: Base64Mode): string {
  const bytes = utf8(text)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
  const output = btoa(binary)
  return mode === 'url' ? output.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : output
}
export function decodeBase64(text: string, mode: Base64Mode): string {
  const input = text.replace(/[\t\r\n ]/g, '')
  if (!input) return ''
  const alphabet = mode === 'url' ? /^[A-Za-z0-9_-]*={0,2}$/ : /^[A-Za-z0-9+/]*={0,2}$/
  const body = input.replace(/=+$/, '')
  if (!alphabet.test(input) || body.length % 4 === 1 || (input.includes('=') && input.length % 4 !== 0))
    throw new Error('Base64 格式无效，请检查字符、长度、末尾填充及所选模式。')
  const normalized = body.replace(/-/g, '+').replace(/_/g, '/')
  let binary: string
  try { binary = atob(normalized) } catch { throw new Error('Base64 格式无效，无法解码。') }
  if (btoa(binary).replace(/=+$/, '') !== normalized)
    throw new Error('Base64 尾部位不合法，请检查输入是否完整。')
  return fromUtf8(Uint8Array.from(binary, char => char.charCodeAt(0)))
}

const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' }
export function encodeEscape(text: string, mode: EscapeMode): string {
  if (mode === 'html') return text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
  if (mode === 'unicode') return JSON.stringify(text).slice(1, -1).replace(/[\u007f-\uffff]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`)
  return Array.from(utf8(text), byte => byte.toString(16).padStart(2, '0')).join(' ')
}
export function decodeEscape(text: string, mode: EscapeMode): string {
  if (mode === 'html') return text.replace(/&(#x[\da-f]+|#\d+|[a-z][\da-z]*);/gi, (entity, name: string) => {
    if (!name.startsWith('#')) {
      if (Object.hasOwn(entities, name)) return entities[name]!
      throw new Error(`暂不支持命名实体 ${entity}；支持 amp、lt、gt、quot、apos、nbsp 和数字实体。`)
    }
    const value = name[1]?.toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1))
    if (!Number.isInteger(value) || value <= 0 || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff))
      throw new Error(`无效的 Unicode 数字实体：${entity}`)
    return String.fromCodePoint(value)
  })
  if (mode === 'unicode') {
    try { return JSON.parse(`"${text}"`) as string }
    catch { throw new Error('转义格式无效，请输入不带外层引号的 JSON 字符串内容，例如 \\u4e2d\\u6587。') }
  }
  const hex = text.replace(/\s/g, '')
  if (!/^(?:[\da-f]{2})*$/i.test(hex)) throw new Error('十六进制格式无效：每个字节需要两位 0–9 / A–F，可用空白分隔。')
  return fromUtf8(Uint8Array.from(hex.match(/../g) ?? [], byte => parseInt(byte, 16)))
}

export function generateUuids(count: number): string[] {
  if (!Number.isInteger(count) || count < 1 || count > 1000) throw new Error('生成数量必须为 1–1000 的整数。')
  if (!globalThis.crypto?.getRandomValues) throw new Error('当前浏览器不支持安全随机数，请使用现代浏览器。')
  const bytes = crypto.getRandomValues(new Uint8Array(count * 16))
  const results: string[] = []
  for (let i = 0; i < bytes.length; i += 16) {
    bytes[i + 6] = (bytes[i + 6]! & 0x0f) | 0x40
    bytes[i + 8] = (bytes[i + 8]! & 0x3f) | 0x80
    const hex = Array.from(bytes.subarray(i, i + 16), byte => byte.toString(16).padStart(2, '0')).join('')
    results.push(`${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`)
  }
  return results
}

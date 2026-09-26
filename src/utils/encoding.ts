export type Base64Mode = 'standard' | 'url'

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

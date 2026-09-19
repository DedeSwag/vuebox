export type EncodingMode = 'component' | 'form'
export interface QueryEntry { key: string; value: string }

export function encodeText(text: string, mode: EncodingMode): string {
  const encoded = encodeURIComponent(text)
  return mode === 'form' ? new URLSearchParams([['v', text]]).toString().slice(2) : encoded
}

export function decodeText(text: string, mode: EncodingMode): string {
  return decodeURIComponent(mode === 'form' ? text.replace(/\+/g, ' ') : text)
}

export function parseUrl(input: string): { url: URL | null; error: string } {
  const text = input.trim()
  if (!text) return { url: null, error: '' }
  if (!/^[a-z][a-z\d+.-]*:/i.test(text))
    return { url: null, error: '请输入包含协议的完整 URL，例如 https://example.com/path。' }
  if (/[\u0000-\u0020\u007f\\]/.test(text))
    return { url: null, error: 'URL 中不能包含空格、换行或反斜杠，请先进行编码。' }
  if (/%(?![\da-f]{2})/i.test(text))
    return { url: null, error: 'URL 包含无效的百分号编码，% 后需要两位十六进制数字。' }
  if (/^(https?|ftp|wss?):/i.test(text) && !/^[a-z]+:\/\/[^/?#]/i.test(text))
    return { url: null, error: '网络 URL 需要包含“协议://域名”，例如 https://example.com。' }
  try { return { url: new URL(text), error: '' } }
  catch { return { url: null, error: 'URL 无效，请检查协议、域名、IPv6 地址及端口（0–65535）。' } }
}

export function rebuildQuery(url: URL, entries: QueryEntry[]): string {
  const result = new URL(url.href)
  const params = new URLSearchParams()
  for (const entry of entries) params.append(entry.key, entry.value)
  result.search = params.toString()
  return result.href
}

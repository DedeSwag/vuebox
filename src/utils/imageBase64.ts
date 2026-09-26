export const maxImageBytes = 5 * 1024 * 1024
export const imageTypes = [
  { mime: 'image/png', name: 'PNG', extension: 'png' },
  { mime: 'image/jpeg', name: 'JPEG', extension: 'jpg' },
  { mime: 'image/gif', name: 'GIF', extension: 'gif' },
  { mime: 'image/webp', name: 'WebP', extension: 'webp' },
  { mime: 'image/bmp', name: 'BMP', extension: 'bmp' },
  { mime: 'image/x-icon', name: 'ICO', extension: 'ico' },
  { mime: 'image/avif', name: 'AVIF', extension: 'avif' },
  { mime: 'image/svg+xml', name: 'SVG', extension: 'svg' },
]
export function normalizeImageMime(mime: string): string {
  const normalized = mime.toLowerCase() === 'image/vnd.microsoft.icon' ? 'image/x-icon' : mime.toLowerCase()
  if (!imageTypes.some(type => type.mime === normalized)) throw new Error('不支持此图片格式，请使用 PNG、JPEG、GIF、WebP、BMP、ICO、AVIF 或 SVG。')
  return normalized
}
export function imageDataUrl(bytes: Uint8Array, mime: string): string {
  mime = normalizeImageMime(mime)
  if (!bytes.length) throw new Error('图片内容为空。')
  if (bytes.length > maxImageBytes) throw new Error('图片最大支持 5 MiB。')
  const chunks: string[] = []
  for (let i = 0; i < bytes.length; i += 8192) chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)))
  return `data:${mime};base64,${btoa(chunks.join(''))}`
}
export function parseImageBase64(text: string, fallbackMime: string): { bytes: Uint8Array<ArrayBuffer>; mime: string; dataUrl: string } {
  if (text.length > 8_000_000) throw new Error('输入过长，请使用 5 MiB 以内的图片。')
  const value = text.trim()
  if (!value) throw new Error('请先粘贴图片 Base64 或 Data URL。')
  let mime = fallbackMime
  let encoded = value
  if (/^data:/i.test(value)) {
    const match = /^data:([^;,]+);base64,([\s\S]*)$/i.exec(value)
    if (!match) throw new Error('Data URL 格式无效，需要 data:image/类型;base64,内容。')
    mime = match[1]!
    encoded = match[2]!
  }
  mime = normalizeImageMime(mime)
  encoded = encoded.replace(/[\t\r\n ]/g, '')
  if (!encoded || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.replace(/=+$/, '').length % 4 === 1 || (encoded.includes('=') && encoded.length % 4 !== 0))
    throw new Error('Base64 格式无效，请检查字符、长度与末尾填充。')
  if (encoded.length > Math.ceil(maxImageBytes / 3) * 4) throw new Error('图片最大支持 5 MiB。')
  let binary: string
  try { binary = atob(encoded) } catch { throw new Error('无法解码此 Base64 内容。') }
  if (btoa(binary).replace(/=+$/, '') !== encoded.replace(/=+$/, '')) throw new Error('Base64 尾部位不合法，请检查内容。')
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
  return { bytes, mime, dataUrl: imageDataUrl(bytes, mime) }
}

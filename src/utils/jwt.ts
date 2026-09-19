export interface JwtData {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  signature: string
}
function decodePart(part: string, label: string): Record<string, unknown> {
  if (!/^[\w-]+$/.test(part) || part.length % 4 === 1)
    throw new Error(`${label} 不是有效 Base64URL。`)
  try {
    const binary = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    if (
      btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_') !==
      part
    )
      throw new Error()
    const value: unknown = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(
        Uint8Array.from(binary, (c) => c.charCodeAt(0)),
      ),
    )
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error()
    return value as Record<string, unknown>
  } catch {
    throw new Error(`${label} 解码失败，内容必须是 UTF-8 JSON 对象。`)
  }
}
export function decodeJwt(text: string): JwtData {
  const token = text.trim().replace(/^Bearer\s+/i, '')
  if (token.length > 100000) throw new Error('Token 超过 10 万字符。')
  const parts = token.split('.')
  if (parts.length === 5)
    throw new Error('这是五段式 JWE 加密令牌；本工具仅解码三段式 JWT。')
  if (parts.length !== 3)
    throw new Error('JWT 必须由 Header.Payload.Signature 三段组成。')
  const [h, p, s] = parts
  if (!/^[\w-]*$/.test(s!)) throw new Error('签名段包含非法 Base64URL 字符。')
  return {
    header: decodePart(h!, 'Header'),
    payload: decodePart(p!, 'Payload'),
    signature: s!,
  }
}
export function jwtTime(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value))
    return '无效：必须为数字类型的 Unix 秒数'
  const date = new Date(value * 1000)
  return Number.isNaN(date.getTime())
    ? '无效：时间超出范围'
    : date.toISOString()
}
export function jwtTiming(
  payload: Record<string, unknown>,
  now: number,
): string {
  for (const key of ['exp', 'nbf', 'iat'])
    if (
      key in payload &&
      (typeof payload[key] !== 'number' ||
        !Number.isFinite(payload[key]) ||
        Number.isNaN(new Date((payload[key] as number) * 1000).getTime()))
    )
      return `${key} 时间声明格式无效`
  if (typeof payload.exp === 'number' && now >= payload.exp)
    return '已超过 exp 到期时间'
  if (typeof payload.nbf === 'number' && now < payload.nbf)
    return '尚未到达 nbf 生效时间'
  return typeof payload.exp === 'number'
    ? '尚未超过 exp 到期时间（未验签）'
    : '未设置 exp，无法判断过期时间'
}

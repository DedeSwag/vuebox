export const hashAlgorithms = [
  'SHA-256',
  'SHA-384',
  'SHA-512',
  'SHA-1',
] as const
export type HashAlgorithm = (typeof hashAlgorithms)[number]
export async function digestBytes(
  bytes: ArrayBuffer,
  algorithm: HashAlgorithm,
): Promise<string> {
  if (!hashAlgorithms.includes(algorithm)) throw new Error('不支持此摘要算法。')
  if (!globalThis.crypto?.subtle)
    throw new Error(
      '当前环境无法使用 Web Crypto，请通过 HTTPS 或 localhost 打开。',
    )
  const digest = await crypto.subtle.digest(algorithm, bytes)
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')
}

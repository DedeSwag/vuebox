export interface PasswordOptions {
  length: number
  count: number
  lowercase: boolean
  uppercase: boolean
  digits: boolean
  symbols: boolean
  excludeAmbiguous: boolean
}
export const passwordCharacters = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/~',
}
export function generatePasswords(options: PasswordOptions): string[] {
  if (!Number.isInteger(options.length) || options.length < 4 || options.length > 128)
    throw new Error('密码长度必须为 4–128 的整数。')
  if (!Number.isInteger(options.count) || options.count < 1 || options.count > 100)
    throw new Error('生成数量必须为 1–100 的整数。')
  const groups = (Object.keys(passwordCharacters) as (keyof typeof passwordCharacters)[])
    .filter(key => options[key])
    .map(key => options.excludeAmbiguous ? passwordCharacters[key].replace(/[Il1O0o]/g, '') : passwordCharacters[key])
  if (!groups.length) throw new Error('请至少选择一种字符类型。')
  if (!globalThis.crypto?.getRandomValues) throw new Error('当前浏览器不支持安全随机数，请使用现代浏览器。')
  const pool = new Uint32Array(256)
  let cursor = pool.length
  function randomIndex(limit: number): number {
    // Rejection sampling removes modulo bias, including during the shuffle.
    const ceiling = Math.floor(0x100000000 / limit) * limit
    let value: number
    do {
      if (cursor === pool.length) { crypto.getRandomValues(pool); cursor = 0 }
      value = pool[cursor++]!
    } while (value >= ceiling)
    return value % limit
  }
  const alphabet = groups.join('')
  return Array.from({ length: options.count }, () => {
    const chars = groups.map(group => group[randomIndex(group.length)]!)
    while (chars.length < options.length) chars.push(alphabet[randomIndex(alphabet.length)]!)
    for (let i = chars.length - 1; i > 0; i--) {
      const j = randomIndex(i + 1)
      ;[chars[i], chars[j]] = [chars[j]!, chars[i]!]
    }
    return chars.join('')
  })
}

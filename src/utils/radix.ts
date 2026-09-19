export function parseInteger(text: string, base: number): bigint {
  if (!Number.isInteger(base) || base < 2 || base > 36)
    throw new Error('进制必须为 2–36 的整数。')
  let value = text.trim()
  if (!value) throw new Error('请输入整数。')
  if (value.length > 4096) throw new Error('最多支持 4096 个字符。')
  let sign = 1n
  if (value[0] === '-' || value[0] === '+') {
    if (value[0] === '-') sign = -1n
    value = value.slice(1)
  }
  if (base === 16 && /^0x/i.test(value)) value = value.slice(2)
  if (base === 2 && /^0b/i.test(value)) value = value.slice(2)
  if (base === 8 && /^0o/i.test(value)) value = value.slice(2)
  if (!/^[a-z0-9]+(?:_[a-z0-9]+)*$/i.test(value))
    throw new Error(
      '请输入整数，可带正负号及数字间下划线；不支持小数或科学计数法。',
    )
  let result = 0n
  for (const char of value.toLowerCase().replace(/_/g, '')) {
    const digit = parseInt(char, 36)
    if (digit >= base)
      throw new Error(`字符 ${char.toUpperCase()} 不属于 ${base} 进制。`)
    result = result * BigInt(base) + BigInt(digit)
  }
  return sign * result
}
export function formatInteger(
  value: bigint,
  base: number,
  uppercase = false,
): string {
  if (!Number.isInteger(base) || base < 2 || base > 36)
    throw new Error('进制必须为 2–36 的整数。')
  const text = value.toString(base)
  return uppercase ? text.toUpperCase() : text
}

export interface TextBatchOptions {
  trim: boolean
  removeEmpty: boolean
  dedupe: boolean
  ignoreCase: boolean
  sort: 'none' | 'asc' | 'desc'
  numeric: boolean
  casing: 'none' | 'upper' | 'lower' | 'camel' | 'snake' | 'kebab'
  prefix: string
  suffix: string
}
export function processLines(
  text: string,
  options: TextBatchOptions,
): { text: string; before: number; after: number } {
  if (text.length > 1_000_000) throw new Error('文本最多支持 100 万字符。')
  if (!text) return { text: '', before: 0, after: 0 }
  let lines = text.replace(/\r\n?/g, '\n').split('\n')
  const before = lines.length
  if (options.trim) lines = lines.map((s) => s.trim())
  if (options.removeEmpty) lines = lines.filter((s) => s.trim() !== '')
  lines = lines.map((s) => {
    if (options.casing === 'upper') return s.toUpperCase()
    if (options.casing === 'lower') return s.toLowerCase()
    if (options.casing === 'none') return s
    const words = s
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(/([a-z\d])([A-Z])/g, '$1 $2')
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean)
      .map((w) => w.toLowerCase())
    return options.casing === 'camel'
      ? words.map((w, i) => (i ? w[0]!.toUpperCase() + w.slice(1) : w)).join('')
      : words.join(options.casing === 'snake' ? '_' : '-')
  })
  if (options.dedupe) {
    const seen = new Set<string>()
    lines = lines.filter((s) => {
      const key = options.ignoreCase ? s.toLowerCase() : s
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
  if (options.sort !== 'none') {
    const collator = new Intl.Collator('zh-CN', {
      numeric: options.numeric,
      sensitivity: options.ignoreCase ? 'accent' : 'variant',
    })
    lines.sort(
      (a, b) => (options.sort === 'asc' ? 1 : -1) * collator.compare(a, b),
    )
  }
  if (
    (options.prefix.length + options.suffix.length) * lines.length +
      text.length >
    2_000_000
  )
    throw new Error('前后缀生成结果过大，请减少文本或前后缀长度。')
  return {
    text: lines.map((s) => options.prefix + s + options.suffix).join('\n'),
    before,
    after: lines.length,
  }
}

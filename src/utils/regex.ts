export interface RegexRequest {
  pattern: string
  flags: string
  text: string
  replacement: string
}
export interface RegexMatch {
  index: number
  end: number
  value: string
  groups: (string | null)[]
  named: Record<string, string> | null
}
export interface RegexResult {
  matches: RegexMatch[]
  replaced: string
  truncated: boolean
}
export function testRegex(request: RegexRequest): RegexResult {
  const { pattern, flags, text, replacement } = request
  if (!pattern) throw new Error('请输入正则表达式，不需要两侧的 /。')
  if (
    pattern.length > 10000 ||
    text.length > 100000 ||
    replacement.length > 10000
  )
    throw new Error('正则和替换文本最多 1 万字符，测试文本最多 10 万字符。')
  if (!/^[gimsuy]*$/.test(flags) || new Set(flags).size !== flags.length)
    throw new Error('标志仅支持 g、i、m、s、u、y，且不能重复。')
  let regex: RegExp
  try {
    regex = new RegExp(pattern, flags)
  } catch (e) {
    throw new Error(`正则语法错误：${(e as Error).message}`)
  }
  const matches: RegexMatch[] = []
  let match: RegExpExecArray | null
  let truncated = false
  while ((match = regex.exec(text)) !== null) {
    if (matches.length >= 1000) {
      truncated = true
      break
    }
    matches.push({
      index: match.index,
      end: match.index + match[0].length,
      value: match[0],
      groups: match.slice(1).map((s) => s ?? null),
      named: match.groups ?? null,
    })
    if (!regex.global) break
    if (match[0] === '') {
      const cp = text.codePointAt(regex.lastIndex)
      regex.lastIndex +=
        regex.unicode && cp !== undefined && cp > 0xffff ? 2 : 1
    }
  }
  if (truncated) return { matches, replaced: '', truncated }
  // $` / $' can each insert the entire source once per substitution.
  const usesContext = /\$[`']/.test(replacement)
  const estimatedSize =
    text.length +
    matches.reduce((size, item) => {
      const expanded = replacement.includes('$')
        ? Math.max(
            1,
            item.value.length,
            ...item.groups.map((s) => s?.length ?? 0),
            usesContext ? text.length : 0,
          )
        : 1
      return size + replacement.length * expanded
    }, 0)
  if (estimatedSize > 2_000_000)
    throw new Error('匹配数量与替换结果可能过大，请缩小文本后重试。')
  return {
    matches,
    replaced: text.replace(new RegExp(pattern, flags), replacement),
    truncated,
  }
}

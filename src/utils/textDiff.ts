import { diffArrays, diffChars } from 'diff'
export interface DiffOptions {
  trim: boolean
  ignoreCase: boolean
  normalizeEol: boolean
}
export interface DiffRequest {
  left: string
  right: string
  options: DiffOptions
}
export interface DiffSpan {
  text: string
  changed: boolean
}
export interface DiffRow {
  id: number
  left?: string
  right?: string
  leftLine?: number
  rightLine?: number
  kind: 'same' | 'add' | 'remove' | 'change'
  leftSpans?: DiffSpan[]
  rightSpans?: DiffSpan[]
}
export interface DiffResult {
  rows: DiffRow[]
  added: number
  removed: number
  changes: number
}
export function compareText({ left, right, options }: DiffRequest): DiffResult {
  if (left.length > 1_000_000 || right.length > 1_000_000)
    throw new Error('每侧最多支持 100 万字符，请拆分后比较。')
  const lines = (text: string) =>
    (options.normalizeEol ? text.replace(/\r\n?/g, '\n') : text).split('\n')
  const a = left ? lines(left) : [],
    b = right ? lines(right) : []
  if (a.length > 50000 || b.length > 50000)
    throw new Error('每侧最多支持 50,000 行。')
  const normalize = (line: string) => {
    const s = options.trim ? line.trim() : line
    return options.ignoreCase ? s.toLowerCase() : s
  }
  const parts = diffArrays(a.map(normalize), b.map(normalize), {
    timeout: 1800,
    maxEditLength: 12000,
  })
  if (!parts) throw new Error('差异过多，计算已停止。请缩小比较范围。')
  const rows: DiffRow[] = []
  let ai = 0,
    bi = 0,
    added = 0,
    removed = 0,
    changes = 0
  for (let p = 0; p < parts.length; p++) {
    const part = parts[p]!
    if (!part.added && !part.removed) {
      for (let i = 0; i < part.count; i++)
        rows.push({
          id: rows.length,
          left: a[ai],
          right: b[bi],
          leftLine: ++ai,
          rightLine: ++bi,
          kind: 'same',
        })
      continue
    }
    const old: string[] = [],
      next: string[] = []
    while (p < parts.length && (parts[p]!.removed || parts[p]!.added)) {
      const item = parts[p]!
      if (item.removed) {
        old.push(...a.slice(ai, ai + item.count))
        removed += item.count
      } else {
        next.push(...b.slice(bi, bi + item.count))
        added += item.count
      }
      // Consume separately below, so several adjoining parts retain source positions.
      if (item.removed) ai += item.count
      else bi += item.count
      p++
    }
    p--
    const leftStart = ai - old.length,
      rightStart = bi - next.length
    for (let i = 0; i < Math.max(old.length, next.length); i++) {
      const l = old[i],
        r = next[i]
      const row: DiffRow = {
        id: rows.length,
        left: l,
        right: r,
        leftLine: l === undefined ? undefined : leftStart + i + 1,
        rightLine: r === undefined ? undefined : rightStart + i + 1,
        kind: l === undefined ? 'add' : r === undefined ? 'remove' : 'change',
      }
      if (row.kind === 'change') {
        changes++
        if (changes <= 300 && l!.length + r!.length < 4000) {
          const spans = diffChars(l!, r!, { timeout: 5, maxEditLength: 500 })
          if (spans) {
            row.leftSpans = spans
              .filter((s) => !s.added)
              .map((s) => ({ text: s.value, changed: s.removed }))
            row.rightSpans = spans
              .filter((s) => !s.removed)
              .map((s) => ({ text: s.value, changed: s.added }))
          }
        }
      }
      rows.push(row)
    }
  }
  return { rows, added, removed, changes }
}
export function diffReport(result: DiffResult): string {
  return (
    result.rows
      .filter((row) => row.kind !== 'same')
      .flatMap((row) =>
        [
          row.left === undefined ? null : `- ${row.leftLine}: ${row.left}`,
          row.right === undefined ? null : `+ ${row.rightLine}: ${row.right}`,
        ].filter((v) => v !== null),
      )
      .join('\n') || '按当前比较规则，两侧内容一致。'
  )
}

import { parseTree, type Node, type ParseError } from 'jsonc-parser'

export type JsonDocument = {
  source: string
  root?: Node
  decoded: boolean
  error?: {
    message: string
    offset: number
    line: number
    column: number
    excerpt: string
  }
}
const messages: Record<number, string> = {
  1: '存在非法字符；属性名和字符串必须使用双引号。',
  2: '数字格式不正确。',
  3: '缺少双引号包裹的属性名，或存在多余的尾随逗号。',
  4: '缺少 JSON 值，或存在多余的逗号。',
  5: '属性名后缺少冒号 :。',
  6: '相邻成员之间缺少逗号 ,。',
  7: '对象缺少右花括号 }。',
  8: '数组缺少右方括号 ]。',
  9: 'JSON 结束后存在多余内容。',
  10: '标准 JSON 不支持注释。',
  11: '注释未结束；标准 JSON 不支持注释。',
  12: '字符串缺少结束双引号。',
  13: '数字不完整，请检查小数或指数。',
  14: 'Unicode 转义必须使用四位十六进制数字。',
  15: '非法转义：反斜杠后仅允许双引号、反斜杠、/、b、f、n、r、t 或 u。',
  16: '字符串中存在未转义的控制字符。',
}
function errorDocument(
  source: string,
  decoded: boolean,
  message: string,
  offset: number,
): JsonDocument {
  const before = source.slice(0, offset).split(/\r\n|\r|\n/)
  const column = before.at(-1)!.length + 1
  const current = source.slice(offset - column + 1).split(/\r\n|\r|\n/)[0]!
  return {
    source,
    decoded,
    error: {
      message,
      offset,
      line: before.length,
      column,
      excerpt: current.slice(Math.max(0, column - 41), column + 80),
    },
  }
}

/** 标准 JSON 校验；仅解码字符串，不执行用户文本。 */
export function readJson(input: string, autoDecode = true): JsonDocument {
  let source = input
  let decoded = false
  for (let layer = 0; layer < 5; layer++) {
    if (source.length > 1_000_000)
      return errorDocument(
        source,
        decoded,
        '文本超过 100 万字符，请拆分后处理。',
        0,
      )
    if (!source.trim()) return { source, decoded }
    let depth = 0
    for (const match of source.matchAll(/"(?:[^"\\]|\\[\s\S])*"|[\[\]{}]/g)) {
      if (match[0] === '{' || match[0] === '[') depth++
      if (match[0] === '}' || match[0] === ']') depth--
      if (depth > 128)
        return errorDocument(
          source,
          decoded,
          '嵌套超过 128 层，请拆分后处理。',
          match.index,
        )
    }
    const errors: ParseError[] = []
    const root = parseTree(source, errors, {
      disallowComments: true,
      allowTrailingComma: false,
    })
    if (autoDecode && layer < 4) {
      let next: unknown
      if (!errors.length && root?.type === 'string') next = root.value
      else if (errors.length && /\\"/.test(source)) {
        try {
          next = JSON.parse(`"${source.trim()}"`)
        } catch {
          /* 保留原始错误 */
        }
      }
      if (typeof next === 'string' && /^[\[{]/.test(next.trim())) {
        source = next
        decoded = true
        continue
      }
      if (typeof next === 'string' && next.trim().startsWith('"')) {
        try {
          const inner: unknown = JSON.parse(next)
          if (typeof inner === 'string' && /^[\[{]/.test(inner.trim())) {
            source = next
            decoded = true
            continue
          }
        } catch {
          /* 普通字符串不展开 */
        }
      }
    }
    if (errors.length) {
      const first = errors[0]!
      return errorDocument(
        source,
        decoded,
        messages[first.error] ?? 'JSON 语法不正确。',
        first.offset,
      )
    }
    return { source, root, decoded }
  }
  return errorDocument(source, decoded, '转义层数过多，请逐层反转义。', 0)
}

/** 使用语法树原文，保留大整数、小数精度、键顺序和重复键。 */
export function renderJson(document: JsonDocument, indent: string): string {
  if (!document.root || document.error) return ''
  function render(node: Node, level: number): string {
    const children = node.children ?? []
    if (node.type === 'property')
      return `${render(children[0]!, level)}:${indent ? ' ' : ''}${render(children[1]!, level)}`
    if (node.type !== 'object' && node.type !== 'array')
      return document.source.slice(node.offset, node.offset + node.length)
    const [open, close] = node.type === 'object' ? ['{', '}'] : ['[', ']']
    if (!children.length) return open! + close!
    const values = children.map(
      (child) =>
        (indent ? indent.repeat(level + 1) : '') + render(child, level + 1),
    )
    return indent
      ? `${open}\n${values.join(',\n')}\n${indent.repeat(level)}${close}`
      : `${open}${values.join(',')}${close}`
  }
  return render(document.root, 0)
}

export function unescapeJson(text: string): string {
  const raw = readJson(text, false)
  if (!raw.error && raw.root?.type === 'string') return String(raw.root.value)
  try {
    const decoded: unknown = JSON.parse(`"${text.trim()}"`)
    if (typeof decoded === 'string' && decoded !== text.trim()) return decoded
  } catch {
    /* 由调用方显示中文错误 */
  }
  throw new Error(
    '没有可反转义的 JSON 字符串。请提供带外层双引号的字符串，或包含反斜杠转义的文本。',
  )
}

/** 用户内容先进行 HTML 转义，高亮标签由程序生成。 */
export function highlightJson(text: string): string {
  const escape = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  const pattern =
    /"(?:[^"\\]|\\[\s\S])*"(?=\s*:)|"(?:[^"\\]|\\[\s\S])*"|\b(?:true|false|null)\b|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g
  let end = 0
  let html = ''
  for (const match of text.matchAll(pattern)) {
    html += escape(text.slice(end, match.index))
    const value = match[0]
    const kind =
      value[0] === '"'
        ? /^\s*:/.test(text.slice(match.index + value.length))
          ? 'key'
          : 'string'
        : value === 'null'
          ? 'null'
          : /^(true|false)$/.test(value)
            ? 'boolean'
            : 'number'
    html += `<span class="json-${kind}">${escape(value)}</span>`
    end = match.index + value.length
  }
  return html + escape(text.slice(end))
}

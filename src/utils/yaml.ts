import { parseDocument, stringify } from 'yaml'

export interface YamlRequest {
  source: string
  direction: 'json-yaml' | 'yaml-json'
  indent: number
}
export function convertYaml({
  source,
  direction,
  indent,
}: YamlRequest): string {
  if (!source.trim()) throw new Error('请输入需要转换的内容。')
  if (source.length > 500000) throw new Error('最多支持 50 万字符。')
  const active = new WeakSet<object>()
  let nodes = 0
  function normalize(value: unknown, depth = 0): unknown {
    if (++nodes > 100000 || depth > 80)
      throw new Error('数据过大或嵌套超过 80 层。')
    if (typeof value === 'bigint') {
      if (
        value > BigInt(Number.MAX_SAFE_INTEGER) ||
        value < BigInt(Number.MIN_SAFE_INTEGER)
      )
        throw new Error('整数超出安全精度，请先改为字符串后转换。')
      return Number(value)
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value))
        throw new Error('JSON 不支持 NaN、Infinity 或溢出的数字。')
      if (Number.isInteger(value) && !Number.isSafeInteger(value))
        throw new Error('整数超出安全精度，请先改为字符串后转换。')
      return value
    }
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'boolean'
    )
      return value
    if (typeof value !== 'object')
      throw new Error('包含 JSON 不支持的数据类型。')
    if (active.has(value))
      throw new Error('存在循环 YAML 别名，无法转换为 JSON。')
    active.add(value)
    let result: unknown
    if (Array.isArray(value))
      result = value.map((item) => normalize(item, depth + 1))
    else {
      const entries =
        value instanceof Map ? [...value.entries()] : Object.entries(value)
      if (entries.some(([key]) => typeof key !== 'string'))
        throw new Error('JSON 对象的键必须是字符串，请给 YAML 键加引号。')
      result = Object.fromEntries(
        entries.map(([key, item]) => [key, normalize(item, depth + 1)]),
      )
    }
    active.delete(value)
    return result
  }
  let value: unknown
  if (direction === 'json-yaml') {
    try {
      value = JSON.parse(source)
    } catch (e) {
      throw new Error(`JSON 语法错误：${(e as Error).message}`)
    }
    // Reject duplicate JSON keys instead of silently keeping only the last value.
    const checked = parseDocument(source, { schema: 'json', uniqueKeys: true })
    if (checked.errors.length)
      throw new Error(`JSON 结构无法无损转换：${checked.errors[0]!.message}`)
  } else {
    const doc = parseDocument(source, {
      version: '1.2',
      schema: 'core',
      intAsBigInt: true,
      uniqueKeys: true,
      resolveKnownTags: false,
      merge: false,
    })
    if (doc.errors.length || doc.warnings.length)
      throw new Error(
        `YAML 解析失败：${(doc.errors[0] ?? doc.warnings[0])!.message}`,
      )
    if (doc.directives?.yaml.version !== '1.2')
      throw new Error('仅支持 YAML 1.2，请移除或修改版本指令。')
    try {
      value = doc.toJS({ mapAsMap: true, maxAliasCount: 50 })
    } catch (e) {
      throw new Error(`YAML 别名展开失败：${(e as Error).message}`)
    }
  }
  const normalized = normalize(value)
  const output =
    direction === 'json-yaml'
      ? stringify(normalized, { indent, lineWidth: 0 })
      : JSON.stringify(normalized, null, indent)
  if (output.length > 2_000_000)
    throw new Error('转换结果超过 200 万字符，请缩小输入。')
  return output
}

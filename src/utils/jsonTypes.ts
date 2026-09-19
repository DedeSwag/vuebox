export interface JsonTypesRequest {
  source: string
  name: string
  readonly: boolean
  optional: boolean
}
const reserved = new Set(
  'any unknown never void string number boolean bigint symbol object null undefined true false class interface type enum export import extends implements new return const let var function default delete typeof keyof infer readonly public private protected static abstract declare namespace module this super await yield break case catch continue debugger do else finally for if in instanceof switch throw try while with package'.split(
    ' ',
  ),
)
export function jsonToTypes(request: JsonTypesRequest): string {
  if (!/^[A-Za-z_$][\w$]*$/.test(request.name) || reserved.has(request.name))
    throw new Error('类型名须为有效的非保留标识符，例如 ApiResponse。')
  if (request.source.length > 500000)
    throw new Error('JSON 最多支持 50 万字符。')
  let value: unknown
  try {
    value = JSON.parse(request.source)
  } catch (e) {
    throw new Error(`JSON 语法错误：${(e as Error).message}`)
  }
  let nodes = 0
  function inspect(item: unknown, depth = 0) {
    if (++nodes > 50000 || depth > 50)
      throw new Error('数据节点过多或嵌套超过 50 层。')
    if (item && typeof item === 'object')
      for (const child of Object.values(item)) inspect(child, depth + 1)
  }
  inspect(value)
  const object = (item: unknown): item is Record<string, unknown> =>
    item !== null && typeof item === 'object' && !Array.isArray(item)
  function infer(values: unknown[], depth: number): string {
    const variants: string[] = []
    for (const kind of ['string', 'number', 'boolean'])
      if (values.some((item) => typeof item === kind)) variants.push(kind)
    if (values.includes(null)) variants.push('null')
    const arrays = values.filter(Array.isArray)
    if (arrays.length)
      variants.push(
        `${request.readonly ? 'ReadonlyArray' : 'Array'}<${infer(arrays.flat(), depth)}>`,
      )
    const objects = values.filter(object)
    if (objects.length) {
      const keys = [...new Set(objects.flatMap((item) => Object.keys(item)))]
      if (!keys.length) variants.push('Record<string, unknown>')
      else {
        const pad = '  '.repeat(depth + 1)
        variants.push(
          `{\n${keys
            .map((key) => {
              const present = objects.filter((item) => Object.hasOwn(item, key))
              const property = /^[A-Za-z_$][\w$]*$/.test(key)
                ? key
                : JSON.stringify(key)
              return `${pad}${request.readonly ? 'readonly ' : ''}${property}${request.optional || present.length !== objects.length ? '?' : ''}: ${infer(
                present.map((item) => item[key]),
                depth + 1,
              )};`
            })
            .join('\n')}\n${'  '.repeat(depth)}}`,
        )
      }
    }
    return variants.join(' | ') || 'unknown'
  }
  const type = infer([value], 0)
  const declaration =
    object(value) && Object.keys(value).length
      ? `export interface ${request.name} ${type}`
      : `export type ${request.name} = ${type};`
  if (declaration.length > 250000)
    throw new Error('生成类型过大，请使用更精简的样本。')
  return declaration + '\n'
}

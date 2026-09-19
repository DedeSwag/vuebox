import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { formatSql } from '../src/utils/sql.ts'
import { convertYaml } from '../src/utils/yaml.ts'
import { jsonToTypes } from '../src/utils/jsonTypes.ts'

test('SQL：方言、关键字、注释、字符串及幂等排版', () => {
  for (const language of [
    'mysql',
    'postgresql',
    'sqlite',
    'transactsql',
    'plsql',
    'sql',
    'bigquery',
    'hive',
  ] as const) {
    const options = {
      source:
        "-- comment\nselect id, 'select  from' as label from users where id=1;",
      language,
      keywordCase: 'upper' as const,
      tabWidth: 2,
    }
    const output = formatSql(options)
    assert.match(output, /SELECT/)
    assert.ok(output.includes("'select  from'"))
    assert.ok(output.includes('-- comment'))
    assert.equal(formatSql({ ...options, source: output }), output)
  }
  assert.throws(
    () =>
      formatSql({
        source: "select 'unterminated",
        language: 'mysql',
        keywordCase: 'upper',
        tabWidth: 2,
      }),
    /无法格式化/,
  )
})
test('YAML：常用数据、危险属性名、日期字符串双向转换', () => {
  const source =
    '{"name":"你好","enabled":true,"date":"2026-01-01","empty":"","values":[1,null,"true"],"__proto__":{"polluted":true}}'
  const yaml = convertYaml({ source, direction: 'json-yaml', indent: 2 })
  const json = convertYaml({ source: yaml, direction: 'yaml-json', indent: 4 })
  assert.deepEqual(JSON.parse(json), JSON.parse(source))
  assert.equal(({} as Record<string, unknown>).polluted, undefined)
  assert.equal(
    convertYaml({ source: 'null', direction: 'yaml-json', indent: 2 }),
    'null',
  )
  assert.equal(
    JSON.parse(
      convertYaml({
        source: 'yes: yes\ndate: 2026-01-01',
        direction: 'yaml-json',
        indent: 2,
      }),
    ).yes,
    'yes',
  )
})
test('YAML：拒绝精度丢失、重复键、多文档、复杂键和非法标签', () => {
  assert.throws(
    () =>
      convertYaml({
        source: '{"x":1,"x":2}',
        direction: 'json-yaml',
        indent: 2,
      }),
    /无损转换/,
  )
  for (const source of [
    'id: 9007199254740993',
    'x: .inf',
    'x: .nan',
    'x: 1\nx: 2',
    'a: 1\n---\nb: 2',
    '? [a,b]\n: value',
    'x: !custom value',
    '1: value',
  ]) {
    assert.throws(
      () => convertYaml({ source, direction: 'yaml-json', indent: 2 }),
      undefined,
      source,
    )
  }
  assert.throws(
    () =>
      convertYaml({
        source: '{"id":9007199254740993}',
        direction: 'json-yaml',
        indent: 2,
      }),
    /安全精度/,
  )
  assert.throws(
    () =>
      convertYaml({ source: '{"x":1e400}', direction: 'json-yaml', indent: 2 }),
    /溢出/,
  )
  assert.throws(
    () =>
      convertYaml({
        source: '%YAML 1.1\n---\nx: yes',
        direction: 'yaml-json',
        indent: 2,
      }),
    /1.2/,
  )
})
test('YAML：普通别名可展开，循环引用与别名放大受到限制', () => {
  assert.deepEqual(
    JSON.parse(
      convertYaml({
        source: 'a: &a [1,2]\nb: *a',
        direction: 'yaml-json',
        indent: 2,
      }),
    ),
    { a: [1, 2], b: [1, 2] },
  )
  assert.throws(
    () =>
      convertYaml({ source: 'a: &a [*a]', direction: 'yaml-json', indent: 2 }),
    /循环|别名/,
  )
  const attack =
    'a: &a [1,2]\nb: &b [*a,*a,*a,*a,*a,*a,*a,*a,*a,*a]\nc: [*b,*b,*b,*b,*b,*b,*b,*b,*b,*b]'
  assert.throws(
    () => convertYaml({ source: attack, direction: 'yaml-json', indent: 2 }),
    /别名/,
  )
})
const typeOptions = { name: 'ApiResponse', readonly: false, optional: false }
test('TS：数组对象合并、可选属性、联合类型、嵌套与特殊键', () => {
  const output = jsonToTypes({
    ...typeOptions,
    source:
      '{"data":[{"id":1,"name":"a","x":null},{"id":"2","active":true}],"bad-key":0,"empty":[]}',
  })
  assert.match(output, /id: string \| number;/)
  assert.match(output, /name\?: string;/)
  assert.match(output, /x\?: null;/)
  assert.match(output, /active\?: boolean;/)
  assert.ok(output.includes('"bad-key": number;'))
  assert.match(output, /empty: Array<unknown>;/)
  const { diagnostics } = ts.transpileModule(output, {
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  })
  assert.equal(diagnostics?.length, 0)
})
test('TS：根基本类型、空对象、只读、空数组与非法名称', () => {
  assert.equal(
    jsonToTypes({ ...typeOptions, source: 'null' }),
    'export type ApiResponse = null;\n',
  )
  assert.match(
    jsonToTypes({ ...typeOptions, source: '{}' }),
    /Record<string, unknown>/,
  )
  assert.match(
    jsonToTypes({
      ...typeOptions,
      source: '{"a":[1,true]}',
      readonly: true,
      optional: true,
    }),
    /readonly a\?: ReadonlyArray<number \| boolean>/,
  )
  for (const name of ['1Type', 'string', 'class', 'Foo;alert(1)'])
    assert.throws(
      () => jsonToTypes({ ...typeOptions, name, source: '{}' }),
      /标识符/,
    )
  assert.throws(
    () =>
      jsonToTypes({
        ...typeOptions,
        source: '['.repeat(52) + '0' + ']'.repeat(52),
      }),
    /嵌套/,
  )
})

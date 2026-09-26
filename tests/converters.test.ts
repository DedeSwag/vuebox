import test from 'node:test'
import assert from 'node:assert/strict'
import { formatSql } from '../src/utils/sql.ts'

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

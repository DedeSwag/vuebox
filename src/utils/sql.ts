import { format, type SqlLanguage, type KeywordCase } from 'sql-formatter'

export interface SqlRequest {
  source: string
  language: SqlLanguage
  keywordCase: KeywordCase
  tabWidth: number
}
export function formatSql(request: SqlRequest): string {
  if (!request.source.trim()) throw new Error('请输入 SQL。')
  if (request.source.length > 200000)
    throw new Error('SQL 最多支持 20 万字符。')
  try {
    return format(request.source, {
      language: request.language,
      keywordCase: request.keywordCase,
      tabWidth: request.tabWidth,
      linesBetweenQueries: 2,
    })
  } catch (e) {
    throw new Error(
      `无法格式化，请检查 SQL 方言与语法：${(e as Error).message}`,
    )
  }
}

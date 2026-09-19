import { CronExpressionParser } from 'cron-parser'

export type CronFormat = 5 | 6
export type FieldMode = 'every' | 'values' | 'range' | 'interval' | 'custom'

// 五位格式省略最前面的秒字段；日期与星期采用 Unix cron 的匹配规则。
export const cronFields = [
  { key: 'second', label: '秒', min: 0, max: 59, hint: '0–59，仅六位格式包含' },
  { key: 'minute', label: '分', min: 0, max: 59, hint: '0–59' },
  { key: 'hour', label: '时', min: 0, max: 23, hint: '0–23，24 小时制' },
  { key: 'day', label: '日', min: 1, max: 31, hint: '1–31，每月的日期' },
  { key: 'month', label: '月', min: 1, max: 12, hint: '1–12' },
  {
    key: 'week',
    label: '周',
    min: 0,
    max: 7,
    hint: '0/7 周日，1–6 周一至周六',
  },
] as const

export type CronField = (typeof cronFields)[number]

export const cronTemplates = [
  { label: '每分钟', expression: '0 * * * * *' },
  { label: '每 5 分钟', expression: '0 */5 * * * *' },
  { label: '每小时', expression: '0 0 * * * *' },
  { label: '每天凌晨', expression: '0 0 0 * * *' },
  { label: '每周一', expression: '0 0 0 * * 1' },
  { label: '每月 1 号', expression: '0 0 0 1 * *' },
  { label: '工作日 9 点', expression: '0 0 9 * * 1-5' },
]

export function getFieldMode(token: string): FieldMode {
  if (token === '*') return 'every'
  if (/^\d+(,\d+)*$/.test(token)) return 'values'
  if (/^\d+-\d+$/.test(token)) return 'range'
  if (/^(\*|\d+)(-\d+)?\/\d+$/.test(token)) return 'interval'
  return 'custom'
}

export function parseCron(text: string): {
  format: CronFormat
  tokens: string[]
} {
  if (!text.trim()) throw new Error('请输入 Cron 表达式。')
  if (text.length > 512)
    throw new Error('表达式过长，请控制在 512 个字符以内。')
  const parts = text.trim().split(/\s+/)
  if (parts.length !== 5 && parts.length !== 6) {
    throw new Error(
      `需要 5 位或 6 位字段，当前为 ${parts.length} 位；字段之间用空格分隔。`,
    )
  }
  const format = parts.length as CronFormat
  const tokens = format === 5 ? ['0', ...parts] : parts
  tokens.forEach((token, index) => {
    const field = cronFields[index]!
    if (!/^[\d*,/\-]+$/.test(token)) {
      throw new Error(
        `${field.label}字段：支持数字及 * , - /，不支持 ?、L、W、#、英文别名或年份。`,
      )
    }
    for (const item of token.split(',')) {
      const match = /^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/.exec(item)
      if (!match)
        throw new Error(`${field.label}字段格式不正确：${item || '空值'}。`)
      const [, base, step] = match
      if (base !== '*') {
        const bounds = base!.split('-').map(Number)
        if (
          bounds.some(
            (value) =>
              !Number.isInteger(value) ||
              value < field.min ||
              value > field.max,
          )
        ) {
          throw new Error(
            `${field.label}字段必须在 ${field.min}–${field.max} 之间。`,
          )
        }
        if (bounds.length === 2 && bounds[0]! > bounds[1]!) {
          throw new Error(`${field.label}字段的范围起点不能大于终点。`)
        }
      }
      if (
        step !== undefined &&
        (Number(step) < 1 || Number(step) > field.max - field.min + 1)
      ) {
        throw new Error(
          `${field.label}字段的间隔必须为 1–${field.max - field.min + 1} 的整数。`,
        )
      }
    }
  })
  try {
    CronExpressionParser.parse(tokens.join(' '))
  } catch {
    throw new Error(
      '表达式无效，请检查日期与月份是否匹配（例如 2 月没有 30 日）。',
    )
  }
  return { format, tokens }
}

export function serializeCron(tokens: string[], format: CronFormat): string {
  return (format === 5 ? tokens.slice(1) : tokens).join(' ')
}

export function convertCron(text: string, format: CronFormat): string {
  const parsed = parseCron(text)
  return serializeCron(parsed.tokens, format)
}

// 固定起算时间便于预览刷新和测试；由 Worker 调用，避免密集计算阻塞表单。
export function nextCronDates(
  text: string,
  count: number,
  currentDate: Date,
  tz: string,
): string[] {
  parseCron(text)
  if (!Number.isInteger(count) || count < 1 || count > 50)
    throw new Error('预览次数须为 1–50 的整数。')
  const iterator = CronExpressionParser.parse(text.trim(), { currentDate, tz })
  return iterator.take(count).map((date) => date.toDate().toISOString())
}

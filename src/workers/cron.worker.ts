import { nextCronDates } from '../utils/cron'

self.onmessage = (
  event: MessageEvent<{
    id: number
    expression: string
    count: number
    now: string
    tz: string
  }>,
) => {
  const { id, expression, count, now, tz } = event.data
  try {
    self.postMessage({
      id,
      dates: nextCronDates(expression, count, new Date(now), tz),
      error: '',
    })
  } catch {
    self.postMessage({
      id,
      dates: [],
      error:
        '无法计算后续执行时间，请检查日期组合是否可执行，或尝试减少预览次数。',
    })
  }
}

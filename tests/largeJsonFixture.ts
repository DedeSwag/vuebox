import { existsSync, readFileSync } from 'node:fs'

/** Prefer the user's local sample; keep clean checkouts independently testable. */
export function largeJsonFixture(): string {
  const path = new URL('../docs/longtest.json', import.meta.url)
  if (existsSync(path)) return readFileSync(path, 'utf8')
  return JSON.stringify(
    {
      code: 200,
      data: Array.from({ length: 1500 }, (_, id) => ({
        id,
        name: `测试条目 ${id}`,
        enabled: id % 2 === 0,
        location: { x: 100 + id / 1000, y: 20 + id / 1000 },
        tags: ['开发', '回归'],
        optional: null,
      })),
    },
    null,
    2,
  )
}

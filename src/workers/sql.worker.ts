import { formatSql, type SqlRequest } from '../utils/sql'
self.onmessage = (event: MessageEvent<SqlRequest>) => {
  try {
    self.postMessage({ result: formatSql(event.data) })
  } catch (e) {
    self.postMessage({ error: (e as Error).message })
  }
}

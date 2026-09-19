import { compareText, type DiffRequest } from '../utils/textDiff'
self.onmessage = (event: MessageEvent<DiffRequest>) => {
  try {
    self.postMessage({ result: compareText(event.data) })
  } catch (error) {
    self.postMessage({ error: (error as Error).message })
  }
}

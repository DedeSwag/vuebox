import { testRegex, type RegexRequest } from '../utils/regex'
self.onmessage = (event: MessageEvent<RegexRequest>) => {
  try {
    self.postMessage({ result: testRegex(event.data) })
  } catch (e) {
    self.postMessage({ error: (e as Error).message })
  }
}

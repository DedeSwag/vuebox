import { jsonToTypes, type JsonTypesRequest } from '../utils/jsonTypes'
self.onmessage = (event: MessageEvent<JsonTypesRequest>) => {
  try {
    self.postMessage({ result: jsonToTypes(event.data) })
  } catch (e) {
    self.postMessage({ error: (e as Error).message })
  }
}

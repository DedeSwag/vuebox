import { convertYaml, type YamlRequest } from '../utils/yaml'
self.onmessage = (event: MessageEvent<YamlRequest>) => {
  try {
    self.postMessage({ result: convertYaml(event.data) })
  } catch (e) {
    self.postMessage({ error: (e as Error).message })
  }
}

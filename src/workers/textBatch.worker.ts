import { processLines, type TextBatchOptions } from '../utils/textBatch'
self.onmessage = (
  event: MessageEvent<{ text: string; options: TextBatchOptions }>,
) => {
  try {
    self.postMessage({
      result: processLines(event.data.text, event.data.options),
    })
  } catch (e) {
    self.postMessage({ error: (e as Error).message })
  }
}

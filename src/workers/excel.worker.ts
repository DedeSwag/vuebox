import { convertExcel, readExcelSheets, maxExcelBytes, type ExcelRequest, type ExcelMetadataRequest } from '../utils/excel'
self.onmessage = async (event: MessageEvent<ExcelRequest | ExcelMetadataRequest>) => {
  try {
    const { file } = event.data
    if (file.size > maxExcelBytes) throw new Error('Excel 文件最大支持 10 MiB。')
    const buffer = await file.arrayBuffer()
    self.postMessage({ result: 'options' in event.data ? convertExcel(buffer, event.data.options) : readExcelSheets(buffer) })
  } catch (reason) {
    self.postMessage({ error: (reason as Error).message })
  }
}

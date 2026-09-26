import { convertExcel, maxExcelBytes, type ExcelRequest } from '../utils/excel'
self.onmessage = async (event: MessageEvent<ExcelRequest>) => {
  try {
    const { file, options } = event.data
    if (file.size > maxExcelBytes) throw new Error('Excel 文件最大支持 10 MiB。')
    self.postMessage({ result: convertExcel(await file.arrayBuffer(), options) })
  } catch (reason) {
    self.postMessage({ error: (reason as Error).message })
  }
}

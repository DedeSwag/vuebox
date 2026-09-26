import * as XLSX from 'xlsx'

export type JsonCell = string | number | boolean | null
export interface ExcelOptions {
  sheetName: string
  mode: 'objects' | 'arrays'
  startRow: number
  values: 'typed' | 'text'
  skipBlank: boolean
  indent: 0 | 2 | 4
}
export interface ExcelRequest { file: File; options: ExcelOptions }
export interface ExcelResult {
  sheets: string[]
  sheetName: string
  headers: string[]
  preview: JsonCell[][]
  rowCount: number
  columnCount: number
  json: string
  warnings: string[]
}
export const maxExcelBytes = 10 * 1024 * 1024
const maxRows = 50_000, maxColumns = 256, maxCells = 500_000

/** 原始表头全部预留，生成的后缀不能占用后续真实表头。 */
export function uniqueHeaders(values: string[]): string[] {
  const names = values.map((value, i) => value.trim() || `列_${i + 1}`)
  const reserved = new Set(names), used = new Set<string>()
  return names.map(name => {
    let key = name, suffix = 2
    while (used.has(key)) {
      do { key = `${name}_${suffix++}` } while (reserved.has(key) || used.has(key))
    }
    used.add(key)
    return key
  })
}

export function convertWorksheet(sheet: XLSX.WorkSheet, options: ExcelOptions): Omit<ExcelResult, 'sheets' | 'sheetName'> {
  if (!Number.isInteger(options.startRow) || options.startRow < 1 || options.startRow > maxRows)
    throw new Error('起始行必须是 1–50000 之间的整数。')
  if (!['objects', 'arrays'].includes(options.mode) || !['typed', 'text'].includes(options.values) || ![0, 2, 4].includes(options.indent))
    throw new Error('转换选项无效。')
  if (!sheet['!ref']) return { headers: [], preview: [], rowCount: 0, columnCount: 0, json: '[]', warnings: ['当前工作表为空。'] }
  const range = XLSX.utils.decode_range(sheet['!fullref'] ?? sheet['!ref'])
  const columnCount = range.e.c - range.s.c + 1
  if (range.e.r >= maxRows || columnCount > maxColumns || (range.e.r + 1) * columnCount > maxCells)
    throw new Error('工作表过大：最多支持 50000 行、256 列，矩形数据范围不超过 50 万个单元格。请拆分后重试。')
  if (options.startRow > range.e.r + 1) throw new Error('起始行超出当前工作表的数据范围。')
  let missingFormula = 0, errorCells = 0, unsafeNumbers = 0
  const valueAt = (r: number, c: number, forceText = false): JsonCell => {
    const cell = sheet[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined
    if (!cell) return null
    if (cell.f && cell.v == null) { missingFormula++; return null }
    if (cell.t === 'e') { errorCells++; return cell.w ?? XLSX.utils.format_cell(cell) ?? '#ERROR!' }
    if (cell.v == null || cell.t === 'z') return null
    if (typeof cell.v === 'number' && Number.isInteger(cell.v) && !Number.isSafeInteger(cell.v)) unsafeNumbers++
    if (forceText || options.values === 'text' || cell.t === 'd' || (cell.t === 'n' && typeof cell.z === 'string' && XLSX.SSF.is_date(cell.z)))
      return cell.w ?? XLSX.utils.format_cell(cell)
    if (typeof cell.v === 'number') return Number.isFinite(cell.v) ? cell.v : null
    if (typeof cell.v === 'boolean') return cell.v
    return String(cell.v)
  }
  const columns = Array.from({ length: columnCount }, (_, i) => range.s.c + i)
  const rawHeaders = options.mode === 'objects' ? columns.map(c => String(valueAt(options.startRow - 1, c, true) ?? '')) : []
  const headers = options.mode === 'objects' ? uniqueHeaders(rawHeaders) : columns.map(c => XLSX.utils.encode_col(c))
  const preview: JsonCell[][] = [], records: (JsonCell[] | Record<string, JsonCell>)[] = []
  for (let r = options.startRow - (options.mode === 'arrays' ? 1 : 0); r <= range.e.r; r++) {
    const row = columns.map(c => valueAt(r, c))
    if (options.skipBlank && row.every(value => value === null || value === '')) continue
    if (preview.length < 50) preview.push(row)
    records.push(options.mode === 'arrays' ? row : Object.fromEntries(headers.map((key, i) => [key, row[i]!])) )
  }
  const json = JSON.stringify(records, null, options.indent)
  if (json.length > 20_000_000) throw new Error('JSON 结果超过 2000 万字符，请拆分工作表后重试。')
  const warnings: string[] = []
  if (rawHeaders.some((header, i) => header !== headers[i])) warnings.push('空白、重复或带首尾空格的表头已自动整理，请核对预览中的字段名。')
  if (sheet['!merges']?.length) warnings.push('工作表包含合并单元格，仅保留左上角的值，不自动填充合并区域。')
  if (missingFormula) warnings.push(`${missingFormula} 个公式单元格没有已保存结果，已输出 null；请在 Excel 中重算并保存后重新导入。`)
  if (errorCells) warnings.push(`${errorCells} 个错误单元格保留为错误文本。`)
  if (unsafeNumbers) warnings.push('存在超出安全整数范围的数字，可能已有精度损失；请在 Excel 中将长编号保存为文本后再导入。')
  return { headers, preview, rowCount: records.length, columnCount, json, warnings }
}

export function convertExcel(buffer: ArrayBuffer, options: ExcelOptions): ExcelResult {
  if (!buffer.byteLength) throw new Error('文件为空，请选择有效的 Excel 文件。')
  if (buffer.byteLength > maxExcelBytes) throw new Error('Excel 文件最大支持 10 MiB。')
  const bytes = new Uint8Array(buffer)
  const zip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4
  const ole = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].every((v, i) => bytes[i] === v)
  if (!zip && !ole) throw new Error('文件不是有效的 .xlsx 或 .xls 工作簿，请勿直接修改文件后缀。')
  let workbook: XLSX.WorkBook
  try {
    // 先取名称，再只读取所选表；行数限制同时保留 !fullref，超限时明确拒绝而非截断导出。
    const info = XLSX.read(buffer, { type: 'array', bookSheets: true })
    if (!info.SheetNames.length) throw new Error('empty workbook')
    const name = options.sheetName || info.SheetNames[0]!
    if (!info.SheetNames.includes(name)) throw new Error('missing sheet')
    workbook = XLSX.read(buffer, {
      type: 'array', sheets: info.SheetNames.indexOf(name), cellNF: true, cellText: true,
      cellDates: false, cellFormula: true, cellHTML: false, sheetRows: maxRows + 1,
    })
    const sheet = workbook.Sheets[name]
    if (!sheet) throw new Error('missing sheet data')
  } catch {
    throw new Error('无法读取工作簿或所选工作表。请确认文件未损坏、未加密，并使用 Excel 另存为 .xlsx 后重试。')
  }
  const sheetName = options.sheetName || workbook.SheetNames[0]!
  return { ...convertWorksheet(workbook.Sheets[sheetName]!, options), sheets: workbook.SheetNames, sheetName }
}

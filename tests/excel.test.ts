import test from 'node:test'
import assert from 'node:assert/strict'
import * as XLSX from 'xlsx'
import { convertExcel, convertWorksheet, uniqueHeaders, maxExcelBytes, type ExcelOptions } from '../src/utils/excel.ts'

const defaults: ExcelOptions = { sheetName: '', mode: 'objects', startRow: 1, values: 'typed', skipBlank: true, indent: 2 }
function fixture(bookType: 'xlsx' | 'xls' = 'xlsx') {
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet([
    ['编号', '姓名', '金额', '启用', '日期', '备注', '公式'],
    ['00123', '张三', 12.5, true, 45292, null, 25],
    [null, null, null, null, null, null, null],
    ['00456', '李四', 0, false, 45293, '<script>alert(1)</script>', null],
  ])
  sheet.E2!.z = 'yyyy-mm-dd'; sheet.E4!.z = 'yyyy-mm-dd'
  sheet.C2!.z = '0.00'; sheet.G2!.f = 'C2*2'
  sheet.G4 = { t: 'n', f: 'C4*2' }
  XLSX.utils.book_append_sheet(workbook, sheet, '用户')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['城市'], ['上海']]), '地区')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), '空表')
  return XLSX.write(workbook, { bookType, type: 'array' }) as ArrayBuffer
}

test('Excel：XLSX / XLS 真文件往返，保留数字、布尔值、中文、前导零与缓存公式', () => {
  for (const format of ['xlsx', 'xls'] as const) {
    const result = convertExcel(fixture(format), defaults)
    assert.deepEqual(result.sheets, ['用户', '地区', '空表'])
    assert.equal(result.rowCount, 2)
    const rows = JSON.parse(result.json)
    assert.deepEqual(rows[0], { 编号: '00123', 姓名: '张三', 金额: 12.5, 启用: true, 日期: '2024-01-01', 备注: null, 公式: 25 })
    assert.equal(rows[1].启用, false)
    assert.equal(rows[1].金额, 0)
    assert.equal(rows[1].备注, '<script>alert(1)</script>')
    if (format === 'xlsx') {
      assert.equal(rows[1].公式, null)
      assert.match(result.warnings.join(''), /没有已保存结果/)
    }
    assert.deepEqual(JSON.parse(convertExcel(fixture(format), { ...defaults, sheetName: '地区' }).json), [{ 城市: '上海' }])
  }
})

test('Excel：空工作表、二维数组、起始行、空行保留和显示文本', () => {
  const buffer = fixture()
  assert.equal(convertExcel(buffer, { ...defaults, sheetName: '空表' }).json, '[]')
  const arrays = JSON.parse(convertExcel(buffer, { ...defaults, mode: 'arrays', skipBlank: false }).json)
  assert.equal(arrays.length, 4)
  assert.deepEqual(arrays[2], Array(7).fill(null))
  const text = JSON.parse(convertExcel(buffer, { ...defaults, values: 'text' }).json)
  assert.equal(text[0].金额, '12.50')
  assert.equal(text[1].启用, 'FALSE')
  const sheet = XLSX.utils.aoa_to_sheet([['报表说明'], ['名称', '数量'], ['苹果', 3]])
  assert.deepEqual(JSON.parse(convertWorksheet(sheet, { ...defaults, startRow: 2 }).json), [{ 名称: '苹果', 数量: 3 }])
  assert.deepEqual(JSON.parse(convertWorksheet(sheet, { ...defaults, startRow: 3, mode: 'arrays' }).json), [['苹果', 3]])
})

test('Excel：重复表头不覆盖后续真实字段，特殊键不修改原型', () => {
  const names = ['名称', '名称', '名称_2', '', '列_4', '__proto__', 'constructor', ' 名称 ']
  const headers = uniqueHeaders(names)
  assert.deepEqual(headers, ['名称', '名称_3', '名称_2', '列_4', '列_4_2', '__proto__', 'constructor', '名称_4'])
  const sheet = XLSX.utils.aoa_to_sheet([names, [1, 2, 3, 4, 5, '安全文本', 7, 8]])
  const result = convertWorksheet(sheet, defaults)
  const row = JSON.parse(result.json)[0]
  assert.equal(row.__proto__, '安全文本')
  assert.equal(row.名称_2, 3)
  assert.equal(Object.keys(row).length, 8)
  assert.match(result.warnings.join(''), /表头/)
})

test('Excel：缺失公式缓存、错误、合并区域及超精度整数给出提示', () => {
  const sheet = XLSX.utils.aoa_to_sheet([['公式', '错误', '长编号'], [null, null, 9007199254740992]])
  sheet.A2 = { t: 'n', f: '1+1' }
  sheet.B2 = { t: 'e', v: 7, w: '#DIV/0!' }
  sheet['!merges'] = [XLSX.utils.decode_range('A3:B3')]
  const result = convertWorksheet(sheet, defaults)
  assert.deepEqual(JSON.parse(result.json)[0], { 公式: null, 错误: '#DIV/0!', 长编号: 9007199254740992 })
  assert.match(result.warnings.join(''), /没有已保存结果/)
  assert.match(result.warnings.join(''), /错误单元格/)
  assert.match(result.warnings.join(''), /合并/)
  assert.match(result.warnings.join(''), /精度/)
})

test('Excel：1904 日期系统按工作簿显示值输出，预览不截断导出', () => {
  const workbook = XLSX.utils.book_new()
  workbook.Workbook = { WBProps: { date1904: true } }
  const sheet = XLSX.utils.aoa_to_sheet([['日期'], [0]])
  sheet.A2!.z = 'yyyy-mm-dd'
  XLSX.utils.book_append_sheet(workbook, sheet, '日期')
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  assert.equal(JSON.parse(convertExcel(buffer, defaults).json)[0].日期, '1904-01-01')
  const long = convertWorksheet(XLSX.utils.aoa_to_sheet([['序号'], ...Array.from({ length: 100 }, (_, i) => [i])]), defaults)
  assert.equal(long.preview.length, 50)
  assert.equal(JSON.parse(long.json).length, 100)
})

test('Excel：拒绝伪造文件、超限数据及无效选项，不静默截断', () => {
  assert.throws(() => convertExcel(new ArrayBuffer(0), defaults), /为空/)
  assert.throws(() => convertExcel(new ArrayBuffer(maxExcelBytes + 1), defaults), /10 MiB/)
  assert.throws(() => convertExcel(new TextEncoder().encode('a,b\n1,2').buffer, defaults), /不是有效/)
  assert.throws(() => convertExcel(new Uint8Array([0x50, 0x4b, 3, 4]).buffer, defaults), /无法读取/)
  assert.throws(() => convertExcel(fixture(), { ...defaults, sheetName: '不存在' }), /无法读取/)
  for (const startRow of [0, 1.5, NaN, 50001]) assert.throws(() => convertWorksheet({}, { ...defaults, startRow }), /起始行/)
  assert.throws(() => convertWorksheet({ '!ref': 'A1:A2' }, { ...defaults, startRow: 3 }), /超出/)
  for (const ref of ['A1:IW2', 'A1:A50001', 'A1:Z30000']) assert.throws(() => convertWorksheet({ '!ref': ref }, defaults), /过大/)
  assert.throws(() => convertWorksheet({ '!ref': 'A1:A2', '!fullref': 'A1:A99999' }, defaults), /过大/)
})

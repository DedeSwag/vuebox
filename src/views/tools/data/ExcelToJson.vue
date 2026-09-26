<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import DevTool from '@/components/DevTool.vue'
import { useLocalClipboard } from '@/composables/useLocalClipboard'
import { useWorkerTask } from '@/composables/useWorkerTask'
import type { ExcelOptions, ExcelRequest, ExcelResult } from '@/utils/excel'

const file = shallowRef<File>()
const sheets = ref<string[]>([])
const sheetName = ref('')
const mode = ref<ExcelOptions['mode']>('objects')
const startRow = ref(1)
const values = ref<ExcelOptions['values']>('typed')
const skipBlank = ref(true)
const indent = ref<ExcelOptions['indent']>(2)
const inputError = ref('')
const downloadUrl = ref('')
const { copy, feedback } = useLocalClipboard()
const { result, busy, error, run, reset } = useWorkerTask<ExcelRequest, ExcelResult>(
  () => new Worker(new URL('../../../workers/excel.worker.ts', import.meta.url), { type: 'module' }),
  20000,
)
const jsonPreview = computed(() => result.value?.json.slice(0, 100_000) ?? '')
const downloadName = computed(() => `${file.value?.name.replace(/\.[^.]+$/, '') ?? '表格'}-${result.value?.sheetName ?? '工作表'}.json`.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_'))
function releaseDownload() {
  if (downloadUrl.value) URL.revokeObjectURL(downloadUrl.value)
  downloadUrl.value = ''
}
watch(result, current => {
  releaseDownload()
  if (!current) return
  sheets.value = current.sheets
  downloadUrl.value = URL.createObjectURL(new Blob([current.json], { type: 'application/json;charset=utf-8' }))
}, { flush: 'sync' })
function convert() {
  feedback.value = ''
  if (!file.value || inputError.value) return
  run({ file: file.value, options: { sheetName: sheetName.value, mode: mode.value, startRow: startRow.value, values: values.value, skipBlank: skipBlank.value, indent: indent.value } })
}
watch([file, sheetName, mode, startRow, values, skipBlank, indent], convert)
function clear() {
  file.value = undefined; sheets.value = []; sheetName.value = ''; inputError.value = ''; feedback.value = ''
  reset(); releaseDownload()
}
function load(selected: File) {
  clear()
  if (!/\.(xlsx|xls)$/i.test(selected.name)) { inputError.value = '请选择 .xlsx 或 .xls 文件。'; return }
  if (!selected.size) { inputError.value = '文件为空，请选择有效的 Excel 文件。'; return }
  if (selected.size > 10 * 1024 * 1024) { inputError.value = 'Excel 文件最大支持 10 MiB。'; return }
  startRow.value = 1
  file.value = selected
}
function selectFile(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.[0]) load(input.files[0])
  input.value = ''
}
function drop(event: DragEvent) {
  const files = event.dataTransfer?.files
  if (!files?.length) return
  if (files.length !== 1) { clear(); inputError.value = '请每次选择一个 Excel 文件。'; return }
  load(files[0])
}
function changeSheet(event: Event) { sheetName.value = (event.target as HTMLSelectElement).value; startRow.value = 1 }
function cancel() { reset(); feedback.value = '已取消转换，可点击“重新转换”重试。' }
onBeforeUnmount(releaseDownload)
</script>

<template>
  <DevTool title="Excel 转 JSON" description="选择 Excel 工作表，转换为对象数组或二维数组 · 文件仅在浏览器本地处理" wide>
    <div class="upload" @dragover.prevent @drop.prevent="drop">
      <label for="excel-file">选择或拖入 Excel 文件<input id="excel-file" type="file" accept=".xlsx,.xls" @change="selectFile" /></label>
      <p class="muted">支持 .xlsx / .xls，最大 10 MiB</p>
      <button @click="clear">清空</button>
    </div>
    <p v-if="file" class="file-name muted">{{ file.name }} · {{ (file.size / 1024).toFixed(1) }} KiB</p>
    <div class="settings box">
      <label>工作表<select :value="sheetName || result?.sheetName || sheets[0] || ''" :disabled="!sheets.length" @change="changeSheet"><option v-if="!sheets.length" value="">请先导入 Excel</option><option v-for="sheet in sheets" :key="sheet" :value="sheet">{{ sheet }}</option></select></label>
      <label>输出结构<select v-model="mode"><option value="objects">对象数组（起始行作为表头）</option><option value="arrays">二维数组（包含起始行）</option></select></label>
      <label>{{ mode === 'objects' ? '表头所在行' : '数据起始行' }}<input v-model.number="startRow" type="number" min="1" max="50000" step="1" /></label>
      <label>单元格值<select v-model="values"><option value="typed">保留数字和布尔类型</option><option value="text">按 Excel 显示文本</option></select></label>
      <label>JSON 缩进<select v-model.number="indent"><option :value="2">2 空格</option><option :value="4">4 空格</option><option :value="0">压缩</option></select></label>
      <label class="check"><input v-model="skipBlank" type="checkbox" />跳过空行</label>
    </div>
    <div class="controls actions"><button :disabled="!file || busy" @click="convert">重新转换</button><button v-if="busy" @click="cancel">取消转换</button><span v-if="busy" role="status">正在本地读取并转换…</span><span v-else-if="result" class="muted">{{ result.sheetName }} · {{ result.rowCount.toLocaleString() }} 条数据 · {{ result.columnCount }} 列</span></div>
    <p v-if="inputError || error" class="error" role="alert">{{ inputError || error }}</p>
    <div v-if="result?.warnings.length" class="note" role="status"><p v-for="warning in result.warnings" :key="warning">{{ warning }}</p></div>
    <div class="two-col">
      <section class="box">
        <div class="box-head"><h2>数据预览</h2><span class="muted">前 50 行 / 20 列</span></div>
        <div v-if="result && result.columnCount" class="table-wrap preview-table"><table><thead><tr><th v-for="(header, index) in result.headers.slice(0, 20)" :key="index">{{ header }}</th></tr></thead><tbody><tr v-for="(row, rowIndex) in result.preview" :key="rowIndex"><td v-for="(value, columnIndex) in row.slice(0, 20)" :key="columnIndex" :title="String(value)"><span v-if="value === null" class="null-value">null</span><template v-else>{{ String(value) }}</template></td></tr></tbody></table></div>
        <p v-if="result && !result.rowCount" class="muted empty">没有可导出的数据行。</p>
        <p v-if="!result" class="muted empty">导入文件后显示所选工作表的数据</p>
      </section>
      <section class="box">
        <div class="box-head"><h2><label for="excel-json">JSON 结果</label></h2><div class="result-actions"><button :disabled="!result" @click="copy(result!.json)">复制 JSON</button><a v-if="downloadUrl" :href="downloadUrl" :download="downloadName">下载 JSON</a></div></div>
        <textarea id="excel-json" :value="jsonPreview" readonly spellcheck="false" placeholder="转换后显示 JSON" />
        <p v-if="result" class="muted result-size">共 {{ result.json.length.toLocaleString() }} 字符{{ result.json.length > 100_000 ? '；预览仅展示前 10 万字符，复制和下载包含完整结果。' : '' }}</p>
      </section>
    </div>
    <p class="feedback" role="status">{{ feedback }}</p>
    <details class="note"><summary>转换规则与限制</summary><ul>
      <li>对象数组以指定行作为字段名；空表头使用“列_序号”，重复字段自动加后缀。二维数组保留起始行。</li>
      <li>空单元格输出 null；日期与时间按单元格显示文本输出，不附加时区。保留类型模式下，百分比等数字输出原值；显示文本模式保留前导零和格式。</li>
      <li>公式仅使用文件中已保存的结果，不重新计算；无结果输出 null。合并单元格不自动填充，隐藏行列仍参与转换。</li>
      <li>每张表最多 50000 行、256 列，矩形数据范围最多 50 万格；JSON 最多 2000 万字符。预览有截断，复制及下载为所选工作表的完整转换结果。</li>
    </ul></details>
  </DevTool>
</template>

<style scoped>
.upload { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; padding: 16px; border: 1px dashed var(--accent-border); border-radius: 10px; background: var(--accent-bg); }
.upload label { flex: 1 1 260px; min-width: 0; }
.upload input { width: 100%; }
.upload p { flex: 1; }
.file-name { margin: 12px 0; overflow-wrap: anywhere; }
.settings { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-top: 18px; }
.settings select { width: 100%; }
.settings .check { align-self: end; min-height: 38px; }
.actions { margin-top: 16px; }
.result-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.result-actions a { font-size: 13px; }
.preview-table { max-height: 430px; margin-top: 0; }
.preview-table th { position: sticky; top: 0; background: var(--bg); }
.preview-table td, .preview-table th { min-width: 80px; max-width: 240px; white-space: pre-wrap; }
.preview-table td { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.null-value { color: var(--text); font-style: italic; opacity: .65; }
#excel-json { min-height: 430px; font-family: var(--mono); }
.result-size { margin-top: 12px; }
.empty { padding: 32px 0; text-align: center; }
.note p + p { margin-top: 6px; }
.note ul { padding-left: 20px; }
@media (max-width: 768px) { .settings { grid-template-columns: minmax(0, 1fr); } #excel-json { min-height: 300px; } }
</style>

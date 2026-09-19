<script setup lang="ts">
import { computed, ref } from 'vue'
import { decodeText, encodeText, parseUrl, rebuildQuery } from '@/utils/url'
import type { EncodingMode, QueryEntry } from '@/utils/url'

const input = ref('')
const entries = ref<(QueryEntry & { id: number })[]>([])
let nextId = 0
const parsed = computed(() => parseUrl(input.value))
const finalUrl = computed(() => parsed.value.url?.href ?? '')
const emit = defineEmits<{ notify: [message: string] }>()
const fields = computed(() => {
  const url = parsed.value.url
  return [
    ['协议', url?.protocol], ['域名', url?.hostname],
    ['端口', url ? url.port || '默认 / 未指定' : ''],
    ['路径', url?.pathname], ['Query', url?.search], ['Hash', url?.hash],
  ]
})
function setInput(value: string) {
  input.value = value
  entries.value = Array.from(parsed.value.url?.searchParams.entries() ?? [], ([key, value]) => ({ id: nextId++, key, value }))
}
function syncQuery() {
  if (!parsed.value.url) return
  input.value = rebuildQuery(parsed.value.url, entries.value)
}
function addEntry() {
  entries.value.push({ id: nextId++, key: '', value: '' })
  syncQuery()
}
function removeEntry(id: number) {
  entries.value = entries.value.filter(entry => entry.id !== id)
  syncQuery()
}
const mode = ref<EncodingMode>('component')
const operation = ref<'encode' | 'decode'>('encode')
const codecInput = ref('')
const codec = computed(() => {
  try {
    return { output: (operation.value === 'encode' ? encodeText : decodeText)(codecInput.value, mode.value), error: '' }
  } catch {
    return { output: '', error: operation.value === 'decode' ? '解码失败：请检查 % 编码是否完整，以及内容是否为有效 UTF-8。' : '编码失败：输入包含不完整的 Unicode 字符。' }
  }
})
async function copy(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value)
    emit('notify', `${label}已复制`)
  } catch {
    emit('notify', '复制失败，请选中文本后手动复制。')
  }
}
function copyParsed() {
  const url = parsed.value.url
  if (!url) return
  void copy(JSON.stringify({ URL: url.href, 协议: url.protocol, 域名: url.hostname, 端口: url.port, 路径: url.pathname, query: url.search, 参数: entries.value.map(({ key, value }) => ({ key, value })), hash: url.hash }, null, 2), '解析结果')
}
function clearAll() {
  setInput('')
  codecInput.value = ''
}
</script>

<template>
  <div class="url-tool">
    <div class="toolbar">
      <span class="badge">本地运算 · 实时联动</span>
      <div class="actions">
        <button @click="setInput('https://example.com:8080/search?q=Vue%203&tag=前端&tag=工具&empty=#results')">载入示例</button>
        <button @click="clearAll">清空全部</button>
      </div>
    </div>
    <div class="workspace">
      <div class="column">
        <section class="panel">
          <div class="panel-heading"><h2>URL 输入</h2><button @click="setInput('')">清空</button></div>
          <div class="content">
            <label for="url-input">粘贴完整 URL</label>
            <textarea id="url-input" :value="input" rows="5" spellcheck="false" placeholder="https://example.com/path?key=value#section" :aria-invalid="!!parsed.error" aria-describedby="url-status" @input="setInput(($event.target as HTMLTextAreaElement).value)" />
            <p id="url-status" class="hint" :class="{ error: parsed.error }" role="status">{{ parsed.error || (parsed.url ? '解析成功，修改右侧参数即可同步更新 URL。' : '输入包含协议的绝对地址，解析结果会实时显示。') }}</p>
          </div>
        </section>
        <section class="panel">
          <div class="panel-heading"><h2>结构解析</h2><button :disabled="!parsed.url" @click="copyParsed">复制解析结果</button></div>
          <dl class="fields"><div v-for="[name, value] in fields" :key="name"><dt>{{ name }}</dt><dd>{{ value || '—' }}</dd></div></dl>
        </section>
      </div>
      <div class="column">
        <section class="panel query-panel">
          <div class="panel-heading"><h2>Query 参数 <span>{{ entries.length }}</span></h2><button :disabled="!parsed.url" @click="addEntry">＋ 新增参数</button></div>
          <div class="table-wrap">
            <table>
              <caption class="sr-only">可编辑的 Query 参数，允许重复键和空值</caption>
              <thead><tr><th scope="col">参数名</th><th scope="col">参数值</th><th scope="col" class="delete-cell">操作</th></tr></thead>
              <tbody>
                <tr v-for="(entry, index) in entries" :key="entry.id">
                  <td><input v-model="entry.key" :aria-label="`第 ${index + 1} 行参数名`" placeholder="参数名" spellcheck="false" @input="syncQuery" /></td>
                  <td><input v-model="entry.value" :aria-label="`第 ${index + 1} 行参数值`" placeholder="参数值（可为空）" spellcheck="false" @input="syncQuery" /></td>
                  <td class="delete-cell"><button :aria-label="`删除第 ${index + 1} 行参数`" @click="removeEntry(entry.id)">删除</button></td>
                </tr>
                <tr v-if="!entries.length"><td colspan="3" class="empty">{{ parsed.url ? '暂无参数，点击“新增参数”开始编辑。' : '输入有效 URL 后，在这里编辑参数。' }}</td></tr>
              </tbody>
            </table>
          </div>
          <p class="hint query-hint">直接填写原文；支持重复键、空键和空值。编辑后按表单规则编码，空格转为 +，加号转为 %2B。</p>
        </section>
        <section class="panel">
          <div class="panel-heading"><h2>最终 URL</h2><button class="primary" :disabled="!finalUrl" @click="copy(finalUrl, '最终 URL')">复制 URL</button></div>
          <div class="content"><textarea :value="finalUrl" aria-label="最终 URL" readonly rows="4" placeholder="拼装后的完整 URL 将显示在这里" /><p class="hint">由浏览器标准化地址；默认端口会省略，中文路径会编码。仅处理文本，不访问输入的网址。</p></div>
        </section>
      </div>
    </div>
    <section class="panel codec-panel">
      <div class="panel-heading"><h2>URL 编码 / 解码</h2><button @click="codecInput = ''">清空文本</button></div>
      <div class="content">
        <div class="codec-options">
          <label>编码模式<select v-model="mode"><option value="component">普通编码（encodeURIComponent）</option><option value="form">表单编码（application/x-www-form-urlencoded）</option></select></label>
          <div class="actions"><button :class="{ primary: operation === 'encode' }" :aria-pressed="operation === 'encode'" @click="operation = 'encode'">URL 编码</button><button :class="{ primary: operation === 'decode' }" :aria-pressed="operation === 'decode'" @click="operation = 'decode'">URL 解码</button></div>
        </div>
        <p class="hint">{{ mode === 'component' ? '对文本或参数组件编码：空格 → %20；解码时保留 +。完整 URL 的 : / ? 等分隔符也会编码。' : '对单个表单键或值编码：空格 → +，加号 → %2B；解码时将 + 还原为空格。' }}</p>
        <div class="codec-editors">
          <div><label for="codec-input">原始文本</label><textarea id="codec-input" v-model="codecInput" rows="5" spellcheck="false" placeholder="输入需要编码或解码的文本" :aria-invalid="!!codec.error" aria-describedby="codec-status" /></div>
          <div><label for="codec-output">转换结果</label><textarea id="codec-output" :value="codec.output" rows="5" readonly placeholder="转换结果实时显示" /></div>
        </div>
        <div class="codec-footer"><p id="codec-status" class="hint error" role="status">{{ codec.error }}</p><button :disabled="!codec.output || !!codec.error" @click="copy(codec.output, '转换结果')">复制转换结果</button></div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.toolbar, .actions, .panel-heading, .codec-options, .codec-footer { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.toolbar, .panel-heading, .codec-footer { justify-content: space-between; }
.toolbar { margin-bottom: 18px; }
.badge { font-size: 12px; color: var(--accent); background: var(--accent-bg); padding: 5px 10px; border-radius: 5px; }
.workspace, .codec-editors { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.column { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
.panel { border: 1px solid var(--border); border-radius: 9px; min-width: 0; overflow: hidden; }
.panel-heading { padding: 12px 14px; border-bottom: 1px solid var(--border); background: var(--social-bg); }
h2 { font-size: 14px; margin: 0; }
h2 span { font-size: 11px; color: var(--accent); margin-left: 6px; }
.content { padding: 14px; }
label { display: block; font-size: 12px; color: var(--text-h); margin-bottom: 7px; }
button, select, input, textarea { font: inherit; color: var(--text-h); background: var(--bg); border: 1px solid var(--border); border-radius: 5px; }
button { padding: 6px 10px; font-size: 12px; cursor: pointer; }
button:disabled { opacity: .45; cursor: not-allowed; }
button:hover:not(:disabled) { border-color: var(--accent); background: var(--accent-bg); }
button.primary { background: var(--accent); border-color: var(--accent); color: var(--bg); }
button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
textarea { display: block; width: 100%; resize: vertical; padding: 10px; font: 12px/1.8 var(--mono); min-height: 95px; }
textarea[readonly] { background: var(--code-bg); }
.hint { font-size: 11px; line-height: 1.8; margin-top: 9px; overflow-wrap: anywhere; }
.error { color: #c53942; }
.fields { margin: 0; padding: 0 14px; font-size: 12px; }
.fields div { display: grid; grid-template-columns: 60px minmax(0, 1fr); gap: 10px; padding: 11px 0; border-bottom: 1px solid var(--border); }
.fields div:last-child { border-bottom: 0; }
dd { margin: 0; color: var(--text-h); overflow-wrap: anywhere; font-family: var(--mono); }
.query-panel { flex: 1; }
.table-wrap { max-height: 420px; overflow: auto; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 12px; }
th { text-align: left; font-weight: 500; padding: 10px 9px; }
td { padding: 6px; border-top: 1px solid var(--border); }
td input { padding: 7px; width: 100%; min-width: 0; font: 12px/1.6 var(--mono); }
.delete-cell { width: 58px; text-align: center; }
.delete-cell button { padding: 5px; }
.empty { padding: 35px 12px; text-align: center; }
.query-hint { padding: 0 14px 14px; }
.codec-panel { margin-top: 18px; }
.codec-options { justify-content: space-between; }
.codec-options label { margin: 0; max-width: 100%; }
select { display: block; max-width: 100%; padding: 7px; font-size: 12px; margin-top: 5px; }
.codec-editors { margin-top: 14px; }
.codec-footer { margin-top: 10px; }
.feedback { font-size: 12px; color: var(--accent); margin-top: 12px; min-height: 20px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@media (prefers-color-scheme: dark) { .error { color: #ff9299; } }
@media (max-width: 768px) {
  .workspace, .codec-editors { grid-template-columns: minmax(0, 1fr); }
  :deep(.tool-body) { padding: 14px; }
  :deep(.tool-title) { font-size: 23px; }
}
</style>

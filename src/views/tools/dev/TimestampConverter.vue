<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { formatBeijing, parseBeijing, parseTimestamp, toDateInput, type DateFormat, type TimestampUnit } from '@/utils/timestamp'

const now = ref(Date.now())
const initial = Math.floor(now.value / 1000) * 1000
const timestamp = ref(String(initial / 1000))
const dateInput = ref(toDateInput(initial))
const milliseconds = ref<number | null>(initial)
const unit = ref<TimestampUnit>('auto')
const detectedUnit = ref('seconds')
const format = ref<DateFormat>('yyyy-MM-dd HH:mm:ss')
const error = ref('')
const emit = defineEmits<{ notify: [message: string] }>()
const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone
const currentBeijing = computed(() => formatBeijing(now.value))
const formatted = computed(() => milliseconds.value === null ? '' : formatBeijing(milliseconds.value, format.value))
const seconds = computed(() => milliseconds.value === null ? '' : String(Math.floor(milliseconds.value / 1000)))
const millis = computed(() => milliseconds.value === null ? '' : String(milliseconds.value))
const timer = setInterval(() => { now.value = Date.now() }, 1000)
onBeforeUnmount(() => clearInterval(timer))

function fromTimestamp() {
  error.value = ''
  milliseconds.value = null
  dateInput.value = ''
  if (!timestamp.value.trim()) return
  try {
    const result = parseTimestamp(timestamp.value, unit.value)
    milliseconds.value = result.milliseconds
    detectedUnit.value = result.unit
    dateInput.value = toDateInput(result.milliseconds)
  } catch (reason) { error.value = (reason as Error).message }
}
function fromDate() {
  error.value = ''
  milliseconds.value = null
  timestamp.value = ''
  if (!dateInput.value) return
  try {
    const value = parseBeijing(dateInput.value)
    milliseconds.value = value
    // 毫秒不为零时保留完整精度；手动秒模式则明确取整。
    const useMillis = unit.value === 'milliseconds' || (unit.value === 'auto' && (value % 1000 !== 0 || String(Math.floor(value / 1000)).replace('-', '').length > 10))
    timestamp.value = String(useMillis ? value : Math.floor(value / 1000))
    detectedUnit.value = useMillis ? 'milliseconds' : 'seconds'
    // 古早/远期日期的毫秒位数可能不是 13 位，切换明确单位以便往返解析。
    if (useMillis && unit.value === 'auto' && timestamp.value.replace('-', '').length !== 13) unit.value = 'milliseconds'
  } catch (reason) { error.value = (reason as Error).message }
}
function useNow(target: 'seconds' | 'milliseconds' | 'local') {
  const value = Date.now()
  unit.value = target === 'seconds' ? 'seconds' : 'milliseconds'
  timestamp.value = String(target === 'seconds' ? Math.floor(value / 1000) : value)
  fromTimestamp()
  if (target === 'local') emit('notify', `已获取当前本地时间（${localZone}），并换算为北京时间。`)
}
function clear() {
  timestamp.value = dateInput.value = error.value = ''
  milliseconds.value = null
}
function reset() {
  unit.value = 'auto'
  format.value = 'yyyy-MM-dd HH:mm:ss'
  timestamp.value = String(Math.floor(Date.now() / 1000))
  fromTimestamp()
  emit('notify', '已重置时间戳转换')
}
async function copy(value: string, label: string) {
  if (!value) return
  try {
    await navigator.clipboard.writeText(value)
    emit('notify', `已复制${label}`)
  } catch { emit('notify', '复制失败，请选中结果手动复制。') }
}
</script>

<template>
    <div class="timestamp-tool">
      <div class="live-bar">
        <div><span class="live-dot" />当前北京时间 <strong>{{ currentBeijing }}</strong></div>
        <span class="badge">UTC+8 · 北京时间</span>
      </div>
      <div class="toolbar">
        <button @click="useNow('seconds')">当前时间戳 · 秒</button>
        <button @click="useNow('milliseconds')">当前时间戳 · 毫秒</button>
        <button @click="useNow('local')">获取当前本地时间</button>
        <button class="clear" @click="clear">清空</button>
        <button @click="reset">重置</button>
      </div>

      <div class="converter-grid">
        <section class="panel" aria-labelledby="timestamp-heading">
          <div class="panel-heading"><span class="step">01</span><h2 id="timestamp-heading">时间戳</h2><span class="subtitle">Unix timestamp</span></div>
          <label for="timestamp-unit">时间戳单位</label>
          <select id="timestamp-unit" v-model="unit" @change="fromTimestamp">
            <option value="auto">自动识别（秒 / 毫秒）</option>
            <option value="seconds">秒（s）</option>
            <option value="milliseconds">毫秒（ms）</option>
          </select>
          <label for="timestamp-input">输入时间戳</label>
          <input id="timestamp-input" v-model="timestamp" type="text" inputmode="numeric" placeholder="例如：1704067200" autocomplete="off" :aria-invalid="!!error" aria-describedby="conversion-error timestamp-help" @input="fromTimestamp" />
          <p id="timestamp-help" class="help">自动识别 10 位秒、13 位毫秒；不足 10 位按秒处理。</p>
          <div class="state-line">{{ milliseconds !== null ? `当前按${detectedUnit === 'seconds' ? '秒' : '毫秒'}解析 · 实时联动` : '等待输入时间戳或日期' }}</div>
          <div class="result"><div class="result-label">秒级时间戳 <button :disabled="!seconds" @click="copy(seconds, '秒级时间戳')">复制</button></div><output>{{ seconds || '—' }}</output></div>
          <div class="result"><div class="result-label">毫秒级时间戳 <button :disabled="!millis" @click="copy(millis, '毫秒级时间戳')">复制</button></div><output>{{ millis || '—' }}</output></div>
        </section>

        <section class="panel" aria-labelledby="date-heading">
          <div class="panel-heading"><span class="step">02</span><h2 id="date-heading">北京时间</h2><span class="subtitle">UTC+8</span></div>
          <label for="date-input">选择日期和时间</label>
          <input id="date-input" v-model="dateInput" type="datetime-local" step="0.001" min="0001-01-01T00:00" max="9999-12-31T23:59:59.999" aria-describedby="conversion-error date-help" @input="fromDate" />
          <p id="date-help" class="help">所选时间始终按北京时间解释，支持毫秒精度。</p>
          <button class="primary" :disabled="!dateInput" @click="fromDate">生成时间戳 <span aria-hidden="true">→</span></button>
          <label for="date-format">日期输出格式</label>
          <select id="date-format" v-model="format">
            <option>yyyy-MM-dd HH:mm:ss</option>
            <option>yyyy-MM-dd</option>
            <option>yyyy/MM/dd HH:mm:ss</option>
          </select>
          <div class="result date-result"><div class="result-label">格式化日期 <button :disabled="!formatted" @click="copy(formatted, '格式化日期')">复制</button></div><output>{{ formatted || '—' }}</output><span class="help">北京时间 · UTC+8</span></div>
        </section>
      </div>
      <p id="conversion-error" class="error" role="alert">{{ error }}</p>
      <div class="note"><strong>关于时区与精度</strong><p>Unix 时间戳以 1970-01-01 00:00:00 UTC 为起点，表示经过的秒数或毫秒数，本身不携带时区。同一个时间戳在不同时区显示为不同的当地时间。</p><p>本工具默认使用北京时间 UTC+8；浏览器本地时区：{{ localZone }}。秒级结果向下取整，格式化日期不显示毫秒，毫秒级结果保留完整精度。</p></div>
    </div>
</template>

<style scoped>
.timestamp-tool { font-size: 14px; }
.live-bar, .toolbar, .panel-heading, .result-label { display: flex; align-items: center; gap: 10px; }
.live-bar { justify-content: space-between; flex-wrap: wrap; padding: 16px; background: var(--accent-bg); border-radius: 10px; }
.live-bar strong { display: inline-block; margin-left: 10px; color: var(--text-h); font-family: var(--mono); font-variant-numeric: tabular-nums; }
.live-dot { display: inline-block; width: 7px; height: 7px; margin-right: 8px; border-radius: 50%; background: #22a777; }
.badge { color: var(--accent); font-size: 12px; }
.toolbar { flex-wrap: wrap; margin: 20px 0; }
button, input, select { font: inherit; border: 1px solid var(--border); border-radius: 7px; background: var(--bg); color: var(--text-h); }
button { padding: 7px 12px; cursor: pointer; }
button:hover:not(:disabled) { color: var(--accent); border-color: var(--accent-border); background: var(--accent-bg); }
button:disabled { opacity: .45; cursor: not-allowed; }
button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.clear { margin-left: auto; color: var(--text); }
.converter-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.panel { min-width: 0; padding: 20px; border: 1px solid var(--border); border-radius: 10px; }
.panel-heading { margin-bottom: 24px; }
h2 { font-size: 17px; margin: 0; }
.step { color: var(--accent); font-family: var(--mono); background: var(--accent-bg); padding: 3px 7px; border-radius: 5px; }
.subtitle { margin-left: auto; font-size: 11px; color: var(--text); }
label { display: block; color: var(--text-h); margin: 18px 0 8px; font-weight: 500; }
input, select { display: block; width: 100%; min-width: 0; height: 43px; padding: 9px 10px; }
input { font-family: var(--mono); font-size: 14px; }
.help { display: block; color: var(--text); font-size: 12px; margin-top: 8px; }
.state-line { margin: 18px 0; font-size: 12px; color: var(--accent); }
.result { padding: 12px 14px; margin-top: 12px; border: 1px solid var(--border); background: var(--social-bg); border-radius: 8px; }
.result-label { justify-content: space-between; font-size: 12px; }
.result-label button { font-size: 12px; padding: 3px 9px; }
output { display: block; margin-top: 9px; font-family: var(--mono); font-size: 19px; color: var(--text-h); overflow-wrap: anywhere; user-select: all; }
.primary { width: 100%; background: var(--accent-bg); color: var(--accent); border-color: var(--accent-border); margin-top: 20px; }
.primary span { margin-left: 8px; }
.date-result { margin-top: 20px; }
.date-result output { font-size: 18px; }
.error { color: #da4242; }
.error:not(:empty), .message:not(:empty) { margin-top: 14px; }
.message { color: var(--accent); }
.note { margin-top: 24px; padding: 16px; border-radius: 8px; background: var(--social-bg); font-size: 12px; line-height: 1.8; }
.note strong { color: var(--text-h); font-size: 13px; }
.note p { margin-top: 6px; }
@media (max-width: 700px) {
  .converter-grid { grid-template-columns: 1fr; }
  .panel { padding: 16px; }
  .toolbar button { flex: 1 1 auto; }
  .live-bar strong { display: block; margin: 4px 0 0; }
  .subtitle { font-size: 10px; }
}
</style>

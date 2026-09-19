<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import ToolWrapper from '@/components/ToolWrapper.vue'
import {
  cronFields,
  cronTemplates,
  convertCron,
  getFieldMode,
  parseCron,
  serializeCron,
  type CronField,
  type CronFormat,
  type FieldMode,
} from '@/utils/cron'

const expression = ref('0 * * * * *')
const format = ref<CronFormat>(6)
const activeField = ref(1)
const count = ref(10)
const copyMessage = ref('')
const notice = ref('')
const dates = ref<string[]>([])
const previewError = ref('')
const loading = ref(false)
const now = ref(new Date())
const previewStart = ref(new Date())
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: timezone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  weekday: 'short',
})
const validation = computed(() => {
  try {
    return { parsed: parseCron(expression.value), error: '' }
  } catch (error) {
    return { parsed: null, error: (error as Error).message }
  }
})
const field = computed(() => cronFields[activeField.value]!)
const token = computed(
  () => validation.value.parsed?.tokens[activeField.value] ?? '*',
)
const mode = computed(() => getFieldMode(token.value))
const fieldValues = computed(() =>
  Array.from(
    { length: field.value.max - field.value.min + 1 },
    (_, i) => field.value.min + i,
  ),
)
const visibleFields = computed(() =>
  cronFields
    .map((item, index) => ({ ...item, index }))
    .filter((item) => format.value === 6 || item.index !== 0),
)
const rangeParts = computed(() => token.value.split('/')[0]!.split('-'))
const intervalStep = computed(() => Number(token.value.split('/')[1] ?? 1))
const intervalStart = computed(() =>
  rangeParts.value[0] === '*' ? '*' : String(Number(rangeParts.value[0])),
)
const intervalEnd = computed(() =>
  Number(rangeParts.value[1] ?? field.value.max),
)
const dateOrWeek = computed(() => {
  const tokens = validation.value.parsed?.tokens
  return tokens && !tokens[3]!.startsWith('*') && !tokens[5]!.startsWith('*')
})
const normalized = computed(() =>
  validation.value.parsed
    ? serializeCron(validation.value.parsed.tokens, format.value)
    : '',
)
const countError = computed(
  () => !Number.isInteger(count.value) || count.value < 1 || count.value > 50,
)

function valueLabel(value: number, item: CronField = field.value) {
  if (item.key === 'week')
    return `${value} · ${['周日', '周一', '周二', '周三', '周四', '周五', '周六', '周日'][value]}`
  return String(value).padStart(2, '0')
}
function setToken(value: string) {
  const parsed = validation.value.parsed
  if (!parsed) return
  const tokens = [...parsed.tokens]
  tokens[activeField.value] = value
  expression.value = serializeCron(tokens, format.value)
  notice.value = ''
}
function setMode(value: FieldMode) {
  const { min, max } = field.value
  const defaults = {
    every: '*',
    values: String(min),
    range: `${min}-${max}`,
    interval: '*/1',
    custom: token.value,
  }
  setToken(defaults[value])
}
function toggleValue(value: number) {
  const selected = token.value.split(',').map(Number)
  const next = selected.includes(value)
    ? selected.filter((item) => item !== value)
    : [...selected, value]
  if (next.length) setToken(next.sort((a, b) => a - b).join(','))
}
function updateRange(side: 'start' | 'end', value: number) {
  const start = side === 'start' ? value : Number(rangeParts.value[0])
  const end = side === 'end' ? value : Number(rangeParts.value[1])
  setToken(
    `${side === 'end' ? Math.min(start, end) : start}-${side === 'start' ? Math.max(start, end) : end}`,
  )
}
function updateInterval(start: string, end: number, step: number) {
  if (start === '*') setToken(`*/${step}`)
  else setToken(`${start}-${Math.max(Number(start), end)}/${step}`)
}
function switchFormat(target: CronFormat) {
  if (target === format.value || !validation.value.parsed) return
  const removedSeconds =
    target === 5 && validation.value.parsed.tokens[0] !== '0'
  expression.value = convertCron(expression.value, target)
  format.value = target
  if (target === 5 && activeField.value === 0) activeField.value = 1
  notice.value = removedSeconds
    ? '已移除秒字段：五位格式在匹配分钟的第 0 秒执行，执行频率可能改变。'
    : target === 6
      ? '已补入秒字段 0，执行时间保持不变。'
      : ''
}
function applyTemplate(value: string) {
  expression.value = convertCron(value, format.value)
  notice.value = ''
}
async function copyExpression() {
  const value = normalized.value
  if (!value) return
  try {
    await navigator.clipboard.writeText(value)
    if (value === normalized.value) copyMessage.value = '已复制'
  } catch {
    copyMessage.value = '复制失败，请选中上方表达式手动复制。'
  }
}

let worker: Worker | undefined
let timer: ReturnType<typeof setTimeout> | undefined
let requestId = 0
watch(
  [expression, count, now],
  () => {
    copyMessage.value = ''
    clearTimeout(timer)
    worker?.terminate()
    worker = undefined
    const id = ++requestId
    dates.value = []
    previewError.value = ''
    const parsed = validation.value.parsed
    if (parsed) {
      format.value = parsed.format
      if (format.value === 5 && activeField.value === 0) activeField.value = 1
    }
    loading.value = !!parsed && !countError.value
    if (!loading.value) return
    timer = setTimeout(() => {
      const current = new Date()
      // 预览使用本轮实际计算时间，输入变化后不沿用旧的起点。
      previewStart.value = current
      try {
        worker = new Worker(
          new URL('../../../workers/cron.worker.ts', import.meta.url),
          { type: 'module' },
        )
        worker.onmessage = (
          event: MessageEvent<{ id: number; dates: string[]; error: string }>,
        ) => {
          if (event.data.id !== requestId) return
          dates.value = event.data.dates
          previewError.value = event.data.error
          loading.value = false
          worker?.terminate()
          worker = undefined
        }
        worker.onerror = () => {
          if (id !== requestId) return
          previewError.value = '执行时间计算失败，请点击“刷新时间”重试。'
          loading.value = false
          worker?.terminate()
          worker = undefined
        }
        worker.postMessage({
          id,
          expression: expression.value,
          count: count.value,
          now: current.toISOString(),
          tz: timezone,
        })
      } catch {
        loading.value = false
        previewError.value =
          '无法启动执行时间预览，请使用支持 Web Worker 的浏览器。'
      }
    }, 180)
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  clearTimeout(timer)
  worker?.terminate()
})
</script>

<template>
  <ToolWrapper
    title="Cron 表达式生成器"
    description="可视化配置执行规则，实时校验并预览下一次运行时间"
  >
    <section class="expression-section" aria-labelledby="input-title">
      <div class="section-heading">
        <h2 id="input-title">01 <span>表达式输入</span></h2>
        <div class="format-switch" aria-label="表达式格式">
          <button
            v-for="option in [6, 5] as const"
            :key="option"
            :aria-pressed="format === option"
            :class="{ selected: format === option }"
            :disabled="!validation.parsed"
            @click="switchFormat(option)"
          >
            {{ option }} 位{{ option === 6 ? '（带秒）' : '（不带秒）' }}
          </button>
        </div>
      </div>
      <label class="sr-only" for="cron-input">Cron 表达式</label>
      <div class="expression-row">
        <input
          id="cron-input"
          v-model="expression"
          class="expression-input"
          :class="{ invalid: validation.error }"
          :aria-invalid="!!validation.error"
          aria-describedby="cron-status format-help"
          autocomplete="off"
          spellcheck="false"
          placeholder="例如：0 */5 * * * *"
          @input="notice = ''"
        />
        <button
          class="primary-btn"
          :disabled="!validation.parsed"
          @click="copyExpression"
        >
          {{ copyMessage === '已复制' ? '✓ 已复制' : '复制表达式' }}
        </button>
      </div>
      <p
        id="cron-status"
        class="status"
        :class="validation.error ? 'error' : 'success'"
        role="status"
      >
        {{ validation.error || `✓ 表达式有效 · 已识别为 ${format} 位格式` }}
      </p>
      <p
        v-if="copyMessage && copyMessage !== '已复制'"
        class="error"
        role="status"
      >
        {{ copyMessage }}
      </p>
      <p v-if="notice" class="notice" role="status">{{ notice }}</p>
      <p id="format-help" class="muted">
        6 位：秒 分 时 日 月 周；5 位：分 时 日 月 周（秒固定为
        0）。粘贴表达式后自动识别格式。
      </p>
      <div class="templates">
        <span class="muted">常用模板</span
        ><button
          v-for="template in cronTemplates"
          :key="template.label"
          class="chip"
          @click="applyTemplate(template.expression)"
        >
          {{ template.label }}
        </button>
      </div>
    </section>

    <div class="workspace">
      <section class="config-section" aria-labelledby="config-title">
        <div class="section-heading">
          <h2 id="config-title">02 <span>可视化配置</span></h2>
        </div>
        <div class="field-tabs" aria-label="选择配置字段">
          <button
            v-for="item in visibleFields"
            :key="item.key"
            :class="{ selected: activeField === item.index }"
            :aria-pressed="activeField === item.index"
            @click="activeField = item.index"
          >
            <span>{{ item.label }}</span
            ><code>{{ validation.parsed?.tokens[item.index] ?? '—' }}</code>
          </button>
        </div>
        <p v-if="!validation.parsed" class="notice">
          请先修正上方表达式，或选择常用模板，再进行可视化配置。
        </p>
        <fieldset :disabled="!validation.parsed" class="field-editor">
          <legend>
            {{ field.label }}字段 <span class="muted">{{ field.hint }}</span>
          </legend>
          <div class="mode-options">
            <label
              v-for="item in [
                ['every', '每 / 任意'],
                ['values', '指定值'],
                ['range', '范围'],
                ['interval', '间隔'],
              ] as const"
              :key="item[0]"
              :class="{ selected: mode === item[0] }"
              ><input
                type="radio"
                name="field-mode"
                :value="item[0]"
                :checked="mode === item[0]"
                @change="setMode(item[0])"
              />{{ item[1] }}</label
            >
          </div>
          <div class="mode-content">
            <p v-if="mode === 'every'" class="mode-description">
              任意{{ field.label }}均匹配，使用
              <code>*</code>。实际执行时间还需满足其他字段。
            </p>
            <template v-else-if="mode === 'values'">
              <p class="muted">可多选，至少保留一个值。</p>
              <div
                class="value-grid"
                :class="{ weekdays: field.key === 'week' }"
              >
                <label
                  v-for="value in fieldValues"
                  :key="value"
                  :class="{
                    checked: token.split(',').map(Number).includes(value),
                  }"
                  ><input
                    type="checkbox"
                    :checked="token.split(',').map(Number).includes(value)"
                    :disabled="
                      token.split(',').length === 1 && Number(token) === value
                    "
                    @change="toggleValue(value)"
                  />{{ valueLabel(value) }}</label
                >
              </div>
            </template>
            <div v-else-if="mode === 'range'" class="control-row">
              <label
                >从<select
                  :value="Number(rangeParts[0])"
                  aria-label="范围起点"
                  @change="
                    updateRange(
                      'start',
                      Number(($event.target as HTMLSelectElement).value),
                    )
                  "
                >
                  <option
                    v-for="value in fieldValues"
                    :key="value"
                    :value="value"
                  >
                    {{ valueLabel(value) }}
                  </option>
                </select></label
              >
              <label
                >到<select
                  :value="Number(rangeParts[1])"
                  aria-label="范围终点"
                  @change="
                    updateRange(
                      'end',
                      Number(($event.target as HTMLSelectElement).value),
                    )
                  "
                >
                  <option
                    v-for="value in fieldValues"
                    :key="value"
                    :value="value"
                  >
                    {{ valueLabel(value) }}
                  </option>
                </select></label
              ><span class="muted">包含起点与终点</span>
            </div>
            <template v-else-if="mode === 'interval'">
              <div class="control-row">
                <label
                  >起点<select
                    :value="intervalStart"
                    aria-label="间隔起点"
                    @change="
                      updateInterval(
                        ($event.target as HTMLSelectElement).value,
                        intervalEnd,
                        intervalStep,
                      )
                    "
                  >
                    <option value="*">默认（{{ field.min }}）</option>
                    <option
                      v-for="value in fieldValues"
                      :key="value"
                      :value="String(value)"
                    >
                      {{ valueLabel(value) }}
                    </option>
                  </select></label
                >
                <label v-if="intervalStart !== '*'"
                  >终点<select
                    :value="intervalEnd"
                    aria-label="间隔终点"
                    @change="
                      updateInterval(
                        intervalStart,
                        Number(($event.target as HTMLSelectElement).value),
                        intervalStep,
                      )
                    "
                  >
                    <option
                      v-for="value in fieldValues.filter(
                        (v) => v >= Number(intervalStart),
                      )"
                      :key="value"
                      :value="value"
                    >
                      {{ valueLabel(value) }}
                    </option>
                  </select></label
                >
                <label
                  >间隔<select
                    :value="intervalStep"
                    aria-label="间隔步长"
                    @change="
                      updateInterval(
                        intervalStart,
                        intervalEnd,
                        Number(($event.target as HTMLSelectElement).value),
                      )
                    "
                  >
                    <option
                      v-for="value in fieldValues.length"
                      :key="value"
                      :value="value"
                    >
                      {{ value }}
                    </option>
                  </select></label
                >
              </div>
              <p class="muted">
                从起点开始，每隔指定步长匹配；进入下一个字段周期后重新计算，并非持续计时。
              </p>
            </template>
            <p v-else class="mode-description">
              当前为组合规则 <code>{{ token }}</code
              >，已完整保留。可在上方编辑文本，或选择一种模式替换当前字段。
            </p>
          </div>
          <div class="field-result">
            <span>当前{{ field.label }}字段</span><code>{{ token }}</code>
          </div>
        </fieldset>
        <p v-if="dateOrWeek" class="notice">
          日与周均已指定：满足日期或星期任一条件即可匹配，其他字段仍需满足。
        </p>
        <details class="syntax-help" open>
          <summary>字段与语法说明</summary>
          <p>
            <code>*</code> 任意值 · <code>,</code> 多个值 ·
            <code>-</code> 闭区间 · <code>/</code> 间隔
          </p>
          <p>
            例如 <code>1,15</code> 表示两个指定值，<code>1-5</code> 表示 1 至
            5，<code>*/5</code> 表示从字段最小值起每隔 5 个单位。
          </p>
          <p>
            字段顺序：{{ format === 6 ? '秒 → ' : '' }}分 → 时 → 日 → 月 →
            周。星期 0 和 7 都表示周日；不存在的日期会跳过。
          </p>
          <p>
            使用 Unix cron
            规则及可选秒字段。日与周同时限定时按“或”匹配。本工具支持数字及上述四种符号，不支持
            Quartz 的 ?、L、W、#、年份及英文别名。
          </p>
        </details>
      </section>

      <section
        class="preview-section"
        aria-labelledby="preview-title"
        :aria-busy="loading"
      >
        <div class="section-heading">
          <h2 id="preview-title">03 <span>执行时间预览</span></h2>
        </div>
        <div class="preview-controls">
          <label for="preview-count"
            >接下来<input
              id="preview-count"
              v-model.number="count"
              type="number"
              min="1"
              max="50"
              step="1"
              :aria-invalid="countError"
            />次</label
          ><button
            class="chip"
            :disabled="!validation.parsed || countError"
            @click="now = new Date()"
          >
            刷新时间
          </button>
        </div>
        <p class="muted timezone">本地时区 · {{ timezone }}</p>
        <p class="muted start-time">
          起算：{{ dateFormatter.format(previewStart) }}
        </p>
        <p v-if="countError" class="error" role="status">
          预览次数须为 1–50 的整数。
        </p>
        <div v-else-if="!validation.parsed" class="preview-empty">
          输入有效表达式后，查看接下来的执行时间。
        </div>
        <div v-else-if="loading" class="preview-empty" role="status">
          正在计算执行时间…
        </div>
        <p v-else-if="previewError" class="error preview-empty" role="status">
          {{ previewError }}
        </p>
        <ol v-else class="time-list">
          <li v-for="(date, index) in dates" :key="date">
            <span class="time-index">{{
              String(index + 1).padStart(2, '0')
            }}</span
            ><time :datetime="date">{{
              dateFormatter.format(new Date(date))
            }}</time>
          </li>
        </ol>
        <p class="muted preview-footnote">
          仅预览起算时间之后的匹配时间，不会创建或执行定时任务。
        </p>
      </section>
    </div>
  </ToolWrapper>
</template>

<style scoped>
h2 {
  margin: 0;
  font-size: 13px;
  color: var(--accent);
  display: flex;
  align-items: center;
  gap: 10px;
}
h2 span {
  color: var(--text-h);
  font-size: 17px;
}
button,
input,
select {
  font: inherit;
}
button {
  cursor: pointer;
}
button,
select,
input {
  transition:
    border-color 0.15s,
    background 0.15s;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
button:focus-visible,
input:focus-visible,
select:focus-visible,
summary:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}
.muted {
  color: var(--text);
  font-size: 12px;
  line-height: 1.7;
}
.format-switch {
  display: flex;
  padding: 3px;
  border: 1px solid var(--border);
  border-radius: 9px;
  gap: 3px;
}
.format-switch button {
  border: 0;
  border-radius: 6px;
  padding: 6px 10px;
  background: transparent;
  color: var(--text);
  font-size: 12px;
}
.format-switch button.selected {
  color: var(--accent);
  background: var(--accent-bg);
}
.expression-row {
  display: flex;
  gap: 10px;
}
.expression-input {
  width: 100%;
  min-width: 0;
  padding: 16px;
  background: var(--code-bg);
  color: var(--text-h);
  border: 1px solid var(--border);
  border-radius: 9px;
  font: 21px/1.5 var(--mono);
}
.expression-input.invalid {
  border-color: #dc6262;
}
.primary-btn {
  border: 1px solid var(--accent);
  background: var(--accent);
  color: var(--bg);
  border-radius: 9px;
  padding: 10px 16px;
  white-space: nowrap;
  font-weight: 600;
  font-size: 13px;
}
.status {
  margin: 9px 0 4px;
  font-size: 12px;
  min-height: 21px;
}
.success {
  color: #238454;
}
.error {
  color: #c94242;
  font-size: 13px;
}
.notice {
  padding: 10px 12px;
  margin: 10px 0;
  border-left: 3px solid var(--accent);
  background: var(--accent-bg);
  color: var(--text-h);
  font-size: 12px;
}
.templates {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
  align-items: center;
  margin: 18px 0 24px;
}
.chip {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 5px 9px;
  color: var(--text-h);
  font-size: 12px;
}
.chip:hover {
  background: var(--accent-bg);
  border-color: var(--accent-border);
}
.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(290px, 1fr);
  border-top: 1px solid var(--border);
  padding-top: 24px;
  gap: 24px;
}
.config-section,
.preview-section {
  min-width: 0;
}
.field-tabs {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 5px;
  margin-bottom: 20px;
}
.field-tabs button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 9px 4px;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  background: var(--bg);
}
.field-tabs button.selected {
  border-color: var(--accent-border);
  background: var(--accent-bg);
  color: var(--accent);
}
.field-tabs code {
  background: transparent;
  font-size: 11px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0;
}
.field-editor {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}
.field-editor legend {
  color: var(--text-h);
  font-size: 15px;
  font-weight: 600;
  padding: 0;
  margin-bottom: 13px;
}
.field-editor legend span {
  font-weight: 400;
  margin-left: 7px;
}
.mode-options {
  display: flex;
  gap: 7px 12px;
  flex-wrap: wrap;
}
.mode-options label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  cursor: pointer;
}
.mode-options label.selected {
  color: var(--accent);
}
input[type='radio'],
input[type='checkbox'] {
  accent-color: var(--accent);
}
.mode-content {
  min-height: 126px;
  padding: 18px 0;
}
.mode-description {
  font-size: 13px;
  line-height: 1.9;
}
.control-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}
.control-row label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12px;
}
select {
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text-h);
  border-radius: 6px;
  padding: 7px 9px;
  min-width: 80px;
  font-size: 13px;
}
.value-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px;
  margin-top: 9px;
}
.value-grid.weekdays {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.value-grid label {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px 1px;
  border: 1px solid var(--border);
  border-radius: 5px;
  font-size: 12px;
  cursor: pointer;
}
.value-grid label.checked {
  background: var(--accent-bg);
  border-color: var(--accent-border);
  color: var(--accent);
}
.value-grid input {
  width: 12px;
  height: 12px;
  margin: 0 4px 0 0;
}
.field-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: var(--code-bg);
  border-radius: 7px;
  padding: 10px 12px;
  font-size: 12px;
}
.field-result code {
  overflow-wrap: anywhere;
  text-align: right;
}
.syntax-help {
  margin-top: 22px;
  font-size: 12px;
  line-height: 1.9;
}
.syntax-help summary {
  cursor: pointer;
  color: var(--text-h);
  margin-bottom: 8px;
}
.syntax-help p {
  margin-top: 8px;
}
.syntax-help code {
  font-size: 12px;
}
.preview-section {
  border-left: 1px solid var(--border);
  padding-left: 24px;
}
.preview-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.preview-controls label {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
}
.preview-controls input {
  width: 58px;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 5px;
  color: var(--text-h);
  background: var(--bg);
}
.timezone {
  margin-top: 12px;
}
.start-time {
  font-size: 11px;
  margin: 3px 0 14px;
}
.time-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.time-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 6px;
  border-bottom: 1px solid var(--border);
}
.time-list li:first-child {
  background: var(--accent-bg);
  border-radius: 6px;
}
.time-index {
  color: var(--accent);
  font: 11px var(--mono);
}
time {
  font: 12px/1.6 var(--mono);
  color: var(--text-h);
}
.preview-empty {
  padding: 30px 0;
  font-size: 13px;
}
.preview-footnote {
  margin-top: 15px;
  font-size: 11px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (prefers-color-scheme: dark) {
  .success {
    color: #6ad79b;
  }
  .error {
    color: #ff9797;
  }
}
@media (max-width: 850px) {
  .workspace {
    grid-template-columns: 1fr;
  }
  .preview-section {
    border-left: 0;
    border-top: 1px solid var(--border);
    padding: 24px 0 0;
  }
}
@media (max-width: 480px) {
  .expression-row {
    flex-direction: column;
  }
  .expression-input {
    font-size: 17px;
  }
  .value-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .field-tabs {
    gap: 3px;
  }
  .field-editor legend span {
    display: block;
    margin-left: 0;
  }
}
</style>

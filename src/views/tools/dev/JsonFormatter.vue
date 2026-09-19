<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import ToolWrapper from '@/components/ToolWrapper.vue'
import JsonCodeEditor from '@/components/JsonCodeEditor.vue'
import JsonTreeView from '@/components/JsonTreeView.vue'
import { readJson, renderJson, unescapeJson } from '@/utils/json'

const input = ref('')
const output = ref('')
const indent = ref('  ')
const autoDecode = ref(true)
const wrapLines = ref(true)
const view = ref<'code' | 'tree'>('code')
const expandedResult = ref(false)
const resultDialog = ref<HTMLDialogElement>()
const expandButton = ref<HTMLButtonElement>()
let previousOverflow = ''
async function openResult() {
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  expandedResult.value = true
  resultDialog.value?.showModal()
  await nextTick()
  expandButton.value?.focus()
}
async function closeResult() {
  expandedResult.value = false
  document.body.style.overflow = previousOverflow
  await nextTick()
  expandButton.value?.focus()
}
onBeforeUnmount(() => {
  if (expandedResult.value) document.body.style.overflow = previousOverflow
})
const operation = ref<'pretty' | 'compact' | 'escape' | 'unescape'>('pretty')
const feedback = ref('')
const actionError = ref('')
const fileInput = ref<HTMLInputElement>()
async function importFile(event: Event) {
  const element = event.target as HTMLInputElement
  const file = element.files?.[0]
  if (!file) return
  try {
    if (file.size > 4_000_000)
      throw new Error('文件过大，请选择 100 万字符以内的 JSON。')
    const text = await file.text()
    if (text.length > 1_000_000)
      throw new Error('文本超过 100 万字符，请拆分后处理。')
    operation.value = 'pretty'
    input.value = text.replace(/^\uFEFF/, '')
    generate()
  } catch (error) {
    actionError.value = (error as Error).message
  } finally {
    element.value = ''
  }
}
const inputEditor = ref<InstanceType<typeof JsonCodeEditor>>()
const expansion = ref({ open: true, version: 0 })
const parsed = computed(() => readJson(input.value, autoDecode.value))
const result = computed(() => readJson(output.value, false))
const operationLabel = computed(
  () =>
    ({ pretty: '格式化', compact: '压缩', escape: '转义', unescape: '反转义' })[
      operation.value
    ],
)
const inputStatus = computed(() => {
  if (!input.value.trim()) return '等待输入 JSON'
  if (parsed.value.error) {
    const error = parsed.value.error
    return `${parsed.value.decoded ? '解码后文本' : '输入'}第 ${error.line} 行，第 ${error.column} 列：${error.message}`
  }
  return parsed.value.decoded
    ? '校验通过 · 已自动识别并解码转义 JSON'
    : '校验通过 · 标准 JSON'
})
function generate() {
  feedback.value = ''
  actionError.value = ''
  if (!input.value.trim()) {
    output.value = ''
    return
  }
  try {
    if (input.value.length > 1_000_000)
      throw new Error('文本超过 100 万字符，请拆分后处理。')
    if (operation.value === 'escape') output.value = JSON.stringify(input.value)
    else if (operation.value === 'unescape')
      output.value = unescapeJson(input.value)
    else
      output.value = renderJson(
        parsed.value,
        operation.value === 'compact' ? '' : indent.value,
      )
  } catch (error) {
    output.value = ''
    actionError.value = (error as Error).message
  }
  expansion.value = { open: true, version: expansion.value.version + 1 }
}
watch([input, indent, autoDecode], generate)
function apply(value: typeof operation.value) {
  operation.value = value
  generate()
}
function clear() {
  input.value = ''
  output.value = ''
  feedback.value = ''
  actionError.value = ''
  operation.value = 'pretty'
}
function example() {
  operation.value = 'pretty'
  input.value =
    '{"项目":"VueBox","版本":1,"启用":true,"备注":null,"用户":{"名称":"开发者","标签":["Vue","TypeScript"]},"大整数":9007199254740993}'
  generate()
}
function editOutput(value: string) {
  output.value = value
  feedback.value = ''
  expansion.value = { open: true, version: expansion.value.version + 1 }
}
async function copy() {
  const value = output.value
  try {
    await navigator.clipboard.writeText(value)
    if (value === output.value) feedback.value = '结果已复制'
  } catch {
    feedback.value = '复制失败，请在代码视图中选中结果手动复制。'
  }
}
function setExpanded(open: boolean) {
  expansion.value = { open, version: expansion.value.version + 1 }
}
</script>

<template>
  <ToolWrapper
    class="json-formatter-page"
    title="JSON 在线格式化"
    description="格式化、校验与树形预览 · 全部在浏览器本地处理"
  >
    <div class="json-tool">
      <dialog
        ref="resultDialog"
        class="result-dialog"
        aria-labelledby="json-output-title"
        @close="closeResult"
      >
        <div id="json-result-dialog-content" class="result-dialog-content" />
      </dialog>
      <div class="toolbar">
        <div class="actions">
          <button
            class="primary"
            :disabled="!parsed.root || !!parsed.error"
            @click="apply('pretty')"
          >
            格式化美化
          </button>
          <button
            :disabled="!parsed.root || !!parsed.error"
            @click="apply('compact')"
          >
            压缩 / 单行
          </button>
          <button :disabled="!input" @click="apply('escape')">转义</button>
          <button :disabled="!input" @click="apply('unescape')">反转义</button>
        </div>
        <label class="indent-label"
          >缩进<select v-model="indent">
            <option value="  ">2 空格</option>
            <option value="    ">4 空格</option>
            <option :value="'\t'">Tab</option>
          </select></label
        >
      </div>
      <div class="options">
        <label><input v-model="wrapLines" type="checkbox" />自动换行</label>
        <label
          ><input v-model="autoDecode" type="checkbox" />自动识别转义
          JSON</label
        ><span>支持压缩文本、JSON 字符串及带反斜杠的 JSON</span
        ><button @click="fileInput?.click()">导入 JSON 文件</button
        ><button @click="example">载入示例</button>
        <input
          ref="fileInput"
          type="file"
          accept=".json,application/json,text/plain"
          hidden
          aria-label="导入 JSON 文件"
          @change="importFile"
        />
      </div>
      <div class="editors">
        <section class="panel" aria-labelledby="json-input-title">
          <div class="panel-heading">
            <h2 id="json-input-title">原始输入 <span>INPUT</span></h2>
            <button @click="clear">清空</button>
          </div>
          <JsonCodeEditor
            :wrap-lines="wrapLines"
            ref="inputEditor"
            v-model="input"
            label="原始 JSON 输入"
            placeholder='粘贴 JSON，例如：{"name":"VueBox","enabled":true}'
            :invalid="!!parsed.error"
          />
          <div class="panel-footer">
            <span>{{ input.length.toLocaleString() }} 字符</span
            ><span>{{ input ? input.split('\n').length : 0 }} 行</span>
          </div>
        </section>
        <div v-if="expandedResult" class="result-placeholder">
          处理结果已在大框中打开。
        </div>
        <Teleport
          defer
          to="#json-result-dialog-content"
          :disabled="!expandedResult"
        >
          <section
            class="panel"
            :class="{ 'result-expanded': expandedResult }"
            aria-labelledby="json-output-title"
          >
            <div class="panel-heading">
              <h2 id="json-output-title">处理结果 <span>RESULT</span></h2>
              <div class="actions">
                <button
                  ref="expandButton"
                  :aria-expanded="expandedResult"
                  @click="expandedResult ? resultDialog?.close() : openResult()"
                >
                  {{ expandedResult ? '退出大框（Esc）' : '大框查看' }}
                </button>
                <button :disabled="!output" @click="copy">
                  {{ feedback === '结果已复制' ? '✓ 已复制' : '复制结果' }}
                </button>
              </div>
            </div>
            <div class="result-tabs">
              <div>
                <button
                  :class="{ active: view === 'code' }"
                  :aria-pressed="view === 'code'"
                  @click="view = 'code'"
                >
                  代码编辑器</button
                ><button
                  :class="{ active: view === 'tree' }"
                  :aria-pressed="view === 'tree'"
                  @click="view = 'tree'"
                >
                  树形预览
                </button>
              </div>
              <label v-if="expandedResult" class="expanded-wrap"
                ><input v-model="wrapLines" type="checkbox" />自动换行</label
              >
              <span>{{ operationLabel }}结果</span>
            </div>
            <JsonCodeEditor
              :wrap-lines="wrapLines"
              v-if="view === 'code'"
              :model-value="output"
              label="JSON 处理结果"
              placeholder="处理结果将在这里显示，也可直接编辑"
              :invalid="!!result.error"
              @update:model-value="editOutput"
            />
            <div v-if="view === 'tree'" class="tree-view">
              <template v-if="result.root && !result.error"
                ><div class="tree-actions">
                  <button @click="setExpanded(true)">全部展开</button
                  ><button @click="setExpanded(false)">全部折叠</button>
                </div>
                <JsonTreeView
                  :node="result.root"
                  :source="result.source"
                  :expansion="expansion"
              /></template>
              <p v-else class="empty">
                {{
                  output
                    ? '结果不是有效 JSON，请在代码编辑器中修正后查看树形结构。'
                    : '输入有效 JSON 后，在这里探索节点结构。'
                }}
              </p>
            </div>
            <div class="panel-footer">
              <span>{{ output.length.toLocaleString() }} 字符</span
              ><span>复制内容与结果一致</span>
            </div>
            <p
              v-if="expandedResult && result.error"
              class="expanded-message error"
              role="status"
            >
              结果第 {{ result.error.line }} 行，第
              {{ result.error.column }} 列：{{ result.error.message }}
            </p>
            <p
              v-if="expandedResult && feedback"
              class="expanded-message"
              role="status"
            >
              {{ feedback }}
            </p>
          </section>
        </Teleport>
      </div>
      <div
        class="validation"
        :class="parsed.error ? 'error' : input ? 'success' : ''"
        role="status"
      >
        <span>{{ inputStatus }}</span
        ><button
          v-if="parsed.error && !parsed.decoded"
          @click="inputEditor?.locate(parsed.error.offset)"
        >
          定位错误
        </button>
        <pre v-if="parsed.error">{{ parsed.error.excerpt }}</pre>
      </div>
      <p v-if="actionError" class="message error" role="alert">
        {{ actionError }}
      </p>
      <p v-if="result.error && output" class="message error" role="status">
        结果第 {{ result.error.line }} 行，第 {{ result.error.column }} 列：{{
          result.error.message
        }}
      </p>
      <p v-if="feedback" class="message" role="status">{{ feedback }}</p>
      <div class="legend">
        <span class="json-key">● 属性名</span
        ><span class="json-string">● 字符串</span
        ><span class="json-number">● 数字</span
        ><span class="json-boolean">● 布尔值</span
        ><span class="json-null">● null</span>
      </div>
      <details class="help">
        <summary>使用说明与转义规则</summary>
        <p>
          输入修改后按当前操作自动更新结果。结果区支持独立编辑；再次修改输入、缩进或执行操作会重新生成结果。代码与树形视图共享同一份结果。
        </p>
        <p>
          转义：将原始输入包装为合法 JSON
          字符串，双引号、反斜杠、换行等一并转义。反转义：解码一层字符串；普通文本结果可以复制，但不能作为
          JSON 树展示。
        </p>
        <p>
          自动识别仅展开内容为对象或数组的 JSON
          字符串；如需保留原本的字符串类型，可关闭此选项。标准 JSON
          不允许注释、单引号及尾随逗号。格式化保留大整数、数字原文、属性顺序与重复键。
        </p>
        <p>
          支持最多 100 万字符、128
          层嵌套。树形预览仅渲染滚动区域内的节点，全部展开也不会一次创建所有行；长值单行省略，点击可查看完整内容。导入文件仅在浏览器本地读取。
        </p>
      </details>
    </div>
  </ToolWrapper>
</template>

<style scoped>
.json-formatter-page {
  max-width: none;
}

.json-tool {
  --json-key: #8548b2;
  --json-string: #217747;
  --json-number: #ae5c14;
  --json-boolean: #2765b3;
  --json-null: #a04468;
}
.json-tool :deep(.json-key) {
  color: var(--json-key);
}
.json-tool :deep(.json-string) {
  color: var(--json-string);
}
.json-tool :deep(.json-number) {
  color: var(--json-number);
}
.json-tool :deep(.json-boolean) {
  color: var(--json-boolean);
}
.json-tool :deep(.json-null) {
  color: var(--json-null);
}
button,
select {
  font: inherit;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text-h);
  padding: 7px 11px;
  font-size: 12px;
}
button {
  cursor: pointer;
}
button:hover:not(:disabled) {
  background: var(--accent-bg);
  border-color: var(--accent-border);
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
button:focus-visible,
select:focus-visible,
summary:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.toolbar,
.actions,
.options,
.panel-heading,
.panel-footer,
.result-tabs,
.legend {
  display: flex;
  align-items: center;
  gap: 8px;
}
.toolbar {
  justify-content: space-between;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.actions {
  flex-wrap: wrap;
}
button.primary {
  color: var(--bg);
  background: var(--accent);
  border-color: var(--accent);
  font-weight: 600;
}
.indent-label {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
}
.options {
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--text);
  margin-bottom: 20px;
}
.options label {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--text-h);
}
.options input {
  accent-color: var(--accent);
}
.options button {
  margin-left: auto;
}
.editors {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
}
.panel {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 9px;
  display: flex;
  flex-direction: column;
}
.panel-heading {
  justify-content: space-between;
  padding: 11px 13px;
  min-height: 55px;
}
h2 {
  font-size: 14px;
  margin: 0;
}
h2 span {
  font: 10px var(--mono);
  color: var(--text);
  margin-left: 7px;
}
.panel-heading button {
  padding: 4px 8px;
}
.result-tabs {
  justify-content: space-between;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 6px 10px;
  min-height: 42px;
  font-size: 11px;
}
.result-tabs button {
  border: 0;
  padding: 4px 8px;
}
.result-tabs button.active {
  background: var(--accent-bg);
  color: var(--accent);
}
.panel:first-child :deep(.json-code-editor) {
  height: 522px;
}
.panel-footer {
  justify-content: space-between;
  border-top: 1px solid var(--border);
  padding: 9px 13px;
  font-size: 11px;
  margin-top: auto;
}
.tree-view {
  display: flex;
  flex-direction: column;
  height: 480px;
  overflow: auto;
  background: var(--code-bg);
  padding: 14px;
}
.tree-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.tree-actions button {
  padding: 4px 8px;
}
.empty {
  color: var(--text);
  font-size: 13px;
  padding: 35px 10px;
}
.validation {
  margin-top: 16px;
  background: var(--code-bg);
  border: 1px solid var(--border);
  padding: 12px 14px;
  border-radius: 7px;
  font-size: 12px;
}
.validation button {
  margin-left: 12px;
  padding: 3px 8px;
}
.validation pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  margin: 8px 0 0;
  font: 12px var(--mono);
}
.error {
  color: #c53942;
}
.success {
  color: #217747;
}
.message {
  font-size: 12px;
  margin-top: 10px;
}
.legend {
  flex-wrap: wrap;
  gap: 18px;
  font-size: 11px;
  margin-top: 17px;
}
.help {
  font-size: 12px;
  margin-top: 20px;
  line-height: 1.9;
}
.help summary {
  cursor: pointer;
  color: var(--text-h);
}
.help p {
  margin-top: 8px;
}
.result-dialog {
  width: calc(100vw - 48px);
  max-width: 1800px;
  height: calc(100dvh - 48px);
  max-height: none;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg);
  color: var(--text-h);
  overflow: hidden;
}
.result-dialog::backdrop {
  background: rgba(0, 0, 0, 0.55);
}
.result-dialog-content {
  height: 100%;
}
.panel.result-expanded {
  height: 100%;
  border: 0;
  border-radius: 0;
}
.panel.result-expanded :deep(.json-code-editor),
.panel.result-expanded .tree-view {
  flex: 1;
  height: auto;
  min-height: 0;
}
.result-expanded .panel-heading,
.result-expanded .result-tabs {
  flex-wrap: wrap;
  flex-shrink: 0;
}
.expanded-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}
.expanded-wrap input {
  accent-color: var(--accent);
}
.expanded-message {
  padding: 8px 14px;
  font-size: 12px;
}
.result-placeholder {
  display: grid;
  place-items: center;
  border: 1px dashed var(--border);
  border-radius: 9px;
  color: var(--text);
  font-size: 13px;
}
@media (max-width: 768px) {
  .result-dialog {
    width: calc(100vw - 16px);
    height: calc(100dvh - 16px);
  }
}
@media (prefers-color-scheme: dark) {
  .json-tool {
    --json-key: #c597ec;
    --json-string: #8cd3a8;
    --json-number: #edb077;
    --json-boolean: #89baf5;
    --json-null: #ec9ebe;
  }
  .error {
    color: #ff9299;
  }
  .success {
    color: #8cd3a8;
  }
}
@media (max-width: 768px) {
  .editors {
    grid-template-columns: 1fr;
  }
  .panel:first-child :deep(.json-code-editor) {
    height: 340px;
  }
  .tree-view {
    height: 340px;
  }
  .options button {
    margin-left: 0;
  }
}
</style>

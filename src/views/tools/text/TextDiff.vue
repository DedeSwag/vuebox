<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import DevTool from '@/components/DevTool.vue'
import { useWorkerTask } from '@/composables/useWorkerTask'
import { useLocalClipboard } from '@/composables/useLocalClipboard'
import {
  diffReport,
  type DiffRequest,
  type DiffResult,
  type DiffRow,
} from '@/utils/textDiff'
import { readJson, renderJson } from '@/utils/json'
const left = ref(''),
  right = ref('')
const trim = ref(false),
  ignoreCase = ref(false),
  normalizeEol = ref(true),
  onlyChanges = ref(false)
const selected = ref<DiffRow>()
const scrollTop = ref(0),
  scroller = ref<HTMLDivElement>()
const { result, busy, error, run, reset } = useWorkerTask<
  DiffRequest,
  DiffResult
>(
  () =>
    new Worker(new URL('../../../workers/diff.worker.ts', import.meta.url), {
      type: 'module',
    }),
)
const { feedback, copy } = useLocalClipboard()
const rows = computed(
  () =>
    result.value?.rows.filter(
      (row) => !onlyChanges.value || row.kind !== 'same',
    ) ?? [],
)
const start = computed(() => Math.max(0, Math.floor(scrollTop.value / 30) - 5))
const visible = computed(() => rows.value.slice(start.value, start.value + 30))
let debounce: ReturnType<typeof setTimeout> | undefined
watch([left, right, trim, ignoreCase, normalizeEol], () => {
  clearTimeout(debounce)
  reset()
  feedback.value = ''
  selected.value = undefined
  debounce = setTimeout(
    () =>
      run({
        left: left.value,
        right: right.value,
        options: {
          trim: trim.value,
          ignoreCase: ignoreCase.value,
          normalizeEol: normalizeEol.value,
        },
      }),
    250,
  )
})
watch([rows, onlyChanges], async () => {
  scrollTop.value = 0
  await nextTick()
  if (scroller.value) scroller.value.scrollTop = 0
})
onBeforeUnmount(() => clearTimeout(debounce))
function example() {
  left.value = '项目：VueBox\n版本：1.0\n功能：JSON 格式化\n状态：开发中'
  right.value =
    '项目：VueBox\n版本：2.0\n功能：JSON 格式化\n功能：文本差异对比\n状态：已发布'
}
function json() {
  const a = readJson(left.value),
    b = readJson(right.value)
  if (a.error || b.error || !a.root || !b.root) {
    feedback.value = '两侧都需要有效 JSON，才能格式化后比较。'
    return
  }
  left.value = renderJson(a, '  ')
  right.value = renderJson(b, '  ')
}
async function load(event: Event, side: 'left' | 'right') {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    if (file.size > 4_000_000)
      throw new Error('文件过大，请选择 100 万字符以内的文本。')
    const text = await file.text()
    if (text.length > 1_000_000) throw new Error('文本超过 100 万字符。')
    if (side === 'left') left.value = text
    else right.value = text
  } catch (e) {
    feedback.value = (e as Error).message
  } finally {
    input.value = ''
  }
}
function swap() {
  ;[left.value, right.value] = [right.value, left.value]
}
function clearInput() {
  left.value = ''
  right.value = ''
  reset()
}
</script>
<template>
  <DevTool
    title="文本差异对比"
    description="比较配置、日志和接口返回 · 本地计算，大文本按需渲染"
    wide
  >
    <div class="controls">
      <button @click="swap">交换左右</button
      ><button @click="json">JSON 格式化后比较</button
      ><button @click="example">载入示例</button
      ><button @click="clearInput">清空</button>
    </div>
    <div class="two-col">
      <section class="box">
        <div class="box-head">
          <h2>原始文本</h2>
          <label class="file-label"
            >导入文件<input
              type="file"
              accept="text/*,.json,.log,.csv,.xml,.yaml,.yml,.md"
              @change="load($event, 'left')"
          /></label>
        </div>
        <textarea
          v-model="left"
          aria-label="原始文本"
          spellcheck="false"
          placeholder="粘贴原始内容…"
        />
        <p class="muted">{{ left.length.toLocaleString() }} 字符</p>
      </section>
      <section class="box">
        <div class="box-head">
          <h2>修改后文本</h2>
          <label class="file-label"
            >导入文件<input
              type="file"
              accept="text/*,.json,.log,.csv,.xml,.yaml,.yml,.md"
              @change="load($event, 'right')"
          /></label>
        </div>
        <textarea
          v-model="right"
          aria-label="修改后文本"
          spellcheck="false"
          placeholder="粘贴需要比较的内容…"
        />
        <p class="muted">{{ right.length.toLocaleString() }} 字符</p>
      </section>
    </div>
    <div class="controls diff-options">
      <label class="check"
        ><input v-model="trim" type="checkbox" />忽略行首尾空白</label
      ><label class="check"
        ><input v-model="ignoreCase" type="checkbox" />忽略大小写</label
      ><label class="check"
        ><input v-model="normalizeEol" type="checkbox" />忽略 CRLF/LF
        差异</label
      ><label class="check"
        ><input v-model="onlyChanges" type="checkbox" />仅看差异</label
      ><button :disabled="!result || busy" @click="copy(diffReport(result!))">
        复制差异报告
      </button>
    </div>
    <p v-if="busy" class="note" role="status">正在比较…</p>
    <p v-else-if="error" class="error" role="alert">{{ error }}</p>
    <template v-else-if="result"
      ><div class="box-head">
        <h2>
          {{
            result.added || result.removed
              ? '发现文本差异'
              : '按当前规则，两侧内容一致'
          }}
        </h2>
        <span class="muted"
          >新增 {{ result.added }} 行 · 删除 {{ result.removed }} 行 · 配对修改
          {{ result.changes }} 行</span
        >
      </div>
      <div class="diff-head">
        <span>原始文本（− 删除）</span><span>修改后文本（+ 新增）</span>
      </div>
      <div
        ref="scroller"
        class="diff-scroll"
        tabindex="0"
        aria-label="差异结果"
        @scroll="scrollTop = ($event.target as HTMLDivElement).scrollTop"
      >
        <div :style="{ height: `${rows.length * 30}px` }" class="diff-space">
          <div
            :style="{ transform: `translateY(${start * 30}px)` }"
            class="diff-window"
          >
            <button
              v-for="row in visible"
              :key="row.id"
              class="diff-row"
              :class="row.kind"
              @click="selected = row"
            >
              <span class="diff-cell"
                ><i>{{ row.leftLine ?? '' }}</i
                ><span
                  ><template v-if="row.leftSpans"
                    ><mark
                      v-for="(part, i) in row.leftSpans"
                      :key="i"
                      :class="{ changed: part.changed }"
                      >{{ part.text }}</mark
                    ></template
                  ><template v-else>{{
                    row.left === undefined ? '' : row.left || '␤'
                  }}</template></span
                ></span
              ><span class="diff-cell"
                ><i>{{ row.rightLine ?? '' }}</i
                ><span
                  ><template v-if="row.rightSpans"
                    ><mark
                      v-for="(part, i) in row.rightSpans"
                      :key="i"
                      :class="{ changed: part.changed }"
                      >{{ part.text }}</mark
                    ></template
                  ><template v-else>{{
                    row.right === undefined ? '' : row.right || '␤'
                  }}</template></span
                ></span
              >
            </button>
          </div>
        </div>
        <p v-if="!rows.length" class="note">当前没有差异行。</p>
      </div></template
    >
    <div v-if="selected" class="box row-detail">
      <div class="box-head">
        <h2>行内容详情</h2>
        <button @click="selected = undefined">关闭</button>
      </div>
      <div class="two-col">
        <pre class="result">{{ selected.left ?? '（无对应行）' }}</pre>
        <pre class="result">{{ selected.right ?? '（无对应行）' }}</pre>
      </div>
    </div>
    <p class="feedback" role="status">{{ feedback }}</p>
    <p class="note">
      逐行比较，修改行内高亮字符差异。点击任意结果行可查看完整长文本。空行用 ␤
      提示，文件末尾换行参与比较。每侧支持 100 万字符、50,000
      行；差异过多或超时会停止计算。
    </p>
  </DevTool>
</template>
<style scoped>
.file-label {
  font-size: 12px;
}
.file-label input {
  max-width: 190px;
  padding: 3px;
  font-size: 11px;
}
.diff-options {
  margin-top: 18px;
}
.diff-head {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: var(--code-bg);
  padding: 10px;
  font-size: 12px;
}
.diff-scroll {
  height: 480px;
  overflow: auto;
  contain: strict;
  border: 1px solid var(--border);
  overflow-anchor: none;
}
.diff-space {
  position: relative;
}
.diff-window {
  position: absolute;
  top: 0;
  width: 100%;
}
.dev-tool .diff-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  width: 100%;
  height: 30px;
  border: 0;
  border-radius: 0;
  padding: 0;
  background: transparent;
  text-align: left;
  font: 12px/30px var(--mono);
}
.diff-cell {
  display: flex;
  min-width: 0;
  border-bottom: 1px solid var(--border);
  border-right: 1px solid var(--border);
}
.diff-cell > span {
  white-space: pre;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  padding: 0 8px;
}
.diff-cell i {
  font-style: normal;
  width: 45px;
  flex-shrink: 0;
  text-align: right;
  color: var(--text);
  padding-right: 6px;
}
.remove .diff-cell:first-child,
.change .diff-cell:first-child {
  background: rgba(230, 70, 80, 0.13);
}
.add .diff-cell:last-child,
.change .diff-cell:last-child {
  background: rgba(35, 165, 90, 0.14);
}
mark {
  background: none;
  color: inherit;
}
mark.changed {
  background: rgba(230, 150, 50, 0.35);
  font-weight: 600;
}
.row-detail {
  margin-top: 16px;
}
</style>

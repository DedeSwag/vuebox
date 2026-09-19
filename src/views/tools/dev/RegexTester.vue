<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import DevTool from '@/components/DevTool.vue'
import { useLocalClipboard } from '@/composables/useLocalClipboard'
import { useWorkerTask } from '@/composables/useWorkerTask'
import type { RegexRequest, RegexResult } from '@/utils/regex'
const pattern = ref(''),
  flags = ref('g'),
  text = ref(''),
  replacement = ref('$&')
const { feedback, copy } = useLocalClipboard()
const { result, busy, error, run, reset } = useWorkerTask<
  RegexRequest,
  RegexResult
>(
  () =>
    new Worker(new URL('../../../workers/regex.worker.ts', import.meta.url), {
      type: 'module',
    }),
  2000,
)
let debounce: ReturnType<typeof setTimeout> | undefined
watch([pattern, flags, text, replacement], () => {
  clearTimeout(debounce)
  reset()
  feedback.value = ''
  if (pattern.value)
    debounce = setTimeout(
      () =>
        run({
          pattern: pattern.value,
          flags: flags.value,
          text: text.value,
          replacement: replacement.value,
        }),
      300,
    )
})
onBeforeUnmount(() => clearTimeout(debounce))
const highlights = computed(() => {
  if (!result.value) return []
  let start = 0
  const spans: { text: string; match: boolean }[] = []
  for (const m of result.value.matches) {
    spans.push(
      { text: text.value.slice(start, m.index), match: false },
      { text: m.value || '▏', match: true },
    )
    start = m.end
  }
  spans.push({ text: text.value.slice(start), match: false })
  return spans
})
function example() {
  pattern.value = '(?<name>[A-Za-z]+)=(\\d+)'
  text.value = 'count=12\nlimit=50\nstatus=ready'
  replacement.value = '$<name>: $2'
  flags.value = 'g'
}
function clearInput() {
  pattern.value = ''
  text.value = ''
  replacement.value = '$&'
  reset()
}
</script>
<template>
  <DevTool
    title="正则表达式测试"
    description="JavaScript 正则匹配、捕获组和替换预览 · 超时自动停止"
    ><div class="controls">
      <button @click="example">载入示例</button
      ><button @click="clearInput">清空</button>
    </div>
    <div class="regex-pattern">
      <label
        >表达式<input
          v-model="pattern"
          spellcheck="false"
          placeholder="例如：(\w+)=(\d+)" /></label
      ><label
        >标志<input v-model="flags" aria-label="正则标志" placeholder="gimsuy"
      /></label>
    </div>
    <p class="note">
      直接填写表达式，不带两侧 /。g 全局 · i 忽略大小写 · m 多行锚点 · s
      点号匹配换行 · u Unicode · y 粘连匹配。最多展示 1,000 个匹配；计算超过 2
      秒会终止。
    </p>
    <div class="two-col">
      <label>测试文本<textarea v-model="text" spellcheck="false" /></label>
      <section class="box">
        <div class="box-head">
          <h2>匹配高亮</h2>
          <span
            >{{ result?.matches.length ?? 0 }} 个匹配{{
              result?.truncated ? '（已截断）' : ''
            }}</span
          >
        </div>
        <pre
          class="result"
        ><template v-for="(span,i) in highlights" :key="i"><mark v-if="span.match">{{span.text}}</mark><template v-else>{{span.text}}</template></template></pre>
      </section>
    </div>
    <p v-if="busy" class="note" role="status">正在匹配…</p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div v-if="result" class="table-wrap matches">
      <table>
        <thead>
          <tr>
            <th>序号</th>
            <th>位置 [起, 止)</th>
            <th>匹配值</th>
            <th>捕获组</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(match, i) in result.matches" :key="i">
            <td>{{ i + 1 }}</td>
            <td>{{ match.index }}–{{ match.end }}</td>
            <td>{{ match.value || '（零宽匹配）' }}</td>
            <td>
              <div>编号：{{ JSON.stringify(match.groups) }}</div>
              <div v-if="match.named">
                命名：{{ JSON.stringify(match.named) }}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="stack replacement">
      <label
        >替换为<input
          v-model="replacement"
          spellcheck="false"
          placeholder="$& 整个匹配；$1 第一个捕获组"
      /></label>
      <div class="box-head">
        <h2>替换结果</h2>
        <button
          :disabled="!result || result.truncated || busy"
          @click="copy(result!.replaced)"
        >
          复制替换结果
        </button>
      </div>
      <pre class="result">{{
        result?.truncated
          ? '匹配过多，请缩小范围后进行替换。'
          : (result?.replaced ?? '')
      }}</pre>
    </div>
    <p class="feedback" role="status">{{ feedback }}</p></DevTool
  >
</template>
<style scoped>
.regex-pattern {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 140px;
  gap: 16px;
}
.matches {
  max-height: 280px;
}
.replacement {
  margin-top: 20px;
}
mark {
  background: var(--accent-bg);
  color: var(--accent);
  border-bottom: 2px solid var(--accent);
}
@media (max-width: 600px) {
  .regex-pattern {
    grid-template-columns: 1fr;
  }
}
</style>

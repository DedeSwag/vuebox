<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import DevTool from '@/components/DevTool.vue'
import { useLocalClipboard } from '@/composables/useLocalClipboard'
import type { TextBatchOptions } from '@/utils/textBatch'
import { useWorkerTask } from '@/composables/useWorkerTask'
const input = ref('')
const options = reactive<TextBatchOptions>({
  trim: true,
  removeEmpty: true,
  dedupe: true,
  ignoreCase: false,
  sort: 'none',
  numeric: true,
  casing: 'none',
  prefix: '',
  suffix: '',
})
const { feedback, copy } = useLocalClipboard()
const {
  result: output,
  error,
  busy,
  run,
  reset,
} = useWorkerTask<
  { text: string; options: TextBatchOptions },
  { text: string; before: number; after: number }
>(
  () =>
    new Worker(
      new URL('../../../workers/textBatch.worker.ts', import.meta.url),
      { type: 'module' },
    ),
)
const result = computed(() => ({
  text: '',
  before: 0,
  after: 0,
  ...output.value,
  error: error.value,
}))
let debounce: ReturnType<typeof setTimeout> | undefined
watch([input, options], () => {
  clearTimeout(debounce)
  reset()
  feedback.value = ''
  if (input.value)
    debounce = setTimeout(
      () => run({ text: input.value, options: { ...options } }),
      250,
    )
})
onBeforeUnmount(() => clearTimeout(debounce))
function example() {
  input.value =
    '  HTTPServer  \nuserName\nuserName\n\nitem10\nitem2\n  中文字段 '
}
</script>
<template>
  <DevTool
    title="文本批处理"
    description="按行去重、排序、清理空白及命名转换 · 实时预览"
    ><div class="controls">
      <label class="check"
        ><input v-model="options.trim" type="checkbox" />去除行首尾空白</label
      ><label class="check"
        ><input v-model="options.removeEmpty" type="checkbox" />删除空行</label
      ><label class="check"
        ><input
          v-model="options.dedupe"
          type="checkbox"
        />去重（保留首次）</label
      ><label class="check"
        ><input
          v-model="options.ignoreCase"
          type="checkbox"
        />去重/排序忽略大小写</label
      >
    </div>
    <div class="controls">
      <label
        >排序<select v-model="options.sort">
          <option value="none">保持原顺序</option>
          <option value="asc">升序</option>
          <option value="desc">降序</option>
        </select></label
      ><label class="check"
        ><input v-model="options.numeric" type="checkbox" />自然数字排序</label
      ><label
        >转换<select v-model="options.casing">
          <option value="none">不转换</option>
          <option value="upper">大写</option>
          <option value="lower">小写</option>
          <option value="camel">camelCase</option>
          <option value="snake">snake_case</option>
          <option value="kebab">kebab-case</option>
        </select></label
      ><button @click="example">载入示例</button
      ><button @click="input = ''">清空</button>
    </div>
    <div class="two-col">
      <label>每行前缀<input v-model="options.prefix" /></label
      ><label>每行后缀<input v-model="options.suffix" /></label>
    </div>
    <div class="two-col editors">
      <label>原始文本<textarea v-model="input" spellcheck="false" /></label>
      <section>
        <div class="box-head">
          <h2>处理结果</h2>
          <button
            :disabled="!result.text || !!result.error"
            @click="copy(result.text)"
          >
            复制结果
          </button>
        </div>
        <textarea :value="result.text" readonly aria-label="批处理结果" />
      </section>
    </div>
    <p v-if="busy" class="note" role="status">正在处理…</p>
    <p v-if="result.error" class="error" role="alert">{{ result.error }}</p>
    <p class="note">
      {{ result.before }} 行 → {{ result.after }} 行。处理顺序：去首尾空白 →
      删除空行 → 命名转换 → 去重 → 排序 → 添加前后缀。换行统一为
      LF；“忽略大小写”影响去重及排序，不改变原文大小写。
    </p>
    <p class="feedback" role="status">{{ feedback }}</p></DevTool
  >
</template>
<style scoped>
.editors {
  margin-top: 20px;
}
</style>

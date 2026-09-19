<script setup lang="ts">
import { ref, watch } from 'vue'
import DevTool from '@/components/DevTool.vue'
import { useWorkerTask } from '@/composables/useWorkerTask'
import { useLocalClipboard } from '@/composables/useLocalClipboard'
import type { JsonTypesRequest } from '@/utils/jsonTypes'
const source = ref(''),
  name = ref('ApiResponse'),
  readonly = ref(false),
  optional = ref(false)
const { result, busy, error, run, reset } = useWorkerTask<
  JsonTypesRequest,
  string
>(
  () =>
    new Worker(
      new URL('../../../workers/jsonTypes.worker.ts', import.meta.url),
      { type: 'module' },
    ),
)
const { feedback, copy } = useLocalClipboard()
watch([source, name, readonly, optional], () => {
  reset()
  feedback.value = ''
})
function generate() {
  run({
    source: source.value,
    name: name.value,
    readonly: readonly.value,
    optional: optional.value,
  })
}
function example() {
  source.value =
    '{"code":200,"data":[{"id":1,"name":"示例","email":null},{"id":2,"name":"VueBox","enabled":true}]}'
}
function clearInput() {
  source.value = ''
  reset()
}
</script>
<template>
  <DevTool
    title="JSON 转 TypeScript"
    description="从接口样本生成类型，合并数组元素并识别缺失字段"
    wide
    ><div class="controls">
      <label>根类型名<input v-model="name" placeholder="ApiResponse" /></label
      ><label class="check"
        ><input v-model="readonly" type="checkbox" />只读属性与数组</label
      ><label class="check"
        ><input v-model="optional" type="checkbox" />所有字段可选</label
      ><button :disabled="busy" @click="generate">
        {{ busy ? '生成中…' : '生成类型' }}</button
      ><button @click="example">载入示例</button
      ><button @click="clearInput">清空</button>
    </div>
    <div class="two-col">
      <label
        >JSON 样本<textarea
          v-model="source"
          spellcheck="false"
          placeholder="粘贴接口返回的 JSON"
        />
      </label>
      <section class="box">
        <div class="box-head">
          <h2>TypeScript 类型</h2>
          <button :disabled="result === null || busy" @click="copy(result!)">
            复制类型
          </button>
        </div>
        <pre class="result">{{ result ?? '等待生成…' }}</pre>
      </section>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p class="feedback" role="status">{{ feedback }}</p>
    <p class="note">
      根据实际样本推断，不等同于接口契约。数组内不同值生成联合类型，对象缺失的字段标为可选；空数组为
      unknown[] 的等价类型，空对象为 Record&lt;string,
      unknown&gt;。日期字符串仍为 string。最多 50 万字符、50 层嵌套。
    </p></DevTool
  >
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import DevTool from '@/components/DevTool.vue'
import { useWorkerTask } from '@/composables/useWorkerTask'
import { useLocalClipboard } from '@/composables/useLocalClipboard'
import type { YamlRequest } from '@/utils/yaml'
const source = ref(''),
  direction = ref<YamlRequest['direction']>('json-yaml'),
  indent = ref(2)
const { result, busy, error, run, reset } = useWorkerTask<YamlRequest, string>(
  () =>
    new Worker(new URL('../../../workers/yaml.worker.ts', import.meta.url), {
      type: 'module',
    }),
)
const { feedback, copy } = useLocalClipboard()
watch([source, direction, indent], () => {
  reset()
  feedback.value = ''
})
function convert() {
  run({
    source: source.value,
    direction: direction.value,
    indent: indent.value,
  })
}
async function reverse() {
  if (result.value === null) return
  source.value = result.value
  direction.value = direction.value === 'json-yaml' ? 'yaml-json' : 'json-yaml'
  await nextTick()
  convert()
}
function example() {
  source.value =
    direction.value === 'json-yaml'
      ? '{"name":"VueBox","port":8080,"enabled":true,"features":["JSON","Diff"],"note":null}'
      : 'name: VueBox\nport: 8080\nenabled: true\nfeatures:\n  - JSON\n  - Diff\nnote: null\n'
}
function clearInput() {
  source.value = ''
  reset()
}
</script>
<template>
  <DevTool
    title="JSON / YAML 互转"
    description="配置文件转换 · YAML 1.2 · 全部在本地处理"
    wide
    ><div class="controls">
      <label
        >转换方向<select v-model="direction">
          <option value="json-yaml">JSON → YAML</option>
          <option value="yaml-json">YAML → JSON</option>
        </select></label
      ><label
        >缩进<select v-model.number="indent">
          <option :value="2">2 空格</option>
          <option :value="4">4 空格</option>
        </select></label
      ><button :disabled="busy" @click="convert">
        {{ busy ? '转换中…' : '转换' }}</button
      ><button :disabled="result === null" @click="reverse">结果反向转换</button
      ><button @click="example">载入示例</button
      ><button @click="clearInput">清空</button>
    </div>
    <div class="two-col">
      <label
        >{{ direction === 'json-yaml' ? 'JSON 输入' : 'YAML 输入'
        }}<textarea v-model="source" spellcheck="false" />
      </label>
      <section class="box">
        <div class="box-head">
          <h2>{{ direction === 'json-yaml' ? 'YAML 结果' : 'JSON 结果' }}</h2>
          <button :disabled="result === null || busy" @click="copy(result!)">
            复制结果
          </button>
        </div>
        <pre class="result">{{ result ?? '等待转换…' }}</pre>
      </section>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p class="feedback" role="status">{{ feedback }}</p>
    <p class="note">
      转换保留数据结构，注释和原有排版不会保留。YAML
      对象键须为字符串，仅支持单文档与核心数据类型；不支持自定义标签、循环别名。小数按
      JavaScript 精度处理，超出安全范围的整数会报错，请将精确
      ID/金额改为字符串。最多 50 万字符。
    </p></DevTool
  >
</template>

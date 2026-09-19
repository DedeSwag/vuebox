<script setup lang="ts">
import { computed, ref } from 'vue'
import { generateUuids } from '@/utils/encoding'
const emit = defineEmits<{ notify: [message: string] }>()
const count = ref<number | string>(1)
const uppercase = ref(false)
const hyphens = ref(true)
const ids = ref<string[]>([])
const error = ref('')
const output = computed(() => ids.value.map(id => {
  const value = hyphens.value ? id : id.replace(/-/g, '')
  return uppercase.value ? value.toUpperCase() : value
}).join('\n'))
function generate() {
  error.value = ''
  try { ids.value = generateUuids(Number(count.value)) }
  catch (reason) { ids.value = []; error.value = (reason as Error).message }
}
async function copy() {
  try { await navigator.clipboard.writeText(output.value); emit('notify', `已复制 ${ids.value.length} 个 UUID`) }
  catch { emit('notify', '复制失败，请选中结果手动复制。') }
}
</script>

<template>
  <div class="encoding-controls">
    <p class="encoding-note">UUID v4 · 使用浏览器安全随机数生成。支持一次生成 1–1000 个，每行一个；调整大小写和连字符仅改变显示格式，不会重新生成。</p>
    <div class="encoding-grid uuid-grid">
      <section class="encoding-panel">
        <h2>生成选项</h2>
        <label for="uuid-count">生成数量</label>
        <input id="uuid-count" v-model="count" type="number" min="1" max="1000" step="1" :aria-invalid="!!error" aria-describedby="uuid-error" @keydown.enter="generate" />
        <label class="check-label"><input v-model="uppercase" type="checkbox" />使用大写字母</label>
        <label class="check-label"><input v-model="hyphens" type="checkbox" />保留连字符（标准 UUID 格式）</label>
        <div class="encoding-actions"><button class="accent" @click="generate">生成 UUID</button><button @click="ids = []; error = ''">清空</button></div>
        <p id="uuid-error" class="encoding-error" role="status">{{ error }}</p>
      </section>
      <section class="encoding-panel">
        <div class="encoding-actions"><h2><label for="uuid-output">生成结果 · {{ ids.length }} 个</label></h2><button :disabled="!ids.length" @click="copy">复制全部</button></div>
        <textarea id="uuid-output" :value="output" readonly rows="12" placeholder="点击“生成 UUID”开始生成" />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { decodeBase64, encodeBase64 } from '@/utils/encoding'
import type { Base64Mode } from '@/utils/encoding'
const emit = defineEmits<{ notify: [message: string] }>()
const input = ref('')
const direction = ref<'encode' | 'decode'>('encode')
const mode = ref<Base64Mode>('standard')
const result = computed(() => {
  try { return { output: (direction.value === 'encode' ? encodeBase64 : decodeBase64)(input.value, mode.value), error: '' } }
  catch (error) { return { output: '', error: (error as Error).message } }
})
function example() { direction.value = 'encode'; input.value = '你好，VueBox 👋' }
function swap() { input.value = result.value.output; direction.value = direction.value === 'encode' ? 'decode' : 'encode' }
async function copy() {
  try { await navigator.clipboard.writeText(result.value.output); emit('notify', '已复制转换结果') }
  catch { emit('notify', '复制失败，请选中结果手动复制。') }
}
</script>
<template>
  <div class="encoding-controls">
    <div class="encoding-actions">
      <label class="mode-label" for="base64-mode">Base64 模式</label>
      <select id="base64-mode" v-model="mode"><option value="standard">标准 Base64</option><option value="url">Base64URL（URL-safe）</option></select>
      <div class="encoding-actions operation-actions"><button :class="{ accent: direction === 'encode' }" :aria-pressed="direction === 'encode'" @click="direction = 'encode'">编码</button><button :class="{ accent: direction === 'decode' }" :aria-pressed="direction === 'decode'" @click="direction = 'decode'">解码</button></div>
    </div>
    <p class="encoding-note">{{ mode === 'standard' ? '标准 Base64 使用 + / 字符及 = 填充；解码允许省略填充、忽略空格与换行。' : 'Base64URL 使用 - _ 替代 + /，编码结果省略 = 填充，适合 URL 参数。' }} 按 UTF-8 处理中文、Emoji 和换行。Base64 是编码方式，不是加密；此处处理文本。</p>
    <div class="encoding-grid">
      <section class="encoding-panel"><div class="encoding-actions"><h2><label for="base64-input">原始输入</label></h2><div class="encoding-actions"><button @click="example">载入示例</button><button @click="input = ''">清空</button></div></div><textarea id="base64-input" v-model="input" :aria-invalid="!!result.error" aria-describedby="base64-error" rows="12" spellcheck="false" placeholder="输入文本，结果会实时更新" /></section>
      <section class="encoding-panel"><div class="encoding-actions"><h2><label for="base64-output">转换结果</label></h2><button :disabled="!result.output || !!result.error" @click="copy">复制结果</button></div><textarea id="base64-output" :value="result.output" rows="12" readonly placeholder="转换结果显示在这里" /><div class="encoding-actions"><span class="encoding-hint">{{ result.output.length.toLocaleString() }} 字符</span><button :disabled="!result.output || !!result.error" @click="swap">结果作为输入并反向转换</button></div></section>
    </div>
    <p id="base64-error" class="encoding-error" role="status">{{ result.error }}</p>
  </div>
</template>

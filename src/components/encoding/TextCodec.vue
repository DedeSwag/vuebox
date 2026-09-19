<script setup lang="ts">
import { computed, ref } from 'vue'
import { decodeBase64, encodeBase64, decodeEscape, encodeEscape } from '@/utils/encoding'
import type { Base64Mode, EscapeMode } from '@/utils/encoding'
const props = defineProps<{ kind: 'base64' | 'escape' }>()
const emit = defineEmits<{ notify: [message: string] }>()
const input = ref('')
const direction = ref<'encode' | 'decode'>('encode')
const base64Mode = ref<Base64Mode>('standard')
const escapeMode = ref<EscapeMode>('html')
const result = computed(() => {
  try {
    const output = props.kind === 'base64'
      ? (direction.value === 'encode' ? encodeBase64 : decodeBase64)(input.value, base64Mode.value)
      : (direction.value === 'encode' ? encodeEscape : decodeEscape)(input.value, escapeMode.value)
    return { output, error: '' }
  } catch (error) { return { output: '', error: (error as Error).message } }
})
const hint = computed(() => {
  if (props.kind === 'base64') return base64Mode.value === 'standard'
    ? '按 UTF-8 处理中文、Emoji 和换行。标准 Base64 使用 + / 字符及 = 填充；解码允许省略填充、忽略空格与换行。'
    : 'Base64URL 使用 - _ 替代 + /，编码结果省略 = 填充，适合 URL 参数。解码时请选择与输入一致的模式。'
  return {
    html: '转义 & < > 双引号和单引号；反转义支持 amp、lt、gt、quot、apos、nbsp 及十进制、十六进制数字实体。每次只处理一层，结果仅作文本展示。',
    unicode: '输出不带外层引号的 JSON 字符串内容；非 ASCII 字符转为 \\uXXXX，Emoji 使用代理对，换行与引号按 JSON 规则转义。',
    hex: '按 UTF-8 字节转换，每个字节用两位十六进制表示。解码支持连续字符或空白分隔，不接受 0x 前缀。',
  }[escapeMode.value]
})
function example() {
  direction.value = 'encode'
  input.value = props.kind === 'base64' ? '你好，VueBox 👋' : '<div title="VueBox">中文 & Emoji 👋</div>'
}
function swap() {
  input.value = result.value.output
  direction.value = direction.value === 'encode' ? 'decode' : 'encode'
}
async function copy() {
  try { await navigator.clipboard.writeText(result.value.output); emit('notify', '已复制转换结果') }
  catch { emit('notify', '复制失败，请选中结果手动复制。') }
}
</script>

<template>
  <div class="encoding-controls">
    <div class="encoding-actions">
      <label class="mode-label" :for="`${kind}-mode`">{{ kind === 'base64' ? 'Base64 模式' : '转义类型' }}</label>
      <select v-if="kind === 'base64'" :id="`${kind}-mode`" v-model="base64Mode"><option value="standard">标准 Base64</option><option value="url">Base64URL（URL-safe）</option></select>
      <select v-else :id="`${kind}-mode`" v-model="escapeMode"><option value="html">HTML 实体</option><option value="unicode">Unicode / JSON 转义</option><option value="hex">UTF-8 十六进制</option></select>
      <div class="encoding-actions operation-actions">
        <button :class="{ accent: direction === 'encode' }" :aria-pressed="direction === 'encode'" @click="direction = 'encode'">{{ kind === 'base64' ? '编码' : '转义 / 编码' }}</button>
        <button :class="{ accent: direction === 'decode' }" :aria-pressed="direction === 'decode'" @click="direction = 'decode'">{{ kind === 'base64' ? '解码' : '反转义 / 解码' }}</button>
      </div>
    </div>
    <p class="encoding-note">{{ hint }}<template v-if="kind === 'base64'"> Base64 是编码方式，不是加密；此处处理文本，不处理二进制文件。</template></p>
    <div class="encoding-grid">
      <section class="encoding-panel">
        <div class="encoding-actions"><h2><label :for="`${kind}-input`">原始输入</label></h2><div class="encoding-actions"><button @click="example">载入示例</button><button @click="input = ''">清空</button></div></div>
        <textarea :id="`${kind}-input`" v-model="input" :aria-invalid="!!result.error" :aria-describedby="`${kind}-error`" rows="12" spellcheck="false" placeholder="输入文本，结果会实时更新" />
        <p class="encoding-hint">{{ input.length.toLocaleString() }} 字符</p>
      </section>
      <section class="encoding-panel">
        <div class="encoding-actions"><h2><label :for="`${kind}-output`">转换结果</label></h2><button :disabled="!result.output || !!result.error" @click="copy">复制结果</button></div>
        <textarea :id="`${kind}-output`" :value="result.output" rows="12" readonly placeholder="转换结果显示在这里" />
        <div class="encoding-actions"><span class="encoding-hint">{{ result.output.length.toLocaleString() }} 字符</span><button :disabled="!result.output || !!result.error" @click="swap">结果作为输入并反向转换</button></div>
      </section>
    </div>
    <p :id="`${kind}-error`" class="encoding-error" role="status">{{ result.error }}</p>
  </div>
</template>

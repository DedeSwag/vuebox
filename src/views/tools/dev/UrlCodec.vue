<script setup lang="ts">
import { computed, ref } from 'vue'
import DevTool from '@/components/DevTool.vue'
import { encodeText, decodeText, type EncodingMode } from '@/utils/url'
import { useLocalClipboard } from '@/composables/useLocalClipboard'
const input = ref('')
const mode = ref<EncodingMode>('component')
const direction = ref<'encode' | 'decode'>('encode')
const { copy, feedback } = useLocalClipboard()
const result = computed(() => {
  try { return { output: (direction.value === 'encode' ? encodeText : decodeText)(input.value, mode.value), error: '' } }
  catch { return { output: '', error: direction.value === 'decode' ? '解码失败：请检查 % 编码是否完整，以及内容是否为有效 UTF-8。' : '编码失败：输入包含不完整的 Unicode 字符。' } }
})
function swap() { input.value = result.value.output; direction.value = direction.value === 'encode' ? 'decode' : 'encode' }
</script>
<template>
  <DevTool title="URL 编解码" description="普通与表单 URL 编码、解码 · 全部在浏览器本地完成">
    <div class="controls"><label>编码模式<select v-model="mode"><option value="component">普通编码（encodeURIComponent）</option><option value="form">表单编码（application/x-www-form-urlencoded）</option></select></label><button :class="{ active: direction === 'encode' }" :aria-pressed="direction === 'encode'" @click="direction = 'encode'">URL 编码</button><button :class="{ active: direction === 'decode' }" :aria-pressed="direction === 'decode'" @click="direction = 'decode'">URL 解码</button><button @click="input = ''; feedback = ''">清空</button></div>
    <p class="note">{{ mode === 'component' ? '对文本或参数组件编码：空格转为 %20，解码保留 +。完整 URL 的 : / ? 等分隔符也会编码。' : '按表单键或值编码：空格转为 +，加号转为 %2B；解码时将 + 还原为空格。' }}</p>
    <div class="two-col"><section class="box"><div class="box-head"><h2><label for="url-input">原始文本</label></h2><button @click="input = '你好 VueBox + &'; direction = 'encode'">载入示例</button></div><textarea id="url-input" v-model="input" spellcheck="false" :aria-invalid="!!result.error" aria-describedby="url-error" placeholder="输入需要编码或解码的文本" /></section><section class="box"><div class="box-head"><h2><label for="url-output">转换结果</label></h2><button :disabled="!result.output" @click="copy(result.output)">复制结果</button></div><textarea id="url-output" :value="result.output" readonly placeholder="结果实时显示" /><button :disabled="!result.output" @click="swap">结果作为输入并反向转换</button></section></div>
    <p id="url-error" class="error" role="status">{{ result.error }}</p><p role="status">{{ feedback }}</p>
  </DevTool>
</template>
<style scoped>
select { max-width: 100%; }
.controls > label { flex-wrap: wrap; min-width: 0; }
.box > button { margin-top: 12px; }
</style>

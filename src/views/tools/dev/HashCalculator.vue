<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import DevTool from '@/components/DevTool.vue'
import { useLocalClipboard } from '@/composables/useLocalClipboard'
import { digestBytes, hashAlgorithms, type HashAlgorithm } from '@/utils/hash'
const mode = ref<'text' | 'file'>('text'),
  text = ref(''),
  algorithm = ref<HashAlgorithm>('SHA-256'),
  expected = ref(''),
  output = ref(''),
  error = ref(''),
  busy = ref(false)
const file = shallowRef<File>()
const { feedback, copy } = useLocalClipboard()
let generation = 0
watch([mode, text, algorithm, file], () => {
  generation++
  output.value = ''
  error.value = ''
  feedback.value = ''
  busy.value = false
})
const comparison = computed(() => {
  if (!output.value || !expected.value.trim()) return ''
  const value = expected.value.replace(/\s/g, '').toLowerCase()
  return !/^[a-f0-9]+$/.test(value)
    ? '预期摘要应为十六进制字符'
    : value === output.value
      ? '✓ 摘要一致'
      : '摘要不一致'
})
async function calculate() {
  const id = ++generation
  busy.value = true
  error.value = ''
  output.value = ''
  try {
    let bytes: ArrayBuffer
    if (mode.value === 'file') {
      if (!file.value) throw new Error('请先选择文件。')
      if (file.value.size > 20 * 1024 * 1024)
        throw new Error('文件最多支持 20 MiB。')
      bytes = await file.value.arrayBuffer()
    } else {
      if (text.value.length > 1_000_000)
        throw new Error('文本最多支持 100 万字符。')
      bytes = new TextEncoder().encode(text.value).buffer
    }
    const digest = await digestBytes(bytes, algorithm.value)
    if (id === generation) output.value = digest
  } catch (e) {
    if (id === generation) error.value = (e as Error).message
  } finally {
    if (id === generation) busy.value = false
  }
}
</script>
<template>
  <DevTool
    title="哈希摘要计算"
    description="计算文本或文件摘要，并核对预期值 · 文件仅在本地读取"
    ><div class="controls">
      <button :class="{ active: mode === 'text' }" @click="mode = 'text'">
        文本</button
      ><button :class="{ active: mode === 'file' }" @click="mode = 'file'">
        文件</button
      ><label
        >算法<select v-model="algorithm">
          <option v-for="item in hashAlgorithms" :key="item">{{ item }}</option>
        </select></label
      ><button :disabled="busy" @click="calculate">
        {{ busy ? '计算中…' : '计算摘要' }}
      </button>
    </div>
    <label v-if="mode === 'text'"
      >原始文本（UTF-8）<textarea
        v-model="text"
        spellcheck="false"
        placeholder="可以计算空文本的摘要"
      /></label
    ><label v-else
      >选择文件（最大 20 MiB）<input
        type="file"
        @change="file = ($event.target as HTMLInputElement).files?.[0]"
      /><span class="muted">{{
        file
          ? `${file.name} · ${file.size.toLocaleString()} 字节`
          : '未选择文件'
      }}</span></label
    >
    <p class="note">
      摘要包含文本原有空格及换行。SHA-1
      仅用于兼容旧校验值，不适合安全用途。哈希是单向摘要，不是可逆加密。
    </p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <section class="box">
      <div class="box-head">
        <h2>{{ algorithm }} 结果</h2>
        <button :disabled="!output" @click="copy(output)">复制摘要</button>
      </div>
      <pre class="result">{{ output || '点击“计算摘要”生成结果' }}</pre>
    </section>
    <label class="compare"
      >预期摘要（可选）<input
        v-model="expected"
        placeholder="粘贴预期十六进制摘要进行核对"
    /></label>
    <p class="feedback" role="status">{{ comparison || feedback }}</p></DevTool
  >
</template>
<style scoped>
.compare {
  margin-top: 20px;
}
</style>

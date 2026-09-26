<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import DevTool from '@/components/DevTool.vue'
import { useLocalClipboard } from '@/composables/useLocalClipboard'
import { imageDataUrl, imageTypes, maxImageBytes, normalizeImageMime, parseImageBase64 } from '@/utils/imageBase64'
const mode = ref<'encode' | 'decode'>('encode')
const text = ref('')
const fallbackMime = ref('image/png')
const format = ref<'data' | 'raw'>('data')
const fileInput = ref<HTMLInputElement>()
const result = shallowRef<{ dataUrl: string; mime: string; size: number; width: number; height: number; name: string }>()
const busy = ref(false)
const error = ref('')
const { copy, feedback } = useLocalClipboard()
let generation = 0
let cancelValidation: (() => void) | undefined
const output = computed(() => result.value ? format.value === 'data' ? result.value.dataUrl : result.value.dataUrl.slice(result.value.dataUrl.indexOf(',') + 1) : '')
const extension = computed(() => imageTypes.find(type => type.mime === result.value?.mime)?.extension ?? 'png')
function resetResult() {
  generation++
  cancelValidation?.()
  result.value = undefined; busy.value = false; error.value = ''; feedback.value = ''
}
watch([mode, text, fallbackMime], resetResult, { flush: 'sync' })
function clear() { resetResult(); text.value = ''; if (fileInput.value) fileInput.value.value = '' }
function inspect(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const finish = (reason?: string) => {
      clearTimeout(timer)
      image.onload = null; image.onerror = null; cancelValidation = undefined
      if (reason) { image.src = ''; reject(new Error(reason)) }
      else resolve({ width: image.naturalWidth, height: image.naturalHeight })
    }
    const timer = setTimeout(() => finish('图片加载超时，请尝试较小的图片。'), 10000)
    cancelValidation = () => finish('已取消读取。')
    image.onload = () => finish()
    image.onerror = () => finish('内容不是可预览的图片，或当前浏览器不支持该图片格式。请检查图片内容与 MIME 类型。')
    image.src = dataUrl
  })
}
async function convert(file?: File) {
  resetResult()
  const id = generation
  busy.value = true
  try {
    let dataUrl: string, mime: string, size: number
    if (file) {
      if (file.size > maxImageBytes) throw new Error('图片最大支持 5 MiB。')
      const suffix = file.name.split('.').pop()?.toLowerCase()
      mime = normalizeImageMime(file.type || imageTypes.find(type => type.extension === suffix || (suffix === 'jpeg' && type.extension === 'jpg'))?.mime || '')
      const bytes = new Uint8Array(await file.arrayBuffer())
      if (id !== generation) return
      dataUrl = imageDataUrl(bytes, mime)
      size = bytes.length
    } else {
      const decoded = parseImageBase64(text.value, fallbackMime.value)
      dataUrl = decoded.dataUrl; mime = decoded.mime; size = decoded.bytes.length
    }
    const dimensions = await inspect(dataUrl)
    if (id !== generation) return
    result.value = { dataUrl, mime, size, ...dimensions, name: file?.name ?? '还原图片' }
  } catch (reason) { if (id === generation) error.value = (reason as Error).message }
  finally { if (id === generation) busy.value = false }
}
function selectFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) void convert(file)
  input.value = ''
}
function drop(event: DragEvent) {
  const files = event.dataTransfer?.files
  if (!files?.length) return
  if (files.length !== 1) { resetResult(); error.value = '请每次选择一张图片。'; return }
  void convert(files[0])
}
onBeforeUnmount(resetResult)
</script>
<template>
  <DevTool title="图片 Base64" description="图片与 Base64 双向转换，预览、复制及下载 · 文件仅在浏览器本地读取">
    <div class="controls"><button :class="{ active: mode === 'encode' }" :aria-pressed="mode === 'encode'" @click="mode = 'encode'">图片 → Base64</button><button :class="{ active: mode === 'decode' }" :aria-pressed="mode === 'decode'" @click="mode = 'decode'">Base64 → 图片</button><button @click="clear">清空</button></div>
    <div class="two-col"><section class="box">
      <template v-if="mode === 'encode'"><h2>选择图片</h2><div class="drop-zone" @dragover.prevent @drop.prevent="drop"><label>点击选择或拖入一张图片<input ref="fileInput" type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/bmp,image/x-icon,image/vnd.microsoft.icon,image/avif,image/svg+xml" @change="selectFile" /></label><p class="muted">支持 PNG、JPEG、GIF、WebP、BMP、ICO、AVIF、SVG，最大 5 MiB。</p></div></template>
      <template v-else><label for="image-base64-input">图片 Base64 / Data URL<textarea id="image-base64-input" v-model="text" spellcheck="false" placeholder="data:image/png;base64,iVBOR… 或纯 Base64" :aria-invalid="!!error" aria-describedby="image-error" /></label><div class="controls decode-controls"><label>纯 Base64 的图片类型<select v-model="fallbackMime"><option v-for="type in imageTypes" :key="type.mime" :value="type.mime">{{ type.name }}</option></select></label><button :disabled="busy || !text.trim()" @click="convert()">还原图片</button></div><p class="muted">Data URL 自动识别类型；纯 Base64 请选对应格式。修改后点击还原。</p></template>
      <div v-if="result" class="preview"><img :src="result.dataUrl" alt="本地图片预览" /><p class="muted">{{ result.name }} · {{ result.width }} × {{ result.height }} · {{ result.size.toLocaleString() }} 字节</p><a :href="result.dataUrl" :download="`image.${extension}`">下载图片（{{ extension }}）</a></div>
    </section><section class="box"><div class="box-head"><h2><label for="image-base64-output">编码结果</label></h2><button :disabled="!result" @click="copy(output)">复制结果</button></div><label class="format-label">输出格式<select v-model="format"><option value="data">完整 Data URL</option><option value="raw">纯 Base64</option></select></label><textarea id="image-base64-output" :value="output" readonly spellcheck="false" placeholder="转换后显示 Base64 内容" /><p class="muted">{{ output.length.toLocaleString() }} 字符 · 编码保留原始文件内容，不压缩图片。</p></section></div>
    <p v-if="busy" role="status" class="note">正在读取并验证图片…</p><p id="image-error" class="error" role="status">{{ error }}</p><p class="feedback" role="status">{{ feedback }}</p>
  </DevTool>
</template>
<style scoped>
.drop-zone { border: 1px dashed var(--accent-border); background: var(--accent-bg); border-radius: 8px; padding: 22px 14px; margin-top: 16px; }
.drop-zone input { width: 100%; padding: 8px 0; border: 0; background: transparent; }
.drop-zone p { margin-top: 12px; }
.preview { margin-top: 20px; overflow-wrap: anywhere; }
.preview img { display: block; max-width: 100%; max-height: 280px; margin: 0 auto 12px; object-fit: contain; border: 1px solid var(--border); border-radius: 6px; }
.preview a { display: inline-block; margin-top: 10px; }
.format-label { margin-bottom: 12px; }
.decode-controls { margin: 14px 0; }
</style>

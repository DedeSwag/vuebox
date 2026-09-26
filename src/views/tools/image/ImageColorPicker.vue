<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef } from 'vue'
import DevTool from '@/components/DevTool.vue'
import { useLocalClipboard } from '@/composables/useLocalClipboard'
import { colorFormats } from '@/utils/color'
import { imagePixelAt, pixelColor } from '@/utils/imageColor'

type Sample = { x: number; y: number; formats: ReturnType<typeof colorFormats>; alpha: number }
const canvas = ref<HTMLCanvasElement>()
const source = shallowRef<{ name: string; width: number; height: number }>()
const selected = shallowRef<Sample>()
const hovered = shallowRef<Sample>()
const history = ref<Sample[]>([])
const busy = ref(false)
const error = ref('')
const { copy, feedback } = useLocalClipboard()
let generation = 0
let cancelLoad: (() => void) | undefined
let context: CanvasRenderingContext2D | null = null
const marker = computed(() => selected.value && source.value ? {
  left: `${(selected.value.x + 0.5) / source.value.width * 100}%`,
  top: `${(selected.value.y + 0.5) / source.value.height * 100}%`,
} : undefined)

function clear() {
  generation++
  cancelLoad?.()
  if (canvas.value) { canvas.value.width = 0; canvas.value.height = 0 }
  context = null
  source.value = undefined; selected.value = undefined; hovered.value = undefined
  history.value = []; busy.value = false; error.value = ''; feedback.value = ''
}

function readImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    const finish = (message?: string) => {
      clearTimeout(timer)
      image.onload = null; image.onerror = null
      URL.revokeObjectURL(url); cancelLoad = undefined
      if (message) { image.src = ''; reject(new Error(message)) }
      else resolve(image)
    }
    const timer = setTimeout(() => finish('图片读取超时，请尝试其他图片。'), 15000)
    cancelLoad = () => finish('已取消读取。')
    image.onload = () => finish()
    image.onerror = () => finish('无法读取图片，文件可能已损坏或格式不受浏览器支持。')
    image.src = url
  })
}

async function load(file: File) {
  clear()
  const id = generation
  busy.value = true
  try {
    if (!file.size) throw new Error('图片文件为空。')
    if (file.size > 10 * 1024 * 1024) throw new Error('图片最大支持 10 MiB。')
    if (file.type ? !file.type.startsWith('image/') : !/\.(png|jpe?g|webp|gif|bmp|ico|avif|svg)$/i.test(file.name))
      throw new Error('请选择图片文件，例如 PNG、JPEG 或 WebP。')
    const image = await readImage(file)
    if (id !== generation) return
    const width = image.naturalWidth, height = image.naturalHeight
    if (!width || !height) throw new Error('图片尺寸无效。')
    if (width * height > 24_000_000 || Math.max(width, height) > 16384)
      throw new Error('图片尺寸过大，请使用 2400 万像素以内、单边不超过 16384 像素的图片。')
    source.value = { name: file.name, width, height }
    await nextTick()
    if (id !== generation || !canvas.value) return
    canvas.value.width = width; canvas.value.height = height
    context = canvas.value.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('当前浏览器不支持图片取色，请换用现代浏览器。')
    context.drawImage(image, 0, 0)
    // 提前验证像素可读，避免用户点击后才发现无法取色。
    context.getImageData(0, 0, 1, 1)
  } catch (reason) {
    if (id === generation) {
      clear()
      error.value = reason instanceof DOMException && reason.name === 'SecurityError'
        ? '此图片无法读取像素，请改用本地 PNG 或 JPEG 图片。'
        : (reason as Error).message
    }
  } finally { if (id === generation) busy.value = false }
}

function selectFile(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.[0]) void load(input.files[0])
  input.value = ''
}
function drop(event: DragEvent) {
  const files = event.dataTransfer?.files
  if (!files?.length) return
  if (files.length !== 1) { error.value = '请每次拖入一张图片。'; return }
  void load(files[0])
}
function sample(x: number, y: number): Sample | undefined {
  if (!context || !source.value || busy.value) return
  const color = pixelColor(context.getImageData(x, y, 1, 1).data)
  return { x, y, formats: colorFormats(color), alpha: color.a }
}
function choose(value: Sample) {
  selected.value = value; feedback.value = ''
  history.value = [value, ...history.value.filter(item => item.formats.hex !== value.formats.hex)].slice(0, 12)
}
function point(event: MouseEvent, commit: boolean) {
  if (!canvas.value || !source.value) return
  const rect = canvas.value.getBoundingClientRect()
  const { x, y } = imagePixelAt(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height, source.value.width, source.value.height)
  const value = sample(x, y)
  if (!value) return
  if (commit) choose(value)
  else hovered.value = value
}
function keyboard(event: KeyboardEvent) {
  if (!source.value || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(event.key)) return
  event.preventDefault()
  let x = selected.value?.x ?? Math.floor(source.value.width / 2)
  let y = selected.value?.y ?? Math.floor(source.value.height / 2)
  const step = event.shiftKey ? 10 : 1
  if (event.key === 'ArrowLeft') x -= step
  if (event.key === 'ArrowRight') x += step
  if (event.key === 'ArrowUp') y -= step
  if (event.key === 'ArrowDown') y += step
  const value = sample(Math.max(0, Math.min(source.value.width - 1, x)), Math.max(0, Math.min(source.value.height - 1, y)))
  if (value) choose(value)
}
onBeforeUnmount(clear)
</script>

<template>
  <DevTool title="图片取色器" description="点击图片提取像素颜色，复制 HEX、RGB 与 HSL · 图片仅在浏览器本地处理">
    <div class="upload" @dragover.prevent @drop.prevent="drop">
      <label for="picker-file">选择或拖入图片<input id="picker-file" type="file" accept="image/*" @change="selectFile" /></label>
      <p class="muted">支持浏览器可读取的 PNG、JPEG、WebP、GIF、SVG 等格式，最大 10 MiB。</p>
      <button @click="clear">清空</button>
    </div>
    <p v-if="busy" role="status" class="note">正在读取图片…</p>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <div class="picker-layout">
      <section class="box image-panel">
        <div class="box-head"><h2>图片预览</h2><span v-if="source" class="muted">{{ source.width }} × {{ source.height }} 像素</span></div>
        <template v-if="source">
          <p class="file-name muted">{{ source.name }}</p>
          <div class="image-stage checker">
            <canvas ref="canvas" tabindex="0" aria-label="图片取色区域" aria-describedby="picker-help" @click="point($event, true)" @pointermove="point($event, false)" @pointerleave="hovered = undefined" @keydown="keyboard">请使用支持 Canvas 的浏览器。</canvas>
            <span v-if="marker" class="marker" :style="marker" aria-hidden="true" />
          </div>
          <p class="hover-value muted">{{ hovered ? `预览 ${hovered.formats.hex} · X ${hovered.x} / Y ${hovered.y}` : '点击或轻触图片选取颜色' }}</p>
        </template>
        <div v-else class="empty">选择一张图片，开始取色</div>
        <p id="picker-help" class="muted">按原图像素取色，坐标从 0 开始。聚焦图片后可用方向键微调，Shift + 方向键移动 10 像素。动图取加载时的一帧。</p>
      </section>
      <section class="box color-panel">
        <div class="box-head"><h2>选中颜色</h2><span v-if="selected" class="muted">X {{ selected.x }} / Y {{ selected.y }}</span></div>
        <template v-if="selected">
          <div class="swatch checker"><div :style="{ backgroundColor: selected.formats.rgb }" /></div>
          <p class="alpha muted">不透明度 {{ Math.round(selected.alpha * 1000) / 10 }}%</p>
          <div v-for="(value, format) in selected.formats" :key="format" class="color-value">
            <label :for="`picked-${format}`">{{ format.toUpperCase() }}<input :id="`picked-${format}`" :value="value" readonly spellcheck="false" /></label>
            <button @click="copy(value)">复制 {{ format.toUpperCase() }}</button>
          </div>
          <p class="muted">透明像素保留 Alpha；棋盘格仅用于预览，不参与取色。</p>
        </template>
        <div v-else class="empty">在左侧图片上点击，查看颜色值</div>
        <p class="feedback" role="status">{{ feedback }}</p>
        <template v-if="history.length">
          <div class="box-head"><h2>最近取色</h2><span class="muted">最多 12 色</span></div>
          <div class="palette"><button v-for="item in history" :key="item.formats.hex" class="checker" :aria-label="`选择颜色 ${item.formats.hex}`" :title="item.formats.hex" @click="choose(item)"><span :style="{ backgroundColor: item.formats.rgb }" /></button></div>
        </template>
      </section>
    </div>
  </DevTool>
</template>

<style scoped>
.upload { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding: 16px; margin-bottom: 20px; border: 1px dashed var(--accent-border); border-radius: 10px; background: var(--accent-bg); }
.upload label { flex: 1 1 230px; min-width: 0; }
.upload input { width: 100%; }
.upload p { flex: 1 1 200px; line-height: 1.8; }
.picker-layout { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 18px; align-items: start; }
.checker { background-color: #fff; background-image: conic-gradient(#ddd 25%, transparent 0 50%, #ddd 0 75%, transparent 0); background-size: 16px 16px; }
.image-stage { position: relative; width: fit-content; max-width: 100%; margin: 16px auto; }
canvas { display: block; max-width: 100%; height: auto; max-height: none; cursor: crosshair; }
canvas:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.marker { position: absolute; width: 13px; height: 13px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 0 1px #111; transform: translate(-50%, -50%); pointer-events: none; }
.file-name { overflow-wrap: anywhere; }
.hover-value { margin-bottom: 12px; min-height: 20px; }
.swatch { height: 104px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.swatch > div, .palette button > span { display: block; width: 100%; height: 100%; }
.alpha { margin: 10px 0 18px; }
.color-value { display: flex; align-items: end; gap: 8px; margin-bottom: 14px; }
.color-value label { flex: 1; min-width: 0; font-size: 12px; }
.color-value input { width: 100%; font-family: var(--mono); }
.color-value button { flex-shrink: 0; }
.palette { display: flex; flex-wrap: wrap; gap: 10px; }
.palette button { width: 36px; height: 36px; padding: 0; overflow: hidden; }
.empty { min-height: 170px; display: grid; place-items: center; text-align: center; color: var(--text); font-size: 13px; }
#picker-help { line-height: 1.8; }
@media (max-width: 1000px) { .picker-layout { grid-template-columns: minmax(0, 1fr); } }
</style>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DevTool from '@/components/DevTool.vue'
import { useLocalClipboard } from '@/composables/useLocalClipboard'
import { parseColor, colorFormats, contrastRatio } from '@/utils/color'
const input = ref('#7C3AED'),
  background = ref('#FFFFFF')
const { feedback, copy } = useLocalClipboard()
const result = computed(() => {
  try {
    const color = parseColor(input.value),
      bg = parseColor(background.value)
    return {
      formats: colorFormats(color),
      background: colorFormats(bg).rgb,
      ratio: contrastRatio(color, bg),
      error: '',
    }
  } catch (e) {
    return {
      formats: null,
      background: '',
      ratio: 0,
      error: (e as Error).message,
    }
  }
})
watch([input, background], () => (feedback.value = ''))
</script>
<template>
  <DevTool
    title="颜色转换与对比度"
    description="HEX、RGB、HSL 互转，预览文字与背景的对比度"
    ><div class="two-col">
      <label
        >前景颜色<input
          v-model="input"
          aria-label="前景颜色文本"
          placeholder="#7C3AED 或 rgb(124,58,237)" /><input
          type="color"
          :value="result.formats?.hex.slice(0, 7) ?? '#000000'"
          aria-label="选择前景颜色"
          @input="input = ($event.target as HTMLInputElement).value" /></label
      ><label
        >背景颜色<input
          v-model="background"
          aria-label="背景颜色文本"
          placeholder="#FFFFFF" /><input
          type="color"
          :value="background.match(/^#[\da-fA-F]{6}$/) ? background : '#ffffff'"
          aria-label="选择背景颜色"
          @input="background = ($event.target as HTMLInputElement).value"
      /></label>
    </div>
    <p v-if="result.error" class="error" role="alert">{{ result.error }}</p>
    <template v-if="result.formats"
      ><div class="color-preview-base">
        <div
          class="color-preview"
          :style="{ color: result.formats.rgb, background: result.background }"
        >
          <strong>VueBox 开发工具</strong
          ><span>The quick brown fox · 示例文字 0123456789</span>
        </div>
      </div>
      <div class="stack">
        <section v-for="(value, key) in result.formats" :key="key" class="box">
          <div class="box-head">
            <h2>{{ key.toUpperCase() }}</h2>
            <button @click="copy(value)">复制 {{ key.toUpperCase() }}</button>
          </div>
          <pre class="result">{{ value }}</pre>
        </section>
      </div>
      <p class="note">
        对比度 {{ result.ratio.toFixed(2) }} : 1 · 普通文本 AA（4.5）：{{
          result.ratio >= 4.5 ? '通过' : '未通过'
        }}
        · 大文本 AA（3）：{{ result.ratio >= 3 ? '通过' : '未通过' }} · 普通文本
        AAA（7）：{{
          result.ratio >= 7 ? '通过' : '未通过'
        }}。透明背景按白色底板合成后计算。
      </p></template
    >
    <p class="feedback" role="status">{{ feedback }}</p>
    <p class="muted">
      支持数字形式 RGB/HSL 和透明度百分比；不支持 CSS 命名颜色、CSS
      变量、lab/oklch。HEX 通道四舍五入为 8 位整数。
    </p></DevTool
  >
</template>
<style scoped>
.color-preview-base {
  background: white;
  margin: 20px 0;
  border-radius: 10px;
}
.color-preview {
  padding: 36px 20px;
  border: 1px solid var(--border);
  border-radius: 10px;
  display: grid;
  gap: 10px;
  background-image: none;
}
.color-preview strong {
  font-size: 26px;
}
.color-preview span {
  font-size: 14px;
}
input[type='color'] {
  width: 100%;
  height: 44px;
}
</style>

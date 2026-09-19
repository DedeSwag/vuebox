<script setup lang="ts">
import { computed, ref } from 'vue'
import { highlightJson } from '@/utils/json'
const props = defineProps<{
  modelValue: string
  label: string
  placeholder?: string
  invalid?: boolean
  wrapLines?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const textarea = ref<HTMLTextAreaElement>()
const backdrop = ref<HTMLPreElement>()
const html = computed(() => highlightJson(props.modelValue) + '\n')
function syncScroll() {
  if (textarea.value && backdrop.value) {
    backdrop.value.scrollTop = textarea.value.scrollTop
    backdrop.value.scrollLeft = textarea.value.scrollLeft
  }
}
function locate(offset: number) {
  const el = textarea.value
  if (!el) return
  el.focus()
  el.setSelectionRange(offset, Math.min(offset + 1, el.value.length))
  // 用同样的排版测量错误字符，软换行后仍能滚动到正确位置。
  if (backdrop.value) {
    const mirror = backdrop.value.cloneNode(false) as HTMLPreElement
    Object.assign(mirror.style, {
      visibility: 'hidden', height: 'auto', overflow: 'visible',
      width: `${el.clientWidth}px`, scrollbarGutter: 'auto',
    })
    mirror.textContent = el.value.slice(0, offset)
    const marker = document.createElement('span')
    marker.textContent = el.value[offset] || ' '
    mirror.append(marker, document.createTextNode(el.value.slice(offset + 1)))
    el.parentElement!.append(mirror)
    el.scrollTop = Math.max(0, marker.offsetTop - el.clientHeight / 2)
    el.scrollLeft = props.wrapLines ? 0 : Math.max(0, marker.offsetLeft - el.clientWidth / 2)
    mirror.remove()
  }
  syncScroll()
}
defineExpose({ locate })
</script>
<template>
  <div class="json-code-editor" :class="{ 'wrap-lines': wrapLines }">
    <pre ref="backdrop" aria-hidden="true" v-html="html" />
    <textarea
      ref="textarea"
      :value="modelValue"
      :aria-label="label"
      :aria-invalid="invalid"
      :placeholder="placeholder"
      spellcheck="false"
      autocomplete="off"
      autocapitalize="off"
      :wrap="wrapLines ? 'soft' : 'off'"
      @input="
        emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)
      "
      @scroll="syncScroll"
    />
  </div>
</template>
<style scoped>
.json-code-editor {
  position: relative;
  height: 480px;
  background: var(--code-bg);
}
pre,
textarea {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 18px;
  border: 0;
  width: 100%;
  height: 100%;
  font: 13px/22px var(--mono);
  letter-spacing: normal;
  tab-size: 4;
  white-space: pre;
  overflow: auto;
  scrollbar-gutter: stable;
  border-radius: 0;
}
pre {
  pointer-events: none;
  color: var(--text-h);
}
.wrap-lines pre,
.wrap-lines textarea {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-all;
}
textarea {
  resize: none;
  background: transparent;
  color: transparent;
  caret-color: var(--text-h);
  -webkit-text-fill-color: transparent;
}
textarea::placeholder {
  color: var(--text);
  -webkit-text-fill-color: var(--text);
}
textarea::selection {
  background: rgba(140, 110, 230, 0.28);
}
textarea:focus {
  outline: 2px solid var(--accent-border);
  outline-offset: -2px;
}
@media (max-width: 768px) {
  .json-code-editor {
    height: 340px;
  }
}
</style>

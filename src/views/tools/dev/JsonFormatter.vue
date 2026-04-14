<script setup lang="ts">
import { ref, computed } from 'vue'
import ToolWrapper from '@/components/ToolWrapper.vue'

const input = ref('')
const indentSize = ref(2)
const error = ref('')

const formatted = computed(() => {
  if (!input.value.trim()) {
    error.value = ''
    return ''
  }
  try {
    const parsed = JSON.parse(input.value)
    error.value = ''
    return JSON.stringify(parsed, null, indentSize.value)
  } catch (e: unknown) {
    error.value = (e as Error).message
    return ''
  }
})

function compress() {
  if (!input.value.trim()) return
  try {
    const parsed = JSON.parse(input.value)
    input.value = JSON.stringify(parsed)
    error.value = ''
  } catch (e: unknown) {
    error.value = (e as Error).message
  }
}

function format() {
  if (!input.value.trim()) return
  try {
    const parsed = JSON.parse(input.value)
    input.value = JSON.stringify(parsed, null, indentSize.value)
    error.value = ''
  } catch (e: unknown) {
    error.value = (e as Error).message
  }
}

function clear() {
  input.value = ''
  error.value = ''
}

async function copy() {
  if (formatted.value) {
    await navigator.clipboard.writeText(formatted.value)
  }
}
</script>

<template>
  <ToolWrapper title="JSON 格式化" description="JSON 数据格式化、压缩、校验">
    <div class="toolbar">
      <div class="toolbar-left">
        <label class="indent-label">
          缩进:
          <select v-model.number="indentSize" class="indent-select">
            <option :value="2">2 空格</option>
            <option :value="4">4 空格</option>
            <option :value="1">Tab</option>
          </select>
        </label>
      </div>
      <div class="toolbar-right">
        <button class="btn" @click="format">格式化</button>
        <button class="btn" @click="compress">压缩</button>
        <button class="btn" @click="copy">复制</button>
        <button class="btn btn-danger" @click="clear">清空</button>
      </div>
    </div>

    <div class="editor-area">
      <div class="editor-col">
        <label class="editor-label">输入</label>
        <textarea
          v-model="input"
          class="code-area"
          placeholder='请输入 JSON，例如：{"key": "value"}'
          rows="16"
          spellcheck="false"
        />
      </div>
      <div class="editor-col">
        <label class="editor-label">输出</label>
        <textarea
          :value="formatted"
          class="code-area"
          readonly
          rows="16"
          placeholder="格式化结果将显示在这里"
        />
      </div>
    </div>

    <p v-if="error" class="error-msg">❌ {{ error }}</p>
  </ToolWrapper>
</template>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}

.indent-label {
  font-size: 14px;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 6px;
}

.indent-select {
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text-h);
  font-size: 14px;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 6px 16px;
  font-size: 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: transparent;
  color: var(--text-h);
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  border-color: var(--accent-border);
  color: var(--accent);
  background: var(--accent-bg);
}

.btn-danger:hover {
  border-color: #f87171;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.editor-area {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 768px) {
  .editor-area {
    grid-template-columns: 1fr;
  }
}

.editor-col {
  display: flex;
  flex-direction: column;
}

.editor-label {
  font-size: 13px;
  color: var(--text);
  margin-bottom: 6px;
  font-weight: 500;
}

.code-area {
  width: 100%;
  padding: 12px;
  font-size: 14px;
  font-family: var(--mono);
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--code-bg);
  color: var(--text-h);
  resize: vertical;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
  line-height: 1.5;
}

.code-area:focus {
  border-color: var(--accent-border);
}

.error-msg {
  margin-top: 12px;
  padding: 10px 14px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #ef4444;
  font-size: 14px;
}
</style>

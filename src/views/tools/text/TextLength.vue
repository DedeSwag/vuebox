<script setup lang="ts">
import { ref, computed } from 'vue'
import ToolWrapper from '@/components/ToolWrapper.vue'

const text = ref('')

const stats = computed(() => {
  const val = text.value
  return {
    chars: val.length,
    charsNoSpace: val.replace(/\s/g, '').length,
    words: val.trim() ? val.trim().split(/\s+/).length : 0,
    lines: val ? val.split('\n').length : 0,
    bytes: new Blob([val]).size,
  }
})
</script>

<template>
  <ToolWrapper title="文本字数统计" description="统计文本的字符数、单词数、行数等信息">
    <textarea
      v-model="text"
      class="input-area"
      placeholder="请输入或粘贴文本..."
      rows="8"
    />
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-value">{{ stats.chars }}</span>
        <span class="stat-label">字符数</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ stats.charsNoSpace }}</span>
        <span class="stat-label">字符数 (不含空格)</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ stats.words }}</span>
        <span class="stat-label">单词数</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ stats.lines }}</span>
        <span class="stat-label">行数</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ stats.bytes }}</span>
        <span class="stat-label">字节数 (UTF-8)</span>
      </div>
    </div>
  </ToolWrapper>
</template>

<style scoped>
.input-area {
  width: 100%;
  padding: 14px;
  font-size: 15px;
  font-family: var(--sans);
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text-h);
  resize: vertical;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.input-area:focus {
  border-color: var(--accent-border);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--accent-bg);
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--accent);
  font-family: var(--mono);
}

.stat-label {
  font-size: 13px;
  color: var(--text);
  margin-top: 4px;
}
</style>

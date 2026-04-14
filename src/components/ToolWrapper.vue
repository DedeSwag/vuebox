<script setup lang="ts">
import { useRouter } from 'vue-router'

defineProps<{
  title: string
  description?: string
}>()

const router = useRouter()

function goBack() {
  router.push('/')
}
</script>

<template>
  <div class="tool-wrapper">
    <div class="tool-header">
      <button class="back-btn" @click="goBack" title="返回首页">
        ← 返回
      </button>
      <div>
        <h1 class="tool-title">{{ title }}</h1>
        <p v-if="description" class="tool-description">{{ description }}</p>
      </div>
    </div>
    <div class="tool-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.tool-wrapper {
  max-width: 960px;
  margin: 0 auto;
}

.tool-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 28px;
}

.back-btn {
  flex-shrink: 0;
  margin-top: 6px;
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: transparent;
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  border-color: var(--accent-border);
  color: var(--accent);
  background: var(--accent-bg);
}

.tool-title {
  font-size: 28px;
  margin: 0 0 4px;
  letter-spacing: -0.5px;
}

.tool-description {
  font-size: 15px;
  color: var(--text);
  margin: 0;
}

.tool-body {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
}
</style>

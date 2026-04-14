<script setup lang="ts">
import type { ToolMeta } from '@/types/tool'

defineProps<{
  tool: ToolMeta
}>()
</script>

<template>
  <router-link :to="tool.path" class="tool-card">
    <span class="tool-icon">{{ tool.icon }}</span>
    <div class="tool-info">
      <h3 class="tool-title">{{ tool.title }}</h3>
      <p class="tool-desc">{{ tool.description }}</p>
    </div>
  </router-link>
</template>

<style scoped>
.tool-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px 20px;
  border: 1px solid var(--border);
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: all 0.25s ease;
  cursor: pointer;
}

.tool-card:hover {
  border-color: var(--accent-border);
  background: var(--accent-bg);
  box-shadow: var(--shadow);
  transform: translateY(-2px);
}

.tool-icon {
  font-size: 28px;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-bg);
  border-radius: 10px;
}

.tool-info {
  flex: 1;
  min-width: 0;
}

.tool-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-h);
  margin: 0 0 4px;
}

.tool-desc {
  font-size: 13px;
  color: var(--text);
  margin: 0;
  line-height: 1.4;
}
</style>

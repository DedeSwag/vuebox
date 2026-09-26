<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { categories } from '@/config/categories'
import { tools } from '@/config/tools'
import { useToolSearch } from '@/composables/useToolSearch'
import ToolCard from '@/components/ToolCard.vue'

const { keyword, groupedTools, resultCount } = useToolSearch()
const route = useRoute()
const category = computed(() => categories.find(item => item.key === route.params.category))
const visibleGroups = computed(() => category.value ? groupedTools.value.filter(group => group.category.key === category.value?.key) : groupedTools.value)
const visibleCount = computed(() => category.value ? visibleGroups.value.reduce((sum, group) => sum + group.tools.length, 0) : resultCount.value)
</script>

<template>
  <div class="home">
    <!-- Hero -->
    <section class="hero">
      <h1 class="hero-title">{{ category ? `${category.icon} ${category.name}` : '在线工具箱' }}</h1>
      <p class="hero-subtitle">
        {{ category ? category.description : `${categories.length} 大分类，${tools.length} 个实用工具 · 全部在浏览器本地运行` }}
      </p>
    </section>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <input
        v-model="keyword"
        aria-label="搜索工具"
        type="text"
        placeholder="🔍 搜索工具..."
        class="search-input"
      />
      <span v-if="keyword" class="search-count">
        找到 {{ visibleCount }} 个工具
      </span>
    </div>

    <!-- 分类工具列表 -->
    <section
      v-for="group in visibleGroups"
      :key="group.category.key"
      class="category-section"
    >
      <h2 class="category-title">
        <span class="category-icon">{{ group.category.icon }}</span>
        <RouterLink :to="`/category/${group.category.key}`">{{ group.category.name }}</RouterLink>
      </h2>
      <div class="tool-grid">
        <ToolCard
          v-for="tool in group.tools"
          :key="tool.name"
          :tool="tool"
        />
      </div>
    </section>

    <!-- 空状态 -->
    <div v-if="visibleGroups.length === 0 && keyword" class="empty">
      <p>😅 没有找到匹配「{{ keyword }}」的工具</p>
    </div>
  </div>
</template>

<style scoped>
.home {
  max-width: 960px;
  margin: 0 auto;
}

.hero {
  text-align: center;
  padding: 40px 0 32px;
}

.hero-title {
  font-size: 48px;
  margin: 0 0 12px;
}

.hero-subtitle {
  font-size: 18px;
  color: var(--text);
}

.search-bar {
  position: relative;
  margin-bottom: 36px;
}

.search-input {
  width: 100%;
  padding: 14px 20px;
  font-size: 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg);
  color: var(--text-h);
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: var(--accent-border);
}

.search-count {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  color: var(--text);
}

.category-section {
  margin-bottom: 36px;
}

.category-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  margin: 0 0 16px;
}

.category-icon {
  font-size: 24px;
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: 16px;
}
.category-title a { color: var(--text-h); }
@media (max-width: 800px) {
  .hero { padding: 20px 0; }
  .hero-title { font-size: 30px; }
  .hero-subtitle { font-size: 14px; }
  .search-count { position: static; display: block; transform: none; margin-top: 6px; }
}

.empty {
  text-align: center;
  padding: 60px 0;
  font-size: 16px;
  color: var(--text);
}
</style>

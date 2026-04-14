<script setup lang="ts">
import { useToolSearch } from '@/composables/useToolSearch'
import ToolCard from '@/components/ToolCard.vue'

const { keyword, groupedTools, resultCount } = useToolSearch()
</script>

<template>
  <div class="home">
    <!-- Hero -->
    <section class="hero">
      <h1 class="hero-title">🧰 VueBox</h1>
      <p class="hero-subtitle">
        一个开源的 Web 工具箱，集合各种实用小工具
      </p>
    </section>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <input
        v-model="keyword"
        type="text"
        placeholder="🔍 搜索工具..."
        class="search-input"
      />
      <span v-if="keyword" class="search-count">
        找到 {{ resultCount }} 个工具
      </span>
    </div>

    <!-- 分类工具列表 -->
    <section
      v-for="group in groupedTools"
      :key="group.category.key"
      class="category-section"
    >
      <h2 class="category-title">
        <span class="category-icon">{{ group.category.icon }}</span>
        {{ group.category.name }}
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
    <div v-if="groupedTools.length === 0 && keyword" class="empty">
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
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.empty {
  text-align: center;
  padding: 60px 0;
  font-size: 16px;
  color: var(--text);
}
</style>

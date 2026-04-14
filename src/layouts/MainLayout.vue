<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

function goHome() {
  router.push('/')
}
</script>

<template>
  <div class="layout">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-inner">
        <div class="logo" @click="goHome">
          <span class="logo-icon">🧰</span>
          <span class="logo-text">VueBox</span>
        </div>
        <nav class="nav">
          <a
            class="nav-link"
            :class="{ active: route.path === '/' }"
            @click.prevent="goHome"
            href="/"
          >
            首页
          </a>
        </nav>
      </div>
    </header>

    <!-- 主内容区域 -->
    <main class="main">
      <router-view />
    </main>

    <!-- 底部 -->
    <footer class="footer">
      <p>VueBox · Web 工具箱 · 基于 Vue 3 + TypeScript + Vite</p>
    </footer>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(12px);
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.logo-icon {
  font-size: 28px;
}

.logo-text {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-h);
  letter-spacing: -0.5px;
}

.nav {
  display: flex;
  gap: 16px;
}

.nav-link {
  color: var(--text);
  text-decoration: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 15px;
  transition: all 0.2s;
  cursor: pointer;
}

.nav-link:hover,
.nav-link.active {
  color: var(--accent);
  background: var(--accent-bg);
}

.main {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 32px 24px;
  box-sizing: border-box;
}

.footer {
  border-top: 1px solid var(--border);
  padding: 20px 24px;
  text-align: center;
  font-size: 13px;
  color: var(--text);
}
</style>

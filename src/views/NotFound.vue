<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="not-found">
    <h1>404</h1>
    <p>页面未找到</p>
    <button @click="router.push('/')">返回首页</button>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
}

.not-found h1 {
  font-size: 80px;
  margin: 0;
  color: var(--accent);
}

.not-found p {
  font-size: 18px;
  color: var(--text);
  margin: 12px 0 24px;
}

.not-found button {
  padding: 10px 24px;
  font-size: 15px;
  border: 1px solid var(--accent-border);
  border-radius: 8px;
  background: var(--accent-bg);
  color: var(--accent);
  cursor: pointer;
  transition: all 0.2s;
}

.not-found button:hover {
  background: var(--accent);
  color: #fff;
}
</style>

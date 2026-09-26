<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { categories } from '@/config/categories'
import { tools } from '@/config/tools'
const route = useRoute()
const brandIcon = `${import.meta.env.BASE_URL}favicon.svg`
const menuOpen = ref(false)
const isHome = computed(() => route.name === 'home')
const currentTool = computed(() => tools.find(tool => tool.name === route.name))
const currentCategory = computed(() => categories.find(category => category.key === (currentTool.value?.category ?? route.params.category)))
const groups = categories.map(category => ({ category, tools: tools.filter(tool => tool.category === category.key) }))
watch(() => route.fullPath, () => { menuOpen.value = false })
</script>
<template>
  <div class="layout">
    <a class="skip-link" href="#main-content">跳转到内容</a>
    <header class="app-header"><RouterLink class="logo" to="/"><img class="brand-icon" :src="brandIcon" width="32" height="32" alt="" /> 工具箱 </RouterLink><RouterLink class="home-link" to="/">全部工具</RouterLink></header>
    <div class="app-workspace" :class="{ 'with-sidebar': !isHome }">
      <div v-if="!isHome" class="mobile-menu-bar"><button :aria-expanded="menuOpen" aria-controls="tool-menu" @click="menuOpen = !menuOpen">{{ menuOpen ? '收起工具菜单' : '☰ 切换工具' }}</button><span>{{ currentCategory?.name }}</span></div>
      <aside v-if="!isHome" id="tool-menu" class="sidebar" :class="{ 'is-open': menuOpen }" aria-label="工具菜单">
        <div class="sidebar-heading">全部工具 <span>{{ tools.length }}</span></div>
        <nav aria-label="分类工具导航"><ul class="category-list"><li v-for="group in groups" :key="group.category.key" class="menu-group">
          <RouterLink :to="`/category/${group.category.key}`" class="category-link" :class="{ 'category-current': currentCategory?.key === group.category.key }"><span aria-hidden="true">{{ group.category.icon }}</span>{{ group.category.name }}<span class="count">{{ group.tools.length }}</span></RouterLink>
          <ul class="tool-list"><li v-for="tool in group.tools" :key="tool.name"><RouterLink :to="tool.path" class="tool-link" :class="{ selected: currentTool?.name === tool.name }" :aria-current="currentTool?.name === tool.name ? 'page' : undefined"><span class="tool-dot" aria-hidden="true" />{{ tool.title }}</RouterLink></li></ul>
        </li></ul></nav>
      </aside>
      <main id="main-content" class="main" tabindex="-1">
        <nav v-if="!isHome" class="breadcrumbs" aria-label="面包屑导航"><ol><li><RouterLink to="/">首页</RouterLink></li><li v-if="currentCategory"><RouterLink v-if="currentTool" :to="`/category/${currentCategory.key}`">{{ currentCategory.name }}</RouterLink><span v-else aria-current="page">{{ currentCategory.name }}</span></li><li v-if="currentTool"><span aria-current="page">{{ currentTool.title }}</span></li></ol></nav>
        <RouterView v-slot="{ Component }"><component :is="Component" :key="route.name === 'category' ? String(route.params.category) : String(route.name)" /></RouterView>
      </main>
    </div>
    <footer class="footer">在线工具箱 · 所有工具均在浏览器本地运行</footer>
  </div>
</template>
<style scoped>
.layout { min-height: 100vh; display: flex; flex-direction: column; }
.app-header { position: sticky; top: 0; height: 64px; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 0 28px; border-bottom: 1px solid var(--border); background: var(--bg); }
.logo { display: flex; gap: 10px; align-items: center; color: var(--text-h); font-weight: 700; font-size: 21px; text-decoration: none; }
.brand-icon { display: block; width: 32px; height: 32px; flex-shrink: 0; }
.logo-caption { margin-left: 8px; padding-left: 18px; border-left: 1px solid var(--border); font-size: 12px; font-weight: 400; color: var(--text); }
.home-link { font-size: 13px; color: var(--text); }
.app-workspace { flex: 1; width: 100%; max-width: 1920px; margin: 0 auto; }
.with-sidebar { display: grid; grid-template-columns: 232px minmax(0, 1fr); align-items: start; }
.sidebar { position: sticky; top: 64px; height: calc(100dvh - 64px); overflow-y: auto; border-right: 1px solid var(--border); padding: 20px 14px; background: var(--social-bg); scrollbar-width: thin; }
.sidebar-heading { display: flex; justify-content: space-between; padding: 0 12px 16px; font-size: 12px; letter-spacing: 1px; }
.sidebar-heading span { color: var(--accent); }
ul { padding: 0; margin: 0; list-style: none; }
.menu-group + .menu-group { margin-top: 14px; }
.category-link { display: flex; align-items: center; gap: 8px; padding: 7px 10px; color: var(--text); font-size: 12px; font-weight: 600; text-decoration: none; border-radius: 6px; }
.category-link .count { margin-left: auto; font-size: 11px; font-weight: 400; }
.category-current { color: var(--text-h); }
.tool-list { border-left: 1px solid var(--border); margin: 4px 0 0 18px; padding-left: 8px; }
.tool-link { display: flex; align-items: center; gap: 8px; padding: 7px 9px; margin: 2px 0; border-radius: 6px; color: var(--text); font-size: 12px; line-height: 1.6; text-decoration: none; }
.tool-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--border); flex-shrink: 0; }
.tool-link:hover, .category-link:hover { background: var(--accent-bg); color: var(--accent); }
.tool-link.selected { background: var(--accent-bg); color: var(--accent); font-weight: 600; box-shadow: inset 3px 0 var(--accent); }
.selected .tool-dot { background: var(--accent); }
.main { min-width: 0; width: 100%; padding: 24px 30px 40px; }
.app-workspace:not(.with-sidebar) .main { max-width: 1200px; margin: 0 auto; }
.breadcrumbs { margin: 0 0 22px; font-size: 12px; }
.breadcrumbs ol { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 0; margin: 0; list-style: none; }
.breadcrumbs li { display: flex; align-items: center; gap: 8px; }
.breadcrumbs li + li::before { content: '/'; color: var(--border); }
.breadcrumbs a { color: var(--text); }
.breadcrumbs [aria-current=page] { color: var(--text-h); }
.footer { border-top: 1px solid var(--border); padding: 18px; text-align: center; font-size: 12px; }
.mobile-menu-bar { display: none; }
.skip-link { position: fixed; left: 12px; top: -100px; z-index: 300; padding: 10px; background: var(--bg); }
.skip-link:focus { top: 8px; }
a:focus-visible, button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
@media (max-width: 800px) {
  .app-header { height: 56px; padding: 0 16px; }
  .logo-caption { display: none; }
  .with-sidebar { display: block; }
  .main { padding: 18px 14px 28px; }
  .mobile-menu-bar { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--border); font-size: 12px; }
  .mobile-menu-bar button { font: inherit; background: var(--accent-bg); color: var(--accent); border: 1px solid var(--accent-border); padding: 7px 12px; border-radius: 6px; cursor: pointer; }
  .sidebar { display: none; position: static; height: auto; max-height: 60dvh; border-right: 0; border-bottom: 1px solid var(--border); }
  .sidebar.is-open { display: block; }
  .breadcrumbs { margin-bottom: 18px; }
}
</style>

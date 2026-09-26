import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { tools } from '@/config/tools'
import { categories } from '@/config/categories'
import MainLayout from '@/layouts/MainLayout.vue'

const toRoute = (tool: (typeof tools)[number]): RouteRecordRaw => ({
  path: tool.path, name: tool.name, component: tool.component,
  meta: { title: tool.title, description: tool.description, category: tool.category, icon: tool.icon },
})

const routes: RouteRecordRaw[] = [
  ...tools.filter(tool => tool.standalone).map(toRoute),
  { path: '/dev/url-toolkit', redirect: { name: 'url-codec' } },
  { path: '/dev/encoding-toolkit', redirect: to => {
    const destinations: Record<string, string> = { base64: 'base64-codec', uuid: 'uuid-generator', url: 'url-codec' }
    const destination = destinations[String(to.query.tab)]
    return destination ? { name: destination } : to.query.tab === 'escape' ? { path: '/dev/text-escape' } : { name: 'url-codec' }
  } },
  { path: '/other/hotpot-calculator', redirect: '/zfg' },
  {
    path: '/', component: MainLayout,
    children: [
      { path: '', name: 'home', component: () => import('@/views/HomePage.vue'), meta: { title: '在线工具箱' } },
      { path: `category/:category(${categories.map(category => category.key).join('|')})`, name: 'category', component: () => import('@/views/HomePage.vue') },
      ...tools.filter(tool => !tool.standalone).map(toRoute),
    ],
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFound.vue'), meta: { title: '404 - 页面未找到' } },
]
const router = createRouter({ history: createWebHistory(import.meta.env.BASE_URL), routes, scrollBehavior: () => ({ top: 0 }) })
// 兼容原时间工具箱的子工具链接。
router.beforeEach(to => {
  if (to.name !== 'timestamp-converter' || !to.query.tab) return
  const destinations: Record<string, string> = { cron: 'cron-generator', timezone: 'timezone-converter', clock: 'world-clock', timestamp: 'timestamp-converter' }
  const destination = destinations[String(to.query.tab)]
  const { tab: _tab, ...query } = to.query
  return { name: destination ?? 'timestamp-converter', query, hash: to.hash, replace: true }
})
router.afterEach(to => {
  const category = categories.find(category => category.key === to.params.category)
  document.title = category?.name ?? (to.meta.title as string) ?? 'VueBox'
})
export default router

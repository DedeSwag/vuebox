import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { tools } from '@/config/tools'
import MainLayout from '@/layouts/MainLayout.vue'

/** 从工具注册表自动生成工具路由 */
const layoutTools = tools.filter((t) => !t.standalone)
const standaloneTools = tools.filter((t) => t.standalone)

const toRoute = (tool: (typeof tools)[number]): RouteRecordRaw => ({
  path: tool.path,
  name: tool.name,
  component: tool.component,
  meta: {
    title: tool.title,
    description: tool.description,
    category: tool.category,
    icon: tool.icon,
  },
})

const routes: RouteRecordRaw[] = [
  // 独立页面（不带 MainLayout）
  ...standaloneTools.map(toRoute),
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/views/HomePage.vue'),
        meta: { title: 'VueBox - Web 工具箱' },
      },
      ...layoutTools.map(toRoute),
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFound.vue'),
    meta: { title: '404 - 页面未找到' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

/** 动态修改页面标题 */
router.afterEach((to) => {
  document.title = (to.meta.title as string) || 'VueBox'
})

export default router

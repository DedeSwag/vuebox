import type { ToolMeta } from '@/types/tool'

/**
 * 工具注册表
 *
 * ✅ 添加新工具只需在此数组中追加一条记录：
 *   1. 在 src/views/tools/<category>/ 下创建工具组件
 *   2. 在此处添加工具元信息，component 使用 () => import('...') 懒加载
 *   3. 路由和首页展示会自动生成，无需手动修改其他文件
 */
export const tools: ToolMeta[] = [
  // ── 文本处理 ─────────────────────────────────────────
  {
    name: 'text-length',
    title: '文本字数统计',
    description: '统计文本的字符数、单词数、行数等信息',
    category: 'text',
    icon: '🔢',
    keywords: ['字数', '统计', '长度', 'count', 'length'],
    path: '/text/length',
    component: () => import('@/views/tools/text/TextLength.vue'),
  },

  // ── 开发工具 ─────────────────────────────────────────
  {
    name: 'json-formatter',
    title: 'JSON 格式化',
    description: 'JSON 数据格式化、压缩、校验',
    category: 'dev',
    icon: '{ }',
    keywords: ['json', '格式化', '压缩', '校验'],
    path: '/dev/json-formatter',
    component: () => import('@/views/tools/dev/JsonFormatter.vue'),
  },

  // ── 行程安排 ─────────────────────────────────────────
  {
    name: 'trip-schedule-2026',
    title: '2026五一行程安排',
    description: '2026年五一假期行程规划，含地图路线与每日详细安排',
    category: 'schedule',
    icon: '🗓️',
    keywords: ['行程', '五一', '旅行', '安排', 'schedule', 'trip'],
    path: '/schedule/trip-2026',
    component: () => import('@/views/tools/schedule/TripSchedule.vue'),
    standalone: true,
  },

  // ── 其他工具 ─────────────────────────────────────────
  {
    name: 'hotpot-calculator',
    title: '朱富贵火锅菜价计算器',
    description: '火锅账单计算，支持人数、折扣、多种菜品盘价',
    category: 'other',
    icon: '🍲',
    keywords: ['火锅', '计算', '菜价', '账单', '朱富贵'],
    path: '/other/hotpot-calculator',
    component: () => import('@/views/tools/other/HotpotCalculator.vue'),
    standalone: true,
  },
]

import { ref, computed } from 'vue'
import { tools } from '@/config/tools'
import { categories } from '@/config/categories'
import type { ToolMeta } from '@/types/tool'

/**
 * 工具搜索 composable
 * 支持按标题、描述、关键词模糊搜索
 */
export function useToolSearch() {
  const keyword = ref('')

  /** 按分类分组的工具列表 */
  const groupedTools = computed(() => {
    const filtered = filterTools(keyword.value)
    const map = new Map<string, ToolMeta[]>()

    for (const tool of filtered) {
      const list = map.get(tool.category) || []
      list.push(tool)
      map.set(tool.category, list)
    }

    return categories
      .filter((c) => map.has(c.key))
      .map((c) => ({
        category: c,
        tools: map.get(c.key)!,
      }))
  })

  /** 搜索结果总数 */
  const resultCount = computed(() =>
    groupedTools.value.reduce((sum, g) => sum + g.tools.length, 0),
  )

  return { keyword, groupedTools, resultCount }
}

function filterTools(keyword: string): ToolMeta[] {
  if (!keyword.trim()) return tools
  const kw = keyword.toLowerCase().trim()
  return tools.filter(
    (t) =>
      t.title.toLowerCase().includes(kw) ||
      t.description.toLowerCase().includes(kw) ||
      t.keywords?.some((k) => k.toLowerCase().includes(kw)),
  )
}

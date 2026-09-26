import type { ToolCategory } from '@/types/tool'

export const categories: ToolCategory[] = [
  { key: 'encoding', name: '编码 / 格式化', icon: '⌘', description: '常用数据编码、解码与格式化' },
  { key: 'dev', name: '开发辅助', icon: '⚙', description: '转换、生成和日常开发调试工具' },
  { key: 'text', name: '文本处理', icon: '📝', description: '文本对比、统计与正则匹配' },
  { key: 'image', name: '图片', icon: '🖼️', description: '本地图片预览与颜色提取' },
  { key: 'data', name: '数据处理', icon: '▦', description: '表格数据转换与结构化处理' },
  { key: 'encrypt', name: '加密 / 哈希', icon: '🔐', description: '文本与文件摘要计算及校验' },
  { key: 'life', name: '生活工具', icon: '☀', description: '世界时钟与日常生活实用工具' },
]

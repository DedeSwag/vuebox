import type { ToolCategory } from '@/types/tool'

/**
 * 工具分类配置
 * 新增分类只需在此数组中添加即可
 */
export const categories: ToolCategory[] = [
  {
    key: 'text',
    name: '文本处理',
    icon: '📝',
    description: '文本格式化、编解码、比较等工具',
  },
  {
    key: 'image',
    name: '图片工具',
    icon: '🖼️',
    description: '图片压缩、转换、裁剪等工具',
  },
  {
    key: 'dev',
    name: '开发工具',
    icon: '💻',
    description: 'JSON 格式化、正则测试、代码转换等',
  },
  {
    key: 'encrypt',
    name: '加密解密',
    icon: '🔐',
    description: 'MD5、Base64、AES 等加密解密工具',
  },
  {
    key: 'convert',
    name: '转换工具',
    icon: '🔄',
    description: '进制转换、单位换算、颜色转换等',
  },
  {
    key: 'generate',
    name: '生成工具',
    icon: '🎲',
    description: 'UUID、密码、二维码等生成工具',
  },
  {
    key: 'schedule',
    name: '行程安排',
    icon: '🗓️',
    description: '旅行行程规划与可视化展示',
  },
  {
    key: 'other',
    name: '其他工具',
    icon: '🧩',
    description: '未归类的实用小工具',
  },
]

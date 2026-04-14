/** 工具分类定义 */
export interface ToolCategory {
  /** 分类唯一标识 */
  key: string
  /** 分类显示名称 */
  name: string
  /** 分类图标 (emoji 或 icon class) */
  icon: string
  /** 分类描述 */
  description?: string
}

/** 单个工具的路由/元信息定义 */
export interface ToolMeta {
  /** 工具路由 name（唯一） */
  name: string
  /** 工具显示名称 */
  title: string
  /** 工具描述 */
  description: string
  /** 所属分类 key */
  category: string
  /** 工具图标 (emoji 或 icon class) */
  icon: string
  /** 关键词，用于搜索 */
  keywords?: string[]
  /** 路由路径 */
  path: string
  /** 对应组件 (懒加载) */
  component: () => Promise<unknown>
  /** 是否独立页面（不使用 MainLayout） */
  standalone?: boolean
}

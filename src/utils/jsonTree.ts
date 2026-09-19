import type { Node } from 'jsonc-parser'

export interface JsonTreeRow {
  id: string
  node: Node
  depth: number
  name?: string
  closing: boolean
  open: boolean
}

export function isContainer(node: Node): boolean {
  return node.type === 'object' || node.type === 'array'
}

/** 扁平化只保留节点引用；长字符串仅在可见行中截取，不创建递归组件。 */
export function flattenJsonTree(
  root: Node,
  defaultOpen: boolean,
  overrides: ReadonlySet<number>,
): JsonTreeRow[] {
  const rows: JsonTreeRow[] = []
  function visit(node: Node, depth: number, name?: string) {
    const open =
      isContainer(node) &&
      (overrides.has(node.offset) ? !defaultOpen : defaultOpen)
    rows.push({
      id: `${node.offset}:value`,
      node,
      depth,
      name,
      closing: false,
      open,
    })
    if (!open) return
    for (const [index, child] of (node.children ?? []).entries()) {
      if (child.type === 'property')
        visit(child.children![1]!, depth + 1, String(child.children![0]!.value))
      else visit(child, depth + 1, String(index))
    }
    rows.push({
      id: `${node.offset}:close`,
      node,
      depth,
      closing: true,
      open: false,
    })
  }
  visit(root, 0)
  return rows
}

export const TREE_ROW_HEIGHT = 28
export const TREE_OVERSCAN = 6
export function treeWindow(length: number, scrollTop: number, height: number) {
  const start = Math.max(
    0,
    Math.min(
      length - 1,
      Math.floor(scrollTop / TREE_ROW_HEIGHT) - TREE_OVERSCAN,
    ),
  )
  const end = Math.min(
    length,
    start + Math.ceil(height / TREE_ROW_HEIGHT) + TREE_OVERSCAN * 2,
  )
  return {
    start,
    end,
    offset: start * TREE_ROW_HEIGHT,
    totalHeight: length * TREE_ROW_HEIGHT,
  }
}

export function treeLiteral(row: JsonTreeRow, source: string): string {
  const { node } = row
  const preview = source.slice(
    node.offset,
    node.offset + Math.min(node.length, 240),
  )
  return node.length > 240 ? `${preview}…` : preview
}

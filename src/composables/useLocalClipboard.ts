import { ref } from 'vue'
export function useLocalClipboard() {
  const feedback = ref('')
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      feedback.value = '已复制到剪贴板'
    } catch {
      feedback.value = '复制失败，请选中结果手动复制。'
    }
  }
  return { feedback, copy }
}

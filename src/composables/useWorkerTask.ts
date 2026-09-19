import { onBeforeUnmount, ref, shallowRef } from 'vue'
export function useWorkerTask<Request, Result>(
  factory: () => Worker,
  timeout = 3500,
) {
  const result = shallowRef<Result | null>(null)
  const busy = ref(false)
  const error = ref('')
  let worker: Worker | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let generation = 0
  function cancel() {
    generation++
    worker?.terminate()
    worker = undefined
    clearTimeout(timer)
    busy.value = false
  }
  function reset() {
    cancel()
    result.value = null
    error.value = ''
  }
  function run(request: Request) {
    reset()
    busy.value = true
    const id = generation
    const fail = (message: string) => {
      if (id !== generation) return
      error.value = message
      cancel()
    }
    try {
      worker = factory()
      worker.onmessage = (
        event: MessageEvent<{ result?: Result; error?: string }>,
      ) => {
        if (id !== generation) return
        if (event.data.error) error.value = event.data.error
        else result.value = event.data.result ?? null
        cancel()
      }
      worker.onerror = () => fail('计算失败，请检查输入后重试。')
      timer = setTimeout(
        () => fail('计算超时，已停止。请缩短输入或简化规则后重试。'),
        timeout,
      )
      worker.postMessage(request)
    } catch {
      fail('无法启动本地计算，请使用支持 Web Worker 的现代浏览器。')
    }
  }
  onBeforeUnmount(cancel)
  return { result, busy, error, run, reset }
}

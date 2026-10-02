import { shallowRef, watch, type WatchSource } from 'vue'

/** Inputs invalidate old results synchronously; only an explicit action computes a new result. */
export function useManualResult<T>(sources: WatchSource[], compute: () => T, empty: () => NoInfer<T>) {
  const result = shallowRef<T>(empty())
  function reset() { result.value = empty() }
  function execute() { result.value = compute() }
  watch(sources, reset, { flush: 'sync' })
  return { result, execute, reset }
}

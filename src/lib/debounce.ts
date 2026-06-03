export type Debouncer = {
  schedule: () => void
  cancel: () => void
  flush: () => void
}

export function createDebouncer(callback: () => void, delayMs: number): Debouncer {
  let timer: ReturnType<typeof setTimeout> | undefined

  return {
    schedule() {
      if (timer !== undefined) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = undefined
        callback()
      }, delayMs)
    },
    cancel() {
      if (timer !== undefined) {
        clearTimeout(timer)
        timer = undefined
      }
    },
    flush() {
      if (timer === undefined) return
      clearTimeout(timer)
      timer = undefined
      callback()
    },
  }
}

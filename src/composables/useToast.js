import { reactive } from 'vue'

const toasts = reactive([])
let seq = 0

export function useToast() {
  function dismiss(id) {
    const i = toasts.findIndex((t) => t.id === id)
    if (i >= 0) toasts.splice(i, 1)
  }
  function push(message, type = 'info', timeout = 4000) {
    seq += 1
    const id = seq
    toasts.push({ id, message, type })
    if (timeout > 0) setTimeout(() => dismiss(id), timeout)
    return id
  }
  return {
    toasts,
    dismiss,
    success: (m, t) => push(m, 'success', t),
    error: (m, t = 7000) => push(m, 'error', t),
    warning: (m, t = 6000) => push(m, 'warning', t),
    info: (m, t) => push(m, 'info', t),
  }
}


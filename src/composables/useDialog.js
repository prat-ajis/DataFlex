import { reactive } from 'vue'

/** Dialog konfirmasi global (dirender oleh ConfirmDialog.vue di App.vue). */
const dialog = reactive({
  open: false,
  title: '',
  message: '',
  details: [],
  confirmText: 'Lanjutkan',
  cancelText: 'Batal',
  tone: 'primary', // primary | danger | warning
  resolve: null,
})

function close(result) {
  const resolve = dialog.resolve
  dialog.open = false
  dialog.resolve = null
  if (resolve) resolve(result)
}

export function useDialog() {
  function confirm({ title, message = '', details = [], confirmText = 'Lanjutkan', cancelText = 'Batal', tone = 'primary' }) {
    if (dialog.resolve) dialog.resolve(false)
    Object.assign(dialog, { open: true, title, message, details, confirmText, cancelText, tone })
    return new Promise((resolve) => {
      dialog.resolve = resolve
    })
  }
  return { dialog, confirm, close }
}


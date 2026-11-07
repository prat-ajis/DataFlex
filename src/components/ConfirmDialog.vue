<script setup>
import { computed, watch } from 'vue'
import { CircleAlert, Info, TriangleAlert } from '@lucide/vue'
import { useDialog } from '@/composables/useDialog.js'

const { dialog, close } = useDialog()

const toneConfig = computed(() => {
  switch (dialog.tone) {
    case 'danger':
      return { icon: CircleAlert, iconClass: 'bg-rose-100 text-rose-600', btn: 'btn-danger' }
    case 'warning':
      return { icon: TriangleAlert, iconClass: 'bg-amber-100 text-amber-600', btn: 'btn-primary' }
    default:
      return { icon: Info, iconClass: 'bg-brand-100 text-brand-600', btn: 'btn-primary' }
  }
})

function onKey(e) {
  if (e.key === 'Escape') close(false)
}
watch(
  () => dialog.open,
  (open) => {
    if (open) window.addEventListener('keydown', onKey)
    else window.removeEventListener('keydown', onKey)
  },
)
</script>

<template>
  <Transition name="fade">
    <div v-if="dialog.open" class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" @click.self="close(false)">
      <div class="card w-full max-w-md p-6" role="alertdialog" aria-modal="true" :aria-label="dialog.title">
        <div class="flex gap-4">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" :class="toneConfig.iconClass">
            <component :is="toneConfig.icon" class="h-5 w-5" />
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="text-base font-semibold text-slate-900">{{ dialog.title }}</h3>
            <p v-if="dialog.message" class="mt-1 text-sm whitespace-pre-line text-slate-600">{{ dialog.message }}</p>
            <ul
              v-if="dialog.details?.length"
              class="mt-3 max-h-40 list-inside list-disc overflow-y-auto rounded-lg bg-slate-50 p-3 text-sm text-slate-700"
            >
              <li v-for="(d, i) in dialog.details" :key="i" class="truncate">{{ d }}</li>
            </ul>
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <button class="btn btn-secondary" @click="close(false)">{{ dialog.cancelText }}</button>
          <button class="btn" :class="toneConfig.btn" @click="close(true)">{{ dialog.confirmText }}</button>
        </div>
      </div>
    </div>
  </Transition>
</template>


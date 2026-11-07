<script setup>
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from '@lucide/vue'
import { useToast } from '@/composables/useToast.js'

const { toasts, dismiss } = useToast()
const styles = {
  success: { icon: CircleCheck, cls: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  error: { icon: CircleAlert, cls: 'border-rose-200 bg-rose-50 text-rose-800' },
  warning: { icon: TriangleAlert, cls: 'border-amber-200 bg-amber-50 text-amber-800' },
  info: { icon: Info, cls: 'border-slate-200 bg-white text-slate-700' },
}
</script>

<template>
  <div class="pointer-events-none fixed right-4 bottom-4 z-[70] flex w-full max-w-sm flex-col gap-2" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto flex items-start gap-3 rounded-lg border p-3 text-sm shadow-lg"
        :class="styles[t.type].cls"
      >
        <component :is="styles[t.type].icon" class="mt-0.5 h-4 w-4 shrink-0" />
        <span class="flex-1">{{ t.message }}</span>
        <button class="opacity-60 hover:opacity-100" aria-label="Tutup" @click="dismiss(t.id)"><X class="h-4 w-4" /></button>
      </div>
    </TransitionGroup>
  </div>
</template>


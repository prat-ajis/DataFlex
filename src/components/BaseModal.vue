<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { X } from '@lucide/vue'

defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  size: { type: String, default: 'md' }, // md | lg | xl
})
const emit = defineEmits(['close'])

function onKey(e) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" @click.self="emit('close')">
    <div
      class="card flex max-h-[90vh] w-full flex-col"
      :class="{ 'max-w-md': size === 'md', 'max-w-2xl': size === 'lg', 'max-w-4xl': size === 'xl' }"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
    >
      <div class="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
        <div>
          <h3 class="text-base font-semibold text-slate-900">{{ title }}</h3>
          <p v-if="description" class="mt-0.5 text-sm text-slate-500">{{ description }}</p>
        </div>
        <button class="btn-icon -mr-2" aria-label="Tutup" @click="emit('close')"><X class="h-4 w-4" /></button>
      </div>
      <div class="flex-1 overflow-y-auto px-6 py-5">
        <slot />
      </div>
      <div v-if="$slots.footer" class="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>


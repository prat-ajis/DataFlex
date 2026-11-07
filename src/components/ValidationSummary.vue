<script setup>
import { CircleAlert, CircleCheck, TriangleAlert } from '@lucide/vue'

defineProps({
  errors: { type: Array, default: () => [] },
  warnings: { type: Array, default: () => [] },
  showSuccess: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
})
</script>

<template>
  <div class="space-y-2">
    <div
      v-if="errors.length"
      class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
      role="alert"
    >
      <div class="flex items-center gap-2 font-semibold">
        <CircleAlert class="h-4 w-4" /> {{ errors.length }} kesalahan harus diperbaiki sebelum ekspor
      </div>
      <ul class="mt-1.5 ml-6 list-disc space-y-0.5">
        <li v-for="(e, i) in errors" :key="i">{{ e }}</li>
      </ul>
    </div>
    <div v-if="warnings.length" class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      <div class="flex items-center gap-2 font-semibold"><TriangleAlert class="h-4 w-4" /> {{ warnings.length }} peringatan</div>
      <ul class="mt-1.5 ml-6 list-disc space-y-0.5" :class="{ 'max-h-28 overflow-y-auto': compact }">
        <li v-for="(w, i) in warnings" :key="i">{{ w }}</li>
      </ul>
    </div>
    <div
      v-if="showSuccess && !errors.length && !warnings.length"
      class="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
    >
      <CircleCheck class="h-4 w-4" /> Validasi lolos. Konfigurasi siap diekspor.
    </div>
  </div>
</template>


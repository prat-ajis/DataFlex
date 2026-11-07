<script setup>
import { EyeOff, Sheet } from '@lucide/vue'
import { formatNumber } from '@/services/utils.js'

defineProps({
  sheets: { type: Array, required: true },
  modelValue: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Pilih sheet">
    <button
      v-for="s in sheets"
      :key="s.name"
      type="button"
      role="radio"
      :aria-checked="s.name === modelValue"
      :disabled="disabled || s.empty"
      class="flex items-center gap-3 rounded-lg border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50"
      :class="
        s.name === modelValue
          ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      "
      @click="emit('update:modelValue', s.name)"
    >
      <Sheet class="h-5 w-5 shrink-0" :class="s.name === modelValue ? 'text-brand-600' : 'text-slate-400'" />
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1.5 truncate text-sm font-medium text-slate-800" :title="s.name">
          {{ s.name }}
          <EyeOff v-if="s.hidden" class="h-3.5 w-3.5 text-slate-400" title="Sheet tersembunyi" />
        </div>
        <div class="text-xs text-slate-500">
          <template v-if="s.empty">Sheet kosong</template>
          <template v-else>± {{ formatNumber(s.rows) }} baris · {{ formatNumber(s.cols) }} kolom</template>
        </div>
      </div>
    </button>
  </div>
</template>


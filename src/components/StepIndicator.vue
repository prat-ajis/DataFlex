<script setup>
import { Check } from '@lucide/vue'

defineProps({
  steps: { type: Array, required: true },
  current: { type: Number, required: true },
  isEnabled: { type: Function, required: true },
})
const emit = defineEmits(['select'])
</script>

<template>
  <nav aria-label="Langkah konversi" class="overflow-x-auto">
    <ol class="flex min-w-max items-center gap-1">
      <li v-for="(s, i) in steps" :key="s.id" class="flex items-center">
        <button
          class="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition disabled:cursor-not-allowed"
          :class="[
            s.id === current ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-600',
            isEnabled(s.id) && s.id !== current ? 'hover:bg-slate-100' : '',
            !isEnabled(s.id) ? 'opacity-50' : '',
          ]"
          :disabled="!isEnabled(s.id)"
          :aria-current="s.id === current ? 'step' : undefined"
          @click="emit('select', s.id)"
        >
          <span
            class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold"
            :class="
              s.id < current
                ? 'bg-brand-600 text-white'
                : s.id === current
                  ? 'border-2 border-brand-600 text-brand-700'
                  : 'border border-slate-300 text-slate-500'
            "
          >
            <Check v-if="s.id < current" class="h-3.5 w-3.5" />
            <template v-else>{{ s.id }}</template>
          </span>
          {{ s.label }}
        </button>
        <span v-if="i < steps.length - 1" class="mx-1 h-px w-6 bg-slate-300" />
      </li>
    </ol>
  </nav>
</template>


<script setup>
import { computed, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { formatNumber } from '@/services/utils.js'

/**
 * Tabel preview dengan pagination. Hanya halaman aktif yang dirender
 * sehingga tetap responsif untuk data berukuran besar.
 */
const props = defineProps({
  headers: { type: Array, required: true }, // string[]
  rows: { type: Array, required: true }, // string[][]
  pageSize: { type: Number, default: 50 },
  rowNumberStart: { type: Number, default: 1 },
  rowNumberLabel: { type: String, default: '#' },
  maxHeight: { type: String, default: '28rem' },
  emptyText: { type: String, default: 'Tidak ada baris untuk ditampilkan.' },
  highlightColumns: { type: Array, default: () => [] },
})

const page = ref(1)
const size = ref(props.pageSize)
const totalPages = computed(() => Math.max(1, Math.ceil(props.rows.length / size.value)))
const start = computed(() => (page.value - 1) * size.value)
const pageRows = computed(() => props.rows.slice(start.value, start.value + size.value))

watch(
  () => [props.rows, size.value],
  () => {
    if (page.value > totalPages.value) page.value = totalPages.value
  },
)

function go(p) {
  page.value = Math.min(Math.max(1, p), totalPages.value)
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-slate-200">
    <div class="overflow-auto" :style="{ maxHeight }">
      <table class="data-table min-w-full border-collapse text-sm">
        <thead class="sticky top-0 z-10 bg-slate-100">
          <tr>
            <th class="border-b border-slate-200 px-3 py-2 text-right text-xs font-semibold text-slate-400">{{ rowNumberLabel }}</th>
            <th
              v-for="(h, i) in headers"
              :key="i"
              class="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-700"
              :class="{ 'bg-brand-50 text-brand-700': highlightColumns.includes(i) }"
              :title="h"
            >
              {{ h }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0">
            <td :colspan="headers.length + 1" class="px-3 py-8 text-center text-sm text-slate-500">{{ emptyText }}</td>
          </tr>
          <tr v-for="(row, r) in pageRows" :key="start + r" class="odd:bg-white even:bg-slate-50/60 hover:bg-brand-50/40">
            <td class="border-b border-slate-100 px-3 py-1.5 text-right font-mono text-xs text-slate-400">
              {{ rowNumberStart + start + r }}
            </td>
            <td
              v-for="(h, c) in headers"
              :key="c"
              class="border-b border-slate-100 px-3 py-1.5 text-slate-700"
              :title="row[c]"
            >
              <span v-if="row[c] === '' || row[c] == null" class="text-slate-300">—</span>
              <template v-else>{{ row[c] }}</template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div
      v-if="rows.length > 0"
      class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2 text-xs text-slate-500"
    >
      <span>
        Baris {{ formatNumber(start + 1) }}–{{ formatNumber(Math.min(start + size, rows.length)) }} dari
        {{ formatNumber(rows.length) }}
      </span>
      <div class="flex items-center gap-2">
        <select v-model.number="size" class="input input-sm w-auto py-1 text-xs" aria-label="Baris per halaman">
          <option :value="25">25 / hal</option>
          <option :value="50">50 / hal</option>
          <option :value="100">100 / hal</option>
          <option :value="250">250 / hal</option>
        </select>
        <button class="btn-icon h-7 w-7" :disabled="page <= 1" aria-label="Halaman sebelumnya" @click="go(page - 1)">
          <ChevronLeft class="h-4 w-4" />
        </button>
        <span class="whitespace-nowrap">
          <input
            type="number"
            class="input input-sm inline-block w-14 py-1 text-center text-xs"
            :value="page"
            min="1"
            :max="totalPages"
            aria-label="Nomor halaman"
            @change="go(Number($event.target.value) || 1)"
          />
          / {{ formatNumber(totalPages) }}
        </span>
        <button class="btn-icon h-7 w-7" :disabled="page >= totalPages" aria-label="Halaman berikutnya" @click="go(page + 1)">
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>


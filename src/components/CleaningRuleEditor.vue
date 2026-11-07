<script setup>
import { computed } from 'vue'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Eraser, Plus, Trash2 } from '@lucide/vue'
import DataPreviewTable from '@/components/DataPreviewTable.vue'
import { useConverterSession } from '@/composables/useConverterSession.js'
import { CLEANING_OPERATIONS, createRule } from '@/services/transformService.js'
import { formatNumber } from '@/services/utils.js'

const emit = defineEmits(['next', 'back'])
const { state, result } = useConverterSession()

const operations = Object.entries(CLEANING_OPERATIONS).map(([key, def]) => ({ key, ...def }))
const activeColumns = computed(() => state.columns.filter((c) => c.enabled))
const activeIds = computed(() => new Set(activeColumns.value.map((c) => c.id)))

function addRule(op) {
  state.rules.push(createRule(op))
}

function move(index, delta) {
  const to = index + delta
  if (to < 0 || to >= state.rules.length) return
  const [item] = state.rules.splice(index, 1)
  state.rules.splice(to, 0, item)
}

function remove(index) {
  state.rules.splice(index, 1)
}

function isAll(rule) {
  return !rule.columns || rule.columns.length === 0
}

function toggleAll(rule, checked) {
  rule.columns = checked ? [] : activeColumns.value.slice(0, 1).map((c) => c.id)
}

function toggleColumn(rule, id, checked) {
  const set = new Set(rule.columns.filter((x) => activeIds.value.has(x)))
  if (checked) set.add(id)
  else set.delete(id)
  // Pertahankan urutan sesuai urutan kolom keluaran.
  rule.columns = activeColumns.value.map((c) => c.id).filter((x) => set.has(x))
}

function resultText(rule) {
  if (rule.enabled === false) return 'Nonaktif'
  const r = result.value.ruleResults[rule.id]
  if (!r) return ''
  if (r.skipped) return 'Dilewati (konfigurasi belum lengkap)'
  const kind = CLEANING_OPERATIONS[rule.operation]?.kind
  return kind === 'row' ? `${formatNumber(r.affected)} baris dihapus` : `${formatNumber(r.affected)} sel diubah`
}

const opColors = {
  trim: 'bg-sky-100 text-sky-700',
  uppercase: 'bg-indigo-100 text-indigo-700',
  lowercase: 'bg-indigo-100 text-indigo-700',
  capitalize: 'bg-indigo-100 text-indigo-700',
  replace: 'bg-amber-100 text-amber-700',
  fillEmpty: 'bg-teal-100 text-teal-700',
  removeEmptyRows: 'bg-rose-100 text-rose-700',
  removeDuplicates: 'bg-rose-100 text-rose-700',
}
</script>

<template>
  <div class="space-y-5">
    <div>
      <h2 class="section-title">Data cleaning</h2>
      <p class="section-desc">
        Operasi dijalankan <b>berurutan dari atas ke bawah</b> pada data hasil mapping. Data sumber tidak diubah.
      </p>
    </div>

    <div class="card p-4">
      <div class="mb-2 text-xs font-semibold text-slate-500 uppercase">Tambah operasi</div>
      <div class="flex flex-wrap gap-2">
        <button v-for="op in operations" :key="op.key" class="btn btn-sm btn-secondary" :title="op.description" @click="addRule(op.key)">
          <Plus class="h-3.5 w-3.5" /> {{ op.label }}
        </button>
      </div>
    </div>

    <div v-if="state.rules.length === 0" class="card flex flex-col items-center p-10 text-center">
      <Eraser class="h-8 w-8 text-slate-300" />
      <p class="mt-2 text-sm text-slate-500">Belum ada operasi cleaning. Data akan diekspor sesuai hasil mapping.</p>
    </div>

    <ol class="space-y-3">
      <li
        v-for="(rule, index) in state.rules"
        :key="rule.id"
        class="card p-4 transition"
        :class="rule.enabled === false ? 'opacity-60' : ''"
      >
        <div class="flex flex-wrap items-start gap-3">
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
            {{ index + 1 }}
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="badge" :class="opColors[rule.operation]">{{ CLEANING_OPERATIONS[rule.operation].label }}</span>
              <span class="text-xs text-slate-500">{{ resultText(rule) }}</span>
            </div>
            <p class="mt-1 text-xs text-slate-500">{{ CLEANING_OPERATIONS[rule.operation].description }}</p>
          </div>
          <div class="flex items-center gap-1">
            <label class="mr-2 flex items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                class="checkbox"
                :checked="rule.enabled !== false"
                @change="rule.enabled = $event.target.checked"
              />
              Aktif
            </label>
            <button class="btn-icon" :disabled="index === 0" aria-label="Naikkan" @click="move(index, -1)"><ArrowUp class="h-4 w-4" /></button>
            <button class="btn-icon" :disabled="index === state.rules.length - 1" aria-label="Turunkan" @click="move(index, 1)">
              <ArrowDown class="h-4 w-4" />
            </button>
            <button class="btn-icon hover:bg-rose-50 hover:text-rose-600" aria-label="Hapus operasi" @click="remove(index)">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>

        <div class="mt-3 space-y-3 pl-10">
          <!-- Parameter -->
          <div v-if="rule.operation === 'trim'">
            <label class="flex items-center gap-2 text-sm text-slate-700">
              <input v-model="rule.params.collapseSpaces" type="checkbox" class="checkbox" />
              Rapikan juga spasi ganda di tengah teks
            </label>
          </div>

          <div v-if="rule.operation === 'replace'" class="grid gap-3 sm:grid-cols-2">
            <div>
              <label class="label">Cari</label>
              <input v-model.lazy="rule.params.find" class="input input-sm" :placeholder="rule.params.wholeCell ? 'Nilai sel (kosong = sel kosong)' : 'Teks yang dicari'" />
            </div>
            <div>
              <label class="label">Ganti dengan</label>
              <input v-model.lazy="rule.params.replaceWith" class="input input-sm" placeholder="Teks pengganti (boleh kosong)" />
            </div>
            <div class="flex flex-wrap gap-4 sm:col-span-2">
              <label class="flex items-center gap-2 text-sm text-slate-700">
                <input v-model="rule.params.matchCase" type="checkbox" class="checkbox" /> Cocokkan huruf besar/kecil
              </label>
              <label class="flex items-center gap-2 text-sm text-slate-700">
                <input v-model="rule.params.wholeCell" type="checkbox" class="checkbox" /> Hanya jika seluruh isi sel sama persis
              </label>
            </div>
          </div>

          <div v-if="rule.operation === 'fillEmpty'" class="max-w-sm">
            <label class="label">Ganti sel kosong dengan</label>
            <input v-model.lazy="rule.params.value" class="input input-sm" placeholder="Contoh: -, 0, N/A" />
          </div>

          <div v-if="rule.operation === 'removeDuplicates'" class="flex flex-wrap gap-4">
            <label class="flex items-center gap-2 text-sm text-slate-700">
              <input v-model="rule.params.matchCase" type="checkbox" class="checkbox" /> Bedakan huruf besar/kecil
            </label>
            <label class="flex items-center gap-2 text-sm text-slate-700">
              <input v-model="rule.params.ignoreWhitespace" type="checkbox" class="checkbox" /> Abaikan perbedaan spasi
            </label>
          </div>

          <!-- Kolom -->
          <div v-if="rule.operation !== 'removeEmptyRows'">
            <div class="label">{{ rule.operation === 'removeDuplicates' ? 'Kolom pembanding' : 'Diterapkan pada kolom' }}</div>
            <div class="flex flex-wrap items-center gap-2">
              <label
                class="flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
                :class="isAll(rule) ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'"
              >
                <input type="checkbox" class="checkbox h-3.5 w-3.5" :checked="isAll(rule)" @change="toggleAll(rule, $event.target.checked)" />
                Semua kolom
              </label>
              <template v-if="!isAll(rule)">
                <label
                  v-for="c in activeColumns"
                  :key="c.id"
                  class="flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
                  :class="rule.columns.includes(c.id) ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'"
                >
                  <input
                    type="checkbox"
                    class="checkbox h-3.5 w-3.5"
                    :checked="rule.columns.includes(c.id)"
                    @change="toggleColumn(rule, c.id, $event.target.checked)"
                  />
                  {{ c.target || '(tanpa nama)' }}
                </label>
              </template>
            </div>
          </div>
        </div>
      </li>
    </ol>

    <!-- Preview -->
    <section class="space-y-3">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h3 class="font-semibold text-slate-900">Preview hasil cleaning</h3>
        <span class="text-sm text-slate-500">
          {{ formatNumber(result.stats.resultRows) }} dari {{ formatNumber(result.stats.sourceRows) }} baris ·
          {{ formatNumber(result.stats.cellsChanged) }} sel diubah
        </span>
      </div>
      <DataPreviewTable :headers="result.headers" :rows="result.rows" :page-size="25" max-height="24rem" />
    </section>

    <div class="flex justify-between">
      <button class="btn btn-secondary" @click="emit('back')"><ArrowLeft class="h-4 w-4" /> Kembali</button>
      <button class="btn btn-primary" @click="emit('next')">Lanjut ke Preview &amp; Ekspor <ArrowRight class="h-4 w-4" /></button>
    </div>
  </div>
</template>


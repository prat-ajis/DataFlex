<script setup>
import { computed } from 'vue'
import { ArrowLeft, ArrowRight, Info, MousePointerClick, TriangleAlert } from '@lucide/vue'
import SheetSelector from '@/components/SheetSelector.vue'
import DataPreviewTable from '@/components/DataPreviewTable.vue'
import { useConverterSession } from '@/composables/useConverterSession.js'
import { CSV_DELIMITERS, CSV_ENCODINGS, delimiterLabel } from '@/services/csvService.js'
import { formatNumber } from '@/services/utils.js'

const emit = defineEmits(['next', 'back'])
const { state, source, selectSheet, setCsvOptions, setValueMode, getRawRows, rawRowCount } = useConverterSession()

const RAW_PREVIEW_ROWS = 15
const RAW_PREVIEW_COLS = 30

const totalRaw = computed(() => {
  // Bergantung pada source agar diperbarui ketika data mentah berubah.
  void source.value
  return rawRowCount()
})

const rawPreview = computed(() => {
  void source.value
  const rows = getRawRows(Math.max(RAW_PREVIEW_ROWS, state.headerRow + 5))
  const width = Math.min(RAW_PREVIEW_COLS, Math.max(1, ...rows.map((r) => r.length)))
  return { rows, width }
})

const headerLabels = computed(() => source.value.headers.map((h) => h.label))
const generatedHeaders = computed(() => source.value.headers.filter((h) => h.generated))
const renamedHeaders = computed(() => source.value.headers.filter((h) => h.renamed))

const headerRowModel = computed({
  get: () => state.headerRow,
  set: (v) => {
    const n = Math.floor(Number(v))
    if (!Number.isFinite(n)) return
    state.headerRow = Math.min(Math.max(1, n), Math.max(1, totalRaw.value))
  },
})

const sheetModel = computed({
  get: () => state.selectedSheet,
  set: (name) => selectSheet(name),
})

function colLetter(i) {
  let s = ''
  let n = i + 1
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

function rowClass(idx) {
  const rowNo = idx + 1
  if (rowNo === state.headerRow) return state.hasHeader ? 'bg-brand-100 font-semibold text-brand-800' : 'bg-emerald-50'
  if (rowNo < state.headerRow) return 'text-slate-300 line-through decoration-slate-300'
  return 'text-slate-700'
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="section-title">Sumber data</h2>
      <p class="section-desc">Pilih sheet dan tentukan baris header. Nama kolom sementara hanya digunakan di aplikasi, file asli tidak berubah.</p>
    </div>

    <!-- Sheet (Excel) -->
    <section v-if="state.fileInfo?.kind === 'excel'" class="card space-y-4 p-5">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 class="font-semibold text-slate-900">Pilih sheet</h3>
          <p class="text-sm text-slate-500">MVP memproses satu sheet per sesi konversi.</p>
        </div>
        <div class="w-full sm:w-72">
          <label class="label" for="valueMode">Nilai angka</label>
          <select id="valueMode" class="input" :value="state.excelOptions.valueMode" :disabled="state.loading" @change="setValueMode($event.target.value)">
            <option value="formatted">Sesuai tampilan di Excel (disarankan)</option>
            <option value="raw">Nilai mentah tanpa format</option>
          </select>
        </div>
      </div>
      <SheetSelector v-model="sheetModel" :sheets="state.sheets" :disabled="state.loading" />
      <p class="flex items-start gap-1.5 text-xs text-slate-500">
        <Info class="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Formula tidak dijalankan — yang dibaca adalah nilai hasil yang tersimpan di file. Tanggal dikonversi ke format yyyy-mm-dd.
      </p>
    </section>

    <!-- Opsi CSV -->
    <section v-if="state.fileInfo?.kind === 'csv'" class="card space-y-4 p-5">
      <h3 class="font-semibold text-slate-900">Pengaturan pembacaan CSV</h3>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="label" for="encoding">Encoding</label>
          <select id="encoding" class="input" :value="state.csvOptions.encoding" :disabled="state.loading" @change="setCsvOptions({ encoding: $event.target.value })">
            <option v-for="e in CSV_ENCODINGS" :key="e.value" :value="e.value">{{ e.label }}</option>
          </select>
          <p class="mt-1 text-xs text-slate-500">Ubah jika huruf seperti é, ü, atau simbol tampil tidak benar.</p>
        </div>
        <div>
          <label class="label" for="delimiter">Delimiter</label>
          <select id="delimiter" class="input" :value="state.csvOptions.delimiter" :disabled="state.loading" @change="setCsvOptions({ delimiter: $event.target.value })">
            <option v-for="d in CSV_DELIMITERS" :key="d.label" :value="d.value">{{ d.label }}</option>
          </select>
          <p v-if="!state.csvOptions.delimiter && state.detectedDelimiter" class="mt-1 text-xs text-slate-500">
            Terdeteksi: <b>{{ delimiterLabel(state.detectedDelimiter) }}</b>
          </p>
        </div>
      </div>
    </section>

    <div v-if="state.parseWarnings.length" class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      <div class="flex items-center gap-2 font-semibold"><TriangleAlert class="h-4 w-4" /> Catatan pembacaan file</div>
      <ul class="mt-1 ml-6 list-disc">
        <li v-for="(w, i) in state.parseWarnings" :key="i">{{ w }}</li>
      </ul>
    </div>

    <!-- Header -->
    <section class="card space-y-4 p-5">
      <div class="flex flex-wrap items-end gap-6">
        <div>
          <h3 class="font-semibold text-slate-900">Baris header</h3>
          <p class="text-sm text-slate-500">Klik baris pada tabel di bawah untuk memilihnya sebagai {{ state.hasHeader ? 'header' : 'awal data' }}.</p>
        </div>
        <div class="flex flex-wrap items-end gap-4">
          <div>
            <label class="label" for="headerRow">{{ state.hasHeader ? 'Nomor baris header' : 'Data mulai dari baris' }}</label>
            <input id="headerRow" v-model.lazy="headerRowModel" type="number" min="1" :max="totalRaw" class="input w-32" />
          </div>
          <label class="flex items-center gap-2 pb-2 text-sm text-slate-700">
            <input v-model="state.hasHeader" type="checkbox" class="checkbox" :true-value="false" :false-value="true" />
            File tidak memiliki header
          </label>
        </div>
      </div>

      <div class="overflow-hidden rounded-lg border border-slate-200">
        <div class="max-h-80 overflow-auto">
          <table class="data-table min-w-full text-xs">
            <thead class="sticky top-0 bg-slate-100 text-slate-500">
              <tr>
                <th class="w-12 px-2 py-1.5 text-right font-medium">Baris</th>
                <th v-for="c in rawPreview.width" :key="c" class="px-2 py-1.5 text-left font-medium">{{ colLetter(c - 1) }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in rawPreview.rows"
                :key="idx"
                class="cursor-pointer border-t border-slate-100 hover:bg-brand-50"
                :class="rowClass(idx)"
                :title="`Gunakan baris ${idx + 1} sebagai ${state.hasHeader ? 'header' : 'awal data'}`"
                @click="headerRowModel = idx + 1"
              >
                <td class="px-2 py-1 text-right font-mono text-slate-400">{{ idx + 1 }}</td>
                <td v-for="c in rawPreview.width" :key="c" class="px-2 py-1">{{ row[c - 1] }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p class="flex items-center gap-1.5 text-xs text-slate-500">
        <MousePointerClick class="h-3.5 w-3.5" />
        Menampilkan {{ rawPreview.rows.length }} dari {{ formatNumber(totalRaw) }} baris mentah<span v-if="rawPreview.width >= RAW_PREVIEW_COLS">, maks. {{ RAW_PREVIEW_COLS }} kolom</span>.
      </p>

      <div v-if="generatedHeaders.length || renamedHeaders.length" class="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        <p v-if="generatedHeaders.length && state.hasHeader">
          <b>{{ generatedHeaders.length }}</b> header kosong diberi nama sementara:
          {{ generatedHeaders.slice(0, 6).map((h) => h.label).join(', ') }}<span v-if="generatedHeaders.length > 6">, …</span>
        </p>
        <p v-if="renamedHeaders.length">
          <b>{{ renamedHeaders.length }}</b> header duplikat diberi akhiran:
          {{ renamedHeaders.slice(0, 6).map((h) => h.label).join(', ') }}<span v-if="renamedHeaders.length > 6">, …</span>
        </p>
      </div>
    </section>

    <!-- Preview sumber -->
    <section class="space-y-3">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h3 class="font-semibold text-slate-900">Preview data sumber</h3>
        <span class="text-sm text-slate-500">{{ formatNumber(source.headers.length) }} kolom · {{ formatNumber(source.rows.length) }} baris data</span>
      </div>
      <DataPreviewTable
        :headers="headerLabels"
        :rows="source.rows"
        :page-size="25"
        :row-number-start="source.firstDataRow"
        row-number-label="Baris"
        max-height="22rem"
        empty-text="Tidak ada baris data setelah baris header."
      />
    </section>

    <div class="flex justify-between">
      <button class="btn btn-secondary" @click="emit('back')"><ArrowLeft class="h-4 w-4" /> Kembali</button>
      <button class="btn btn-primary" :disabled="source.headers.length === 0 || state.loading" @click="emit('next')">
        Lanjut ke Mapping <ArrowRight class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>


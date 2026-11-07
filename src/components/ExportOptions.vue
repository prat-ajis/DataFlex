<script setup>
import { computed, ref } from 'vue'
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  Save,
  TriangleAlert,
} from '@lucide/vue'
import DataPreviewTable from '@/components/DataPreviewTable.vue'
import ValidationSummary from '@/components/ValidationSummary.vue'
import { useConverterSession } from '@/composables/useConverterSession.js'
import { useToast } from '@/composables/useToast.js'
import { CSV_DELIMITERS } from '@/services/csvService.js'
import { formatNumber } from '@/services/utils.js'

const emit = defineEmits(['back', 'save-template'])
const { state, result, validation, exportResult } = useConverterSession()
const toast = useToast()

const copied = ref(false)

const formulaLikeCount = computed(() => {
  let count = 0
  const isFormula = (s) => /^[=+\-@\t\r]/.test(s) && !/^[+-]?(\d+([.,]\d+)*)([eE][+-]?\d+)?%?$/.test(s)
  for (const h of result.value.headers) if (isFormula(h)) count++
  for (const row of result.value.rows) {
    for (const v of row) if (isFormula(v)) count++
  }
  return count
})

function handleExport() {
  try {
    const res = exportResult()
    toast.success(`File ${res.fileName} berhasil diunduh (${formatNumber(res.rows)} baris).`)
  } catch (err) {
    toast.error(err.message || 'Gagal mengekspor file.')
  }
}

async function copyToClipboard() {
  try {
    const headerLine = result.value.headers.join('\t')
    const rowLines = result.value.rows.map((r) => r.join('\t')).join('\n')
    await navigator.clipboard.writeText(`${headerLine}\n${rowLines}`)
    copied.value = true
    toast.success('Data hasil berhasil disalin ke clipboard (format TSV/Excel).')
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    toast.error('Gagal menyalin data ke clipboard.')
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="section-title">Preview &amp; Ekspor</h2>
      <p class="section-desc">Periksa hasil akhir transformasi dan pilih format ekspor yang diinginkan.</p>
    </div>

    <!-- Statistik Hasil -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="card p-4">
        <div class="text-xs font-semibold text-slate-500 uppercase">Baris Sumber</div>
        <div class="mt-1 text-2xl font-bold text-slate-800">{{ formatNumber(result.stats.sourceRows) }}</div>
      </div>
      <div class="card p-4">
        <div class="text-xs font-semibold text-slate-500 uppercase">Baris Hasil</div>
        <div class="mt-1 text-2xl font-bold text-brand-600">{{ formatNumber(result.stats.resultRows) }}</div>
      </div>
      <div class="card p-4">
        <div class="text-xs font-semibold text-slate-500 uppercase">Kolom Hasil</div>
        <div class="mt-1 text-2xl font-bold text-slate-800">{{ formatNumber(result.stats.resultColumns) }}</div>
      </div>
      <div class="card p-4">
        <div class="text-xs font-semibold text-slate-500 uppercase">Baris Dihapus</div>
        <div class="mt-1 text-2xl font-bold text-slate-800">
          {{ formatNumber(result.stats.emptyRowsRemoved + result.stats.duplicatesRemoved) }}
        </div>
      </div>
    </div>

    <!-- Pengaturan Ekspor -->
    <div class="card space-y-4 p-5">
      <h3 class="font-semibold text-slate-900">Format &amp; Pengaturan File</h3>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="label" for="exportFormat">Format File</label>
          <div class="flex gap-2">
            <button
              type="button"
              class="btn flex-1"
              :class="state.exportOptions.format === 'xlsx' ? 'btn-primary' : 'btn-secondary'"
              @click="state.exportOptions.format = 'xlsx'"
            >
              <FileSpreadsheet class="h-4 w-4" /> Excel (.xlsx)
            </button>
            <button
              type="button"
              class="btn flex-1"
              :class="state.exportOptions.format === 'csv' ? 'btn-primary' : 'btn-secondary'"
              @click="state.exportOptions.format = 'csv'"
            >
              <FileText class="h-4 w-4" /> CSV (.csv)
            </button>
          </div>
        </div>

        <div>
          <label class="label" for="fileName">Nama File</label>
          <input id="fileName" v-model.trim="state.exportOptions.fileName" class="input" placeholder="Nama file keluaran" />
        </div>
      </div>

      <!-- Opsi Tambahan Excel -->
      <div v-if="state.exportOptions.format === 'xlsx'" class="space-y-2 border-t border-slate-100 pt-3">
        <label class="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            class="checkbox"
            :checked="state.exportOptions.numberMode === 'auto'"
            @change="state.exportOptions.numberMode = $event.target.checked ? 'auto' : 'text'"
          />
          Deteksi angka otomatis (identifier seperti NIS "00123" tetap dipertahankan sebagai teks)
        </label>
      </div>

      <!-- Opsi Tambahan CSV -->
      <div v-if="state.exportOptions.format === 'csv'" class="space-y-3 border-t border-slate-100 pt-3">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="label" for="csvDelim">Delimiter / Pemisah Kolom</label>
            <select id="csvDelim" v-model="state.exportOptions.delimiter" class="input">
              <option v-for="d in CSV_DELIMITERS.filter(x => x.value)" :key="d.value" :value="d.value">{{ d.label }}</option>
            </select>
          </div>
          <div class="flex flex-col justify-end space-y-2 pb-1">
            <label class="flex items-center gap-2 text-sm text-slate-700">
              <input v-model="state.exportOptions.bom" type="checkbox" class="checkbox" />
              Sertakan UTF-8 BOM (rekomendasi agar karakter rapi di Microsoft Excel)
            </label>
            <label class="flex items-center gap-2 text-sm text-slate-700">
              <input v-model="state.exportOptions.formulaGuard" type="checkbox" class="checkbox" />
              Formula Guard (amankan teks awalan =, +, -, @ agar tidak dieksekusi formula injection)
            </label>
          </div>
        </div>
      </div>

      <div v-if="formulaLikeCount > 0 && state.exportOptions.formulaGuard && state.exportOptions.format === 'csv'" class="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" />
        Terdapat {{ formulaLikeCount }} sel yang diawali tanda simbol formula. Tanda kutip pelindung (') akan otomatis ditambahkan demi keamanan.
      </div>
    </div>

    <!-- Validasi -->
    <ValidationSummary :errors="validation.errors" :warnings="validation.warnings" show-success />

    <!-- Preview Tabel Hasil -->
    <div class="space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="font-semibold text-slate-900">Tabel Preview Hasil Akhir</h3>
        <button class="btn btn-sm btn-secondary" @click="copyToClipboard">
          <Check v-if="copied" class="h-3.5 w-3.5 text-emerald-600" />
          <Copy v-else class="h-3.5 w-3.5" />
          {{ copied ? 'Tersalin!' : 'Salin ke Clipboard' }}
        </button>
      </div>
      <DataPreviewTable :headers="result.headers" :rows="result.rows" :page-size="50" max-height="24rem" />
    </div>

    <!-- Tombol Aksi -->
    <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
      <button class="btn btn-secondary" @click="emit('back')">
        <ArrowLeft class="h-4 w-4" /> Kembali ke Cleaning
      </button>
      <div class="flex gap-2">
        <button class="btn btn-secondary" @click="emit('save-template')">
          <Save class="h-4 w-4" /> Simpan Konfigurasi Template
        </button>
        <button
          class="btn btn-primary px-5 py-2.5 text-base font-semibold"
          :disabled="!validation.valid || result.rows.length === 0"
          @click="handleExport"
        >
          <Download class="h-5 w-5" /> Unduh Hasil ({{ state.exportOptions.format.toUpperCase() }})
        </button>
      </div>
    </div>
  </div>
</template>


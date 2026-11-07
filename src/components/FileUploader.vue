<script setup>
import { computed, ref } from 'vue'
import { ArrowRight, FileSpreadsheet, FileText, LoaderCircle, Lock, RefreshCw, TriangleAlert, Upload, X, CircleAlert } from '@lucide/vue'
import { MAX_FILE_SIZE, useConverterSession } from '@/composables/useConverterSession.js'
import { formatBytes, formatNumber } from '@/services/utils.js'

const emit = defineEmits(['next'])
const { state, hasSession, loadFile, clearSession, rawRowCount } = useConverterSession()

const input = ref(null)
const dragging = ref(false)
let dragDepth = 0

const accept = '.xlsx,.xls,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv'

const summary = computed(() => {
  if (!state.fileInfo) return ''
  if (state.fileInfo.kind === 'excel') {
    const n = state.sheets.length
    return `Workbook Excel · ${n} sheet`
  }
  return `CSV · ${formatNumber(rawRowCount())} baris`
})

function pick() {
  input.value?.click()
}

async function handleFiles(files) {
  const file = files?.[0]
  if (!file) return
  await loadFile(file)
  if (input.value) input.value.value = ''
}

function onDrop(e) {
  dragDepth = 0
  dragging.value = false
  handleFiles(e.dataTransfer?.files)
}
function onDragEnter() {
  dragDepth += 1
  dragging.value = true
}
function onDragLeave() {
  dragDepth -= 1
  if (dragDepth <= 0) dragging.value = false
}
</script>

<template>
  <div class="space-y-5">
    <div>
      <h2 class="section-title">Unggah file</h2>
      <p class="section-desc">Pilih file Excel atau CSV yang ingin dikonversi. File tidak akan diubah dan tidak dikirim ke server.</p>
    </div>

    <input ref="input" type="file" class="hidden" :accept="accept" @change="handleFiles($event.target.files)" />

    <!-- Dropzone -->
    <div
      v-if="!hasSession"
      class="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition"
      :class="dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-white hover:border-brand-400'"
      role="button"
      tabindex="0"
      aria-label="Area unggah file"
      @click="pick"
      @keydown.enter.prevent="pick"
      @keydown.space.prevent="pick"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <template v-if="state.loading">
        <LoaderCircle class="h-10 w-10 animate-spin text-brand-600" />
        <p class="mt-3 text-sm font-medium text-slate-700">{{ state.loadingMessage }}</p>
        <p class="mt-1 text-xs text-slate-500">File besar dapat membutuhkan waktu beberapa detik.</p>
      </template>
      <template v-else>
        <div class="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-600">
          <Upload class="h-6 w-6" />
        </div>
        <p class="mt-4 text-base font-semibold text-slate-800">Tarik &amp; lepas file di sini</p>
        <p class="mt-1 text-sm text-slate-500">atau</p>
        <button type="button" class="btn btn-primary mt-3" @click.stop="pick">Pilih file</button>
        <p class="mt-4 text-xs text-slate-500">
          Format didukung: <b>XLSX</b>, <b>XLS</b>, <b>CSV</b> (juga TSV/TXT berpemisah) · Maks. {{ MAX_FILE_SIZE / 1024 / 1024 }} MB
        </p>
      </template>
    </div>

    <!-- File terpilih -->
    <div v-else class="card p-5">
      <div class="flex flex-wrap items-center gap-4">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-lg"
          :class="state.fileInfo.kind === 'excel' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'"
        >
          <FileSpreadsheet v-if="state.fileInfo.kind === 'excel'" class="h-6 w-6" />
          <FileText v-else class="h-6 w-6" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="truncate font-semibold text-slate-900" :title="state.fileInfo.name">{{ state.fileInfo.name }}</div>
          <div class="text-sm text-slate-500">{{ formatBytes(state.fileInfo.size) }} · {{ summary }}</div>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-secondary" :disabled="state.loading" @click="pick"><RefreshCw class="h-4 w-4" /> Ganti file</button>
          <button class="btn btn-ghost" :disabled="state.loading" @click="clearSession"><X class="h-4 w-4" /> Batalkan</button>
        </div>
      </div>
      <div
        v-if="state.fileInfo.large"
        class="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"
      >
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" />
        File berukuran besar. Pemrosesan dilakukan di memori browser sehingga dapat terasa lambat pada perangkat dengan RAM terbatas.
      </div>
    </div>

    <div v-if="state.error" class="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
      <CircleAlert class="mt-0.5 h-4 w-4 shrink-0" />
      <span>{{ state.error }}</span>
    </div>

    <div class="flex items-center justify-between gap-4">
      <p class="flex items-center gap-1.5 text-xs text-slate-500"><Lock class="h-3.5 w-3.5" /> Diproses 100% lokal di browser.</p>
      <button class="btn btn-primary" :disabled="!hasSession || state.loading" @click="emit('next')">
        Lanjut <ArrowRight class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>


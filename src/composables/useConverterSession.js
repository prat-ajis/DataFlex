/**
 * useConverterSession
 * -------------------
 * State sesi konversi (dibagikan antarhalaman selama tab browser terbuka).
 * Data sumber disimpan di memori saja — tidak pernah ditulis ke LocalStorage/IndexedDB.
 *
 * Alur data: File asli -> rawRows -> source (header + baris) -> mapping -> cleaning -> preview -> export
 */
import { computed, markRaw, reactive, shallowRef, watch } from 'vue'
import { getSheetInfos, readWorkbook, sheetToRows } from '@/services/excelService.js'
import { readCsvFile } from '@/services/csvService.js'
import { exportDelimited, exportXlsx } from '@/services/exportService.js'
import { applyTemplate, checkTemplateMatch } from '@/services/templateStorage.js'
import {
  buildSourceTable,
  createColumnsFromHeaders,
  createRule,
  isEmptyValue,
  transform,
  validateConfig,
} from '@/services/transformService.js'
import { getExtension, nextFrame, stripExtension } from '@/services/utils.js'

export const MAX_FILE_SIZE = 20 * 1024 * 1024
export const LARGE_FILE_WARNING = 5 * 1024 * 1024
export const ACCEPTED_EXTENSIONS = ['xlsx', 'xls', 'csv', 'tsv', 'txt']
export const EXCEL_EXTENSIONS = ['xlsx', 'xls']

export const STEPS = [
  { id: 1, key: 'upload', label: 'Unggah File' },
  { id: 2, key: 'source', label: 'Sheet & Header' },
  { id: 3, key: 'mapping', label: 'Mapping Kolom' },
  { id: 4, key: 'cleaning', label: 'Cleaning' },
  { id: 5, key: 'export', label: 'Preview & Ekspor' },
]

function defaultExportOptions() {
  return {
    format: 'xlsx',
    fileName: 'dataflex_export',
    delimiter: ',',
    bom: true,
    formulaGuard: true,
    numberMode: 'auto',
  }
}

function defaultRules() {
  return [createRule('trim'), createRule('removeEmptyRows')]
}

const state = reactive({
  step: 1,
  fileInfo: null,
  loading: false,
  loadingMessage: '',
  error: '',
  parseWarnings: [],
  sheets: [],
  selectedSheet: '',
  csvOptions: { encoding: 'utf-8', delimiter: '' },
  detectedDelimiter: '',
  excelOptions: { valueMode: 'formatted' },
  headerRow: 1,
  hasHeader: true,
  columns: [],
  rules: [],
  exportOptions: defaultExportOptions(),
  appliedTemplate: null,
  lastExport: null,
})

// Objek besar disimpan di luar reactive agar tidak diproksikan Vue (hemat memori & cepat).
let currentFile = null
let currentWorkbook = null
const rawRows = shallowRef([])
let skipNextHeaderReset = false

const source = computed(() =>
  markRaw(buildSourceTable(rawRows.value, { headerRow: state.headerRow, hasHeader: state.hasHeader })),
)
const headerSignature = computed(() => source.value.headers.map((h) => h.label).join('\u0001'))

// Header berubah (sheet/baris header/file lain) -> mapping disusun ulang.
watch(headerSignature, () => {
  if (skipNextHeaderReset) {
    skipNextHeaderReset = false
    return
  }
  resetMapping()
})

const result = computed(() => markRaw(transform(source.value, state.columns, state.rules)))
const validation = computed(() => validateConfig(source.value, state.columns, state.rules))
const hasSession = computed(() => Boolean(state.fileInfo))
const hasData = computed(() => rawRows.value.length > 0)
const fileKind = computed(() => (state.fileInfo ? state.fileInfo.kind : null))

function resetMapping() {
  state.columns = createColumnsFromHeaders(source.value.headers)
  state.rules = defaultRules()
  state.appliedTemplate = null
}

function firstNonEmptyRow(rows) {
  for (let i = 0; i < Math.min(rows.length, 50); i += 1) {
    if ((rows[i] || []).some((v) => !isEmptyValue(v))) return i + 1
  }
  return 1
}

function setRawRows(rows, { keepHeaderRow = false } = {}) {
  rawRows.value = markRaw(rows)
  if (!keepHeaderRow) state.headerRow = firstNonEmptyRow(rows)
}

function clearSession() {
  currentFile = null
  currentWorkbook = null
  rawRows.value = []
  Object.assign(state, {
    step: 1,
    fileInfo: null,
    loading: false,
    loadingMessage: '',
    error: '',
    parseWarnings: [],
    sheets: [],
    selectedSheet: '',
    csvOptions: { encoding: 'utf-8', delimiter: '' },
    detectedDelimiter: '',
    excelOptions: { valueMode: 'formatted' },
    headerRow: 1,
    hasHeader: true,
    columns: [],
    rules: [],
    exportOptions: defaultExportOptions(),
    appliedTemplate: null,
    lastExport: null,
  })
}

async function withLoading(message, fn) {
  state.loading = true
  state.loadingMessage = message
  state.error = ''
  await nextFrame()
  try {
    return await fn()
  } finally {
    state.loading = false
    state.loadingMessage = ''
  }
}

function validateFile(file) {
  if (!file) throw new Error('Tidak ada file yang dipilih.')
  const ext = getExtension(file.name)
  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    throw new Error(`Format ".${ext || '?'}" tidak didukung. Gunakan file XLSX, XLS, atau CSV.`)
  }
  if (file.size === 0) throw new Error('File kosong (0 byte).')
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Ukuran file melebihi batas ${MAX_FILE_SIZE / 1024 / 1024} MB.`)
  }
  return ext
}

async function parseCsvCurrent({ keepHeaderRow = false } = {}) {
  const { rows, delimiter, warnings } = await readCsvFile(currentFile, state.csvOptions)
  state.detectedDelimiter = delimiter
  state.parseWarnings = warnings
  setRawRows(rows, { keepHeaderRow })
}

function loadSheetCurrent(name, { keepHeaderRow = false } = {}) {
  state.selectedSheet = name
  state.parseWarnings = []
  setRawRows(sheetToRows(currentWorkbook, name, state.excelOptions), { keepHeaderRow })
}

/** Memuat file baru (menggantikan sesi sebelumnya). */
async function loadFile(file) {
  let ext
  try {
    ext = validateFile(file)
  } catch (e) {
    state.error = e.message
    return false
  }
  const exportOptions = { ...state.exportOptions }
  clearSession()
  state.exportOptions = { ...exportOptions, fileName: `${stripExtension(file.name)}_dataflex` }
  const kind = EXCEL_EXTENSIONS.includes(ext) ? 'excel' : 'csv'
  try {
    await withLoading('Membaca file…', async () => {
      currentFile = file
      if (kind === 'excel') {
        currentWorkbook = markRaw(await readWorkbook(file))
        state.sheets = getSheetInfos(currentWorkbook)
        const first = state.sheets.find((s) => !s.empty && !s.hidden) || state.sheets.find((s) => !s.empty) || state.sheets[0]
        loadSheetCurrent(first.name)
      } else {
        await parseCsvCurrent()
      }
      state.fileInfo = {
        name: file.name,
        size: file.size,
        ext,
        kind,
        lastModified: file.lastModified,
        large: file.size > LARGE_FILE_WARNING,
      }
      // Susun mapping secara eksplisit (watcher tidak terpicu jika header file baru identik dengan sebelumnya).
      resetMapping()
    })
    return true
  } catch (e) {
    clearSession()
    state.exportOptions = exportOptions
    state.error = e?.message || 'Terjadi kesalahan saat membaca file.'
    return false
  }
}

async function selectSheet(name) {
  if (!currentWorkbook || name === state.selectedSheet) return
  await withLoading('Membaca sheet…', async () => loadSheetCurrent(name))
}

async function setCsvOptions(options) {
  Object.assign(state.csvOptions, options)
  if (!currentFile || state.fileInfo?.kind !== 'csv') return
  try {
    await withLoading('Membaca ulang CSV…', () => parseCsvCurrent({ keepHeaderRow: true }))
  } catch (e) {
    state.error = e?.message || 'Gagal membaca ulang file.'
  }
}

async function setValueMode(valueMode) {
  state.excelOptions.valueMode = valueMode
  if (!currentWorkbook || !state.selectedSheet) return
  await withLoading('Membaca ulang sheet…', async () => loadSheetCurrent(state.selectedSheet, { keepHeaderRow: true }))
}

/** Baris mentah (untuk preview pemilihan baris header). */
function getRawRows(limit = 30) {
  return rawRows.value.slice(0, limit)
}

function rawRowCount() {
  return rawRows.value.length
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

/** Mengecek kecocokan template tanpa menerapkannya. */
function inspectTemplate(template) {
  return checkTemplateMatch(template, source.value.headers)
}

/** Menerapkan template ke sesi saat ini. Header row & opsi ekspor dari template juga diterapkan. */
function useTemplate(template, { applyHeaderSettings = true } = {}) {
  if (applyHeaderSettings) {
    const sigBefore = headerSignature.value
    const nextHeaderRow = Math.min(template.headerRow || 1, Math.max(rawRows.value.length, 1))
    if (state.headerRow !== nextHeaderRow || state.hasHeader !== template.hasHeader) {
      state.headerRow = nextHeaderRow
      state.hasHeader = template.hasHeader
      // Hindari reset mapping oleh watcher karena mapping akan langsung diganti template.
      if (headerSignature.value !== sigBefore) skipNextHeaderReset = true
    }
  }
  const { columns, rules, missing, extra } = applyTemplate(template, source.value.headers)
  state.columns = columns
  state.rules = rules
  const fileName = state.exportOptions.fileName
  state.exportOptions = { ...state.exportOptions, ...template.export, fileName }
  state.appliedTemplate = { id: template.id, name: template.name, missing, extra }
  return { missing, extra }
}

// ---------------------------------------------------------------------------
// Ekspor
// ---------------------------------------------------------------------------

function exportResult() {
  if (!validation.value.valid) {
    throw new Error('Konfigurasi masih memiliki kesalahan. Perbaiki terlebih dahulu sebelum mengekspor.')
  }
  const { headers, rows } = result.value
  const opt = state.exportOptions
  let info
  if (opt.format === 'xlsx') {
    info = exportXlsx(headers, rows, {
      fileName: opt.fileName,
      sheetName: state.selectedSheet || 'Hasil',
      numberMode: opt.numberMode,
    })
  } else {
    info = exportDelimited(headers, rows, {
      fileName: opt.fileName,
      delimiter: opt.format === 'tsv' ? '\t' : opt.delimiter,
      bom: opt.bom,
      formulaGuard: opt.formulaGuard,
      format: opt.format,
    })
  }
  state.lastExport = { ...info, rows: rows.length, at: new Date().toISOString() }
  return state.lastExport
}

export function useConverterSession() {
  return {
    state,
    source,
    result,
    validation,
    hasSession,
    hasData,
    fileKind,
    loadFile,
    selectSheet,
    setCsvOptions,
    setValueMode,
    getRawRows,
    rawRowCount,
    resetMapping,
    clearSession,
    inspectTemplate,
    useTemplate,
    exportResult,
  }
}

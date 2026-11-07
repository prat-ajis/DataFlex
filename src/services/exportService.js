/**
 * exportService
 * -------------
 * Membuat file keluaran (XLSX / CSV / TSV) di browser dan memicu unduhan.
 */
import * as XLSX from 'xlsx'
import { buildCsv } from './csvService.js'
import { downloadBlob, sanitizeFileName } from './utils.js'

/**
 * Angka "aman" untuk dikonversi menjadi tipe angka di Excel:
 * tanpa nol di depan (kecuali "0" / "0.x"), maksimal 15 digit (batas presisi Excel),
 * memakai titik sebagai desimal. Identifier seperti "00123" atau NIK 16 digit tetap teks.
 */
const SAFE_NUMBER = /^-?(0|[1-9]\d*)(\.\d+)?$/

export function isSafeNumber(value) {
  if (typeof value !== 'string' || !SAFE_NUMBER.test(value)) return false
  const digits = value.replace(/[-.]/g, '').replace(/^0+(?=\d)/, '')
  return digits.length <= 15
}

/** Nama sheet Excel: maks 31 karakter, tanpa karakter []:*?/\ */
export function sanitizeSheetName(name) {
  const cleaned = String(name ?? '')
    .replace(/[[\]:*?/\\]/g, '_')
    .replace(/^'+|'+$/g, '')
    .trim()
    .slice(0, 31)
  return cleaned || 'Hasil'
}

/** Membuat workbook XLSX dengan satu sheet hasil. */
export function buildWorkbook(headers, rows, { sheetName = 'Hasil', numberMode = 'auto' } = {}) {
  const aoa = new Array(rows.length + 1)
  aoa[0] = headers.map((h) => String(h ?? ''))
  for (let r = 0; r < rows.length; r += 1) {
    const src = rows[r]
    const out = new Array(src.length)
    for (let c = 0; c < src.length; c += 1) {
      const v = src[c] ?? ''
      out[c] = numberMode === 'auto' && isSafeNumber(v) ? Number(v) : String(v)
    }
    aoa[r + 1] = out
  }
  // aoa_to_sheet menyimpan string sebagai sel teks; teks seperti "=SUM(A1)" tidak menjadi formula.
  const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: false })

  // Lebar kolom berdasarkan sampel isi.
  const sample = Math.min(aoa.length, 300)
  ws['!cols'] = headers.map((_, c) => {
    let max = 8
    for (let r = 0; r < sample; r += 1) {
      const len = String(aoa[r][c] ?? '').length
      if (len > max) max = len
    }
    return { wch: Math.min(max + 2, 60) }
  })
  if (headers.length > 0) {
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(rows.length, 1), c: headers.length - 1 } }) }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(sheetName))
  return wb
}

export function exportXlsx(headers, rows, { fileName, sheetName, numberMode } = {}) {
  const wb = buildWorkbook(headers, rows, { sheetName, numberMode })
  const name = `${sanitizeFileName(fileName)}.xlsx`
  const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: true })
  downloadBlob(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), name)
  return { fileName: name }
}

export function exportDelimited(headers, rows, { fileName, delimiter = ',', bom = true, formulaGuard = true, format = 'csv' } = {}) {
  const { content, guardedCells } = buildCsv(headers, rows, { delimiter, bom, formulaGuard })
  const ext = format === 'tsv' ? 'tsv' : 'csv'
  const mime = format === 'tsv' ? 'text/tab-separated-values;charset=utf-8' : 'text/csv;charset=utf-8'
  const name = `${sanitizeFileName(fileName)}.${ext}`
  downloadBlob(new Blob([content], { type: mime }), name)
  return { fileName: name, guardedCells }
}


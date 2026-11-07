/**
 * excelService
 * ------------
 * Membaca workbook Excel (XLSX / XLS) sepenuhnya di browser menggunakan SheetJS.
 * - Formula TIDAK dievaluasi / dieksekusi: hanya nilai tersimpan (cached value) yang dibaca.
 * - Macro (VBA) tidak dibaca.
 * - Tanggal dikonversi ke format ISO (yyyy-mm-dd) agar konsisten dan bebas zona waktu.
 */
import * as XLSX from 'xlsx'

const READ_OPTIONS = {
  type: 'array',
  dense: true,
  cellFormula: false,
  cellHTML: false,
  cellStyles: false,
  cellNF: true,
  cellDates: false,
  bookVBA: false,
  bookDeps: false,
  bookFiles: false,
}

/** Membaca file Excel menjadi workbook. Melempar Error dengan pesan berbahasa Indonesia jika gagal. */
export async function readWorkbook(file) {
  let buffer
  try {
    buffer = await file.arrayBuffer()
  } catch {
    throw new Error('File tidak dapat dibaca dari perangkat Anda.')
  }
  let workbook
  try {
    workbook = XLSX.read(new Uint8Array(buffer), READ_OPTIONS)
  } catch (err) {
    const msg = String(err?.message || '')
    if (/password|encrypt/i.test(msg)) {
      throw new Error('File Excel dilindungi kata sandi/terenkripsi. Buka proteksinya terlebih dahulu, lalu coba lagi.')
    }
    throw new Error(
      'File Excel rusak atau formatnya tidak didukung. Jika ini file .xls lama, coba simpan ulang sebagai .xlsx atau .csv.',
    )
  }
  if (!workbook?.SheetNames?.length) {
    throw new Error('Workbook tidak memiliki sheet yang dapat dibaca.')
  }
  return workbook
}

/** Informasi ringkas setiap sheet (nama, jumlah baris & kolom berdasarkan rentang). */
export function getSheetInfos(workbook) {
  return workbook.SheetNames.map((name) => {
    const ws = workbook.Sheets[name]
    let rows = 0
    let cols = 0
    if (ws && ws['!ref']) {
      const range = XLSX.utils.decode_range(ws['!ref'])
      rows = range.e.r - range.s.r + 1
      cols = range.e.c - range.s.c + 1
    }
    const hidden = Boolean(
      workbook.Workbook?.Sheets?.find((s) => s.name === name)?.Hidden,
    )
    return { name, rows, cols, hidden, empty: !ws || !ws['!ref'] }
  })
}

function pad(n, len = 2) {
  return String(n).padStart(len, '0')
}

function formatDateCode(value, date1904) {
  const d = XLSX.SSF.parse_date_code(value, { date1904 })
  if (!d) return String(value)
  const date = `${pad(d.y, 4)}-${pad(d.m)}-${pad(d.d)}`
  const hasTime = d.H || d.M || d.S
  const hasDate = Math.floor(value) !== 0
  if (!hasTime) return date
  const time = `${pad(d.H)}:${pad(d.M)}:${pad(Math.round(d.S))}`
  return hasDate ? `${date} ${time}` : time
}

function isDateFormat(fmt) {
  if (!fmt || typeof fmt !== 'string') return false
  try {
    return XLSX.SSF.is_date(fmt)
  } catch {
    return false
  }
}

/**
 * Mengubah satu sel menjadi string.
 * @param {'formatted'|'raw'} valueMode
 *   formatted: angka mengikuti tampilan di Excel (mis. NIS "00123" dengan format 00000 tetap 00123)
 *   raw: angka mentah tanpa format tampilan
 */
function cellToString(cell, valueMode, date1904) {
  if (!cell) return ''
  switch (cell.t) {
    case 's':
    case 'str':
      return cell.v == null ? '' : String(cell.v)
    case 'b':
      return cell.v ? 'TRUE' : 'FALSE'
    case 'e':
      return cell.w ?? '#ERROR'
    case 'd': {
      const d = cell.v instanceof Date ? cell.v : new Date(cell.v)
      return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
    }
    case 'n': {
      if (typeof cell.v !== 'number') return cell.w ?? ''
      if (isDateFormat(cell.z)) return formatDateCode(cell.v, date1904)
      if (valueMode === 'formatted' && cell.w != null && cell.w !== '') return String(cell.w).trim()
      return String(cell.v)
    }
    case 'z':
      return ''
    default:
      return cell.w ?? (cell.v == null ? '' : String(cell.v))
  }
}

/** Mengubah sheet menjadi array baris (string[][]). Baris di atas rentang dimulai dari baris 1 sheet. */
export function sheetToRows(workbook, sheetName, { valueMode = 'formatted' } = {}) {
  const ws = workbook.Sheets[sheetName]
  if (!ws || !ws['!ref']) return []
  const date1904 = Boolean(workbook.Workbook?.WBProps?.date1904)
  const range = XLSX.utils.decode_range(ws['!ref'])
  const dense = ws['!data']
  const rows = []
  // Mulai dari baris 0 agar nomor baris di UI sama dengan nomor baris di Excel.
  for (let r = 0; r <= range.e.r; r += 1) {
    const row = []
    if (r >= range.s.r) {
      const denseRow = dense ? dense[r] : null
      for (let c = 0; c <= range.e.c; c += 1) {
        const cell = dense ? denseRow?.[c] : ws[XLSX.utils.encode_cell({ r, c })]
        row.push(cellToString(cell, valueMode, date1904))
      }
    }
    rows.push(row)
  }
  return rows
}


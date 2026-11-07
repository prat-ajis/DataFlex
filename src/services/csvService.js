/**
 * csvService
 * ----------
 * Parsing dan pembuatan CSV/TSV di browser menggunakan PapaParse.
 * Semua nilai dibaca sebagai teks (dynamicTyping = false) agar angka nol di depan tidak hilang.
 */
import Papa from 'papaparse'

export const CSV_ENCODINGS = [
  { value: 'utf-8', label: 'UTF-8 (disarankan)' },
  { value: 'windows-1252', label: 'Windows-1252 / ANSI (Excel lama)' },
  { value: 'iso-8859-1', label: 'ISO-8859-1 (Latin-1)' },
  { value: 'utf-16le', label: 'UTF-16 LE' },
]

export const CSV_DELIMITERS = [
  { value: '', label: 'Deteksi otomatis' },
  { value: ',', label: 'Koma ( , )' },
  { value: ';', label: 'Titik koma ( ; )' },
  { value: '\t', label: 'Tab' },
  { value: '|', label: 'Pipa ( | )' },
]

export function delimiterLabel(delimiter) {
  return CSV_DELIMITERS.find((d) => d.value === delimiter)?.label || JSON.stringify(delimiter)
}

/** Decode bytes menjadi teks. BOM UTF-8/UTF-16 otomatis dihapus. */
export function decodeText(buffer, encoding = 'utf-8') {
  const bytes = new Uint8Array(buffer)
  let enc = encoding
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) enc = 'utf-8'
  else if (bytes[0] === 0xff && bytes[1] === 0xfe) enc = 'utf-16le'
  else if (bytes[0] === 0xfe && bytes[1] === 0xff) enc = 'utf-16be'
  let decoder
  try {
    decoder = new TextDecoder(enc)
  } catch {
    decoder = new TextDecoder('utf-8')
  }
  return decoder.decode(bytes).replace(/^\uFEFF/, '')
}

/**
 * Parse teks CSV menjadi array baris.
 * @returns {{rows: string[][], delimiter: string, warnings: string[]}}
 */
export function parseCsvText(text, { delimiter = '' } = {}) {
  const result = Papa.parse(text, {
    delimiter,
    header: false,
    dynamicTyping: false,
    skipEmptyLines: false,
    delimitersToGuess: [',', ';', '\t', '|'],
  })
  const rows = result.data || []
  // Buang baris kosong terakhir yang muncul akibat newline di akhir file.
  while (rows.length > 0) {
    const last = rows[rows.length - 1]
    if (Array.isArray(last) && last.length === 1 && last[0] === '') rows.pop()
    else break
  }
  const warnings = []
  const errorTypes = new Set()
  for (const e of result.errors || []) {
    if (e.code === 'UndetectableDelimiter') {
      if (rows.some((r) => r.length > 1)) continue
      errorTypes.add('Delimiter tidak dapat dideteksi otomatis; data dibaca sebagai satu kolom. Pilih delimiter secara manual jika perlu.')
    } else if (e.type === 'Quotes') {
      errorTypes.add(`Terdapat tanda kutip yang tidak tertutup (sekitar baris ${(e.row ?? 0) + 1}). Periksa kembali data hasil pembacaan.`)
    } else if (e.type !== 'FieldMismatch') {
      errorTypes.add(e.message)
    }
  }
  warnings.push(...errorTypes)
  return { rows, delimiter: result.meta?.delimiter ?? delimiter, warnings }
}

/** Membaca File CSV/TSV. */
export async function readCsvFile(file, { encoding = 'utf-8', delimiter = '' } = {}) {
  let buffer
  try {
    buffer = await file.arrayBuffer()
  } catch {
    throw new Error('File tidak dapat dibaca dari perangkat Anda.')
  }
  const text = decodeText(buffer, encoding)
  if (text.includes('\u0000')) {
    throw new Error('File ini tampaknya bukan teks CSV (berisi data biner). Pastikan file yang dipilih adalah CSV yang valid atau coba encoding lain.')
  }
  return parseCsvText(text, { delimiter })
}

// ---------------------------------------------------------------------------
// Ekspor
// ---------------------------------------------------------------------------

const FORMULA_START = /^[=+\-@\t\r]/
const PLAIN_NUMBER = /^[+-]?(\d+([.,]\d+)*)([eE][+-]?\d+)?%?$/

/**
 * Apakah nilai berpotensi ditafsirkan sebagai formula oleh aplikasi spreadsheet.
 * Angka biasa seperti "-5" atau "+628123" tidak dianggap formula.
 */
export function isFormulaLike(value) {
  const s = String(value ?? '')
  return FORMULA_START.test(s) && !PLAIN_NUMBER.test(s)
}

/** Menetralkan nilai yang mirip formula dengan menambahkan tanda kutip tunggal (') di depan. */
export function guardFormula(value) {
  return isFormulaLike(value) ? `'${value}` : value
}

/**
 * Membuat teks CSV.
 * @returns {{content: string, guardedCells: number}}
 */
export function buildCsv(headers, rows, { delimiter = ',', bom = true, formulaGuard = true, newline = '\r\n' } = {}) {
  let guardedCells = 0
  const protect = (v) => {
    const s = String(v ?? '')
    if (formulaGuard && isFormulaLike(s)) {
      guardedCells += 1
      return `'${s}`
    }
    return s
  }
  const fields = headers.map(protect)
  const data = rows.map((row) => row.map(protect))
  const body = Papa.unparse(
    { fields, data },
    { delimiter, newline, quotes: false, quoteChar: '"', escapeChar: '"', header: true, escapeFormulae: false },
  )
  return { content: (bom ? '\uFEFF' : '') + body, guardedCells }
}

/** Menghitung jumlah sel yang mirip formula (untuk ditampilkan sebelum ekspor). */
export function countFormulaLike(headers, rows) {
  let n = 0
  for (const h of headers) if (isFormulaLike(h)) n += 1
  for (const row of rows) for (const v of row) if (isFormulaLike(v)) n += 1
  return n
}


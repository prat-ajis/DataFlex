/**
 * transformService
 * ----------------
 * Logika murni (tanpa Vue / DOM) untuk:
 *  - membangun tabel sumber dari baris mentah (header, nama duplikat, dsb.)
 *  - Dynamic Column Mapping
 *  - Data cleaning berurutan
 *  - Validasi konfigurasi
 *
 * Semua nilai diperlakukan sebagai teks agar identifier seperti NIS "00123"
 * tidak kehilangan angka nol di depan.
 */
import { uid } from './utils.js'

// ---------------------------------------------------------------------------
// Nilai & sel
// ---------------------------------------------------------------------------

/**
 * Nilai dianggap kosong bila null/undefined atau string yang hanya berisi spasi.
 * Angka 0 / teks "0" TIDAK dianggap kosong.
 */
export function isEmptyValue(value) {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  return false
}

/** Mengubah nilai sel apa pun menjadi string tanpa mengubah representasinya. */
export function toCellString(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString()
  return String(value)
}

// ---------------------------------------------------------------------------
// Tabel sumber
// ---------------------------------------------------------------------------

/**
 * Membuat nama header unik. Header kosong menjadi "Column N",
 * header duplikat menjadi "Nama (2)", "Nama (3)", dst.
 * Nama ini hanya untuk antarmuka; file asli tidak diubah.
 */
export function makeUniqueHeaders(cells = [], width = cells.length) {
  const used = new Set()
  const headers = []
  for (let i = 0; i < width; i += 1) {
    const original = toCellString(cells[i])
    let base = original.replace(/\s+/g, ' ').trim()
    const generated = base === ''
    if (generated) base = `Column ${i + 1}`
    let label = base
    let n = 2
    while (used.has(label.toLowerCase())) {
      label = `${base} (${n})`
      n += 1
    }
    used.add(label.toLowerCase())
    headers.push({ index: i, label, original, generated, renamed: !generated && label !== base })
  }
  return headers
}

/** Lebar efektif tabel: kolom paling kanan yang memiliki isi pada baris mana pun. */
function effectiveWidth(rows) {
  let width = 0
  for (const row of rows) {
    if (!row) continue
    for (let c = row.length - 1; c >= width; c -= 1) {
      if (!isEmptyValue(row[c])) {
        width = c + 1
        break
      }
    }
  }
  return width
}

/**
 * Membangun tabel sumber dari array baris mentah.
 * @param {Array<Array<any>>} rows baris mentah (hasil parsing file)
 * @param {{headerRow?: number, hasHeader?: boolean}} options
 *   headerRow: nomor baris (1-based). Jika hasHeader=false, data dimulai dari baris ini.
 */
export function buildSourceTable(rows = [], { headerRow = 1, hasHeader = true } = {}) {
  const startIdx = Math.max(0, Math.floor(Number(headerRow) || 1) - 1)
  const headerCells = hasHeader ? rows[startIdx] || [] : []
  const dataRowsRaw = rows.slice(hasHeader ? startIdx + 1 : startIdx)
  const width = effectiveWidth(hasHeader ? [headerCells, ...dataRowsRaw] : dataRowsRaw)
  const headers = makeUniqueHeaders(headerCells, width)
  const data = new Array(dataRowsRaw.length)
  for (let r = 0; r < dataRowsRaw.length; r += 1) {
    const src = dataRowsRaw[r] || []
    const out = new Array(width)
    for (let c = 0; c < width; c += 1) out[c] = toCellString(src[c])
    data[r] = out
  }
  return { headers, rows: data, width, firstDataRow: (hasHeader ? startIdx + 2 : startIdx + 1) }
}

/** Mengambil beberapa contoh nilai yang tidak kosong dari satu kolom sumber. */
export function sampleValues(source, sourceIndex, limit = 3, scanLimit = 500) {
  const samples = []
  const rows = source?.rows || []
  const max = Math.min(rows.length, scanLimit)
  for (let r = 0; r < max && samples.length < limit; r += 1) {
    const v = rows[r][sourceIndex]
    if (!isEmptyValue(v)) samples.push(v)
  }
  return samples
}

/** Apakah kolom sumber memiliki setidaknya satu nilai. */
export function columnHasData(source, sourceIndex) {
  const rows = source?.rows || []
  for (let r = 0; r < rows.length; r += 1) {
    if (!isEmptyValue(rows[r][sourceIndex])) return true
  }
  return false
}

// ---------------------------------------------------------------------------
// Konfigurasi kolom keluaran
// ---------------------------------------------------------------------------

export function sourceColumnId(index) {
  return `src-${index}`
}

/** Kolom keluaran default: satu kolom untuk setiap kolom sumber, nama sama, aktif. */
export function createColumnsFromHeaders(headers = []) {
  return headers.map((h) => ({
    id: sourceColumnId(h.index),
    type: 'source',
    sourceIndex: h.index,
    source: h.label,
    target: h.label,
    enabled: true,
  }))
}

/** Kolom manual (tidak ada di sumber) dengan nilai kosong atau nilai tetap. */
export function createStaticColumn(target = 'kolom_baru', value = '') {
  return { id: uid('static'), type: 'static', target, value, enabled: true }
}

// ---------------------------------------------------------------------------
// Operasi cleaning
// ---------------------------------------------------------------------------

export const CLEANING_OPERATIONS = {
  trim: {
    label: 'Trim',
    description: 'Menghapus spasi di awal dan akhir teks, serta spasi ganda di tengah (opsional).',
    kind: 'cell',
    defaults: { collapseSpaces: false },
  },
  uppercase: {
    label: 'Uppercase',
    description: 'Mengubah teks menjadi HURUF BESAR.',
    kind: 'cell',
    defaults: {},
  },
  lowercase: {
    label: 'Lowercase',
    description: 'Mengubah teks menjadi huruf kecil.',
    kind: 'cell',
    defaults: {},
  },
  capitalize: {
    label: 'Capitalize',
    description: 'Mengubah awal setiap kata menjadi huruf kapital (Contoh: "budi santoso" → "Budi Santoso").',
    kind: 'cell',
    defaults: {},
  },
  replace: {
    label: 'Replace',
    description: 'Mengganti teks atau nilai tertentu.',
    kind: 'cell',
    defaults: { find: '', replaceWith: '', matchCase: false, wholeCell: false },
  },
  fillEmpty: {
    label: 'Nilai kosong',
    description: 'Mengganti sel kosong dengan nilai tertentu. Angka 0 tidak dianggap kosong.',
    kind: 'cell',
    defaults: { value: '-' },
  },
  removeEmptyRows: {
    label: 'Hapus baris kosong',
    description: 'Menghapus baris yang seluruh selnya kosong (kolom manual bernilai tetap diabaikan saat pengecekan).',
    kind: 'row',
    defaults: {},
  },
  removeDuplicates: {
    label: 'Hapus duplikat',
    description: 'Menghapus baris duplikat berdasarkan kolom pembanding. Baris pertama dipertahankan.',
    kind: 'row',
    defaults: { matchCase: false, ignoreWhitespace: true },
  },
}

export function createRule(operation, columns = []) {
  const def = CLEANING_OPERATIONS[operation]
  if (!def) throw new Error(`Operasi cleaning tidak dikenal: ${operation}`)
  return {
    id: uid('rule'),
    operation,
    enabled: true,
    // [] berarti semua kolom keluaran yang aktif
    columns: [...columns],
    params: { ...def.defaults },
  }
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function capitalizeWords(text) {
  return text
    .toLocaleLowerCase('id-ID')
    .replace(/(^|[\s\-/([{"])(\p{L})/gu, (_, sep, ch) => sep + ch.toLocaleUpperCase('id-ID'))
}

/** Membuat fungsi transformasi sel untuk operasi bertipe "cell". */
function cellOperation(rule) {
  const p = rule.params || {}
  switch (rule.operation) {
    case 'trim':
      return p.collapseSpaces
        ? (v) => v.replace(/\s+/g, ' ').trim()
        : (v) => v.trim()
    case 'uppercase':
      return (v) => v.toLocaleUpperCase('id-ID')
    case 'lowercase':
      return (v) => v.toLocaleLowerCase('id-ID')
    case 'capitalize':
      return (v) => capitalizeWords(v)
    case 'replace': {
      const find = String(p.find ?? '')
      const replaceWith = String(p.replaceWith ?? '')
      if (p.wholeCell) {
        if (p.matchCase) return (v) => (v === find ? replaceWith : v)
        const needle = find.toLocaleLowerCase('id-ID')
        return (v) => (v.toLocaleLowerCase('id-ID') === needle ? replaceWith : v)
      }
      if (find === '') return null
      if (p.matchCase) return (v) => v.split(find).join(replaceWith)
      const re = new RegExp(escapeRegExp(find), 'giu')
      return (v) => v.replace(re, () => replaceWith)
    }
    case 'fillEmpty': {
      const value = String(p.value ?? '')
      return (v) => (isEmptyValue(v) ? value : v)
    }
    default:
      return null
  }
}

/** Menerjemahkan daftar ID kolom dari rule menjadi indeks kolom keluaran. */
function resolveColumnIndexes(ruleColumns, idToIndex, total) {
  if (!Array.isArray(ruleColumns) || ruleColumns.length === 0) {
    return Array.from({ length: total }, (_, i) => i)
  }
  const out = []
  for (const id of ruleColumns) {
    if (idToIndex.has(id)) out.push(idToIndex.get(id))
  }
  return out
}

// ---------------------------------------------------------------------------
// Transformasi utama
// ---------------------------------------------------------------------------

/**
 * Menjalankan mapping + cleaning. Data sumber tidak diubah.
 * @returns {{
 *   headers: string[], columns: object[], rows: string[][],
 *   stats: object, ruleResults: Record<string, {affected: number, skipped?: boolean}>
 * }}
 */
export function transform(source, columns = [], rules = []) {
  const srcRows = source?.rows || []
  const active = columns.filter((c) => c.enabled)
  const headers = active.map((c) => String(c.target ?? '').trim())
  const idToIndex = new Map(active.map((c, i) => [c.id, i]))

  // 1. Column mapping
  let rows = new Array(srcRows.length)
  for (let r = 0; r < srcRows.length; r += 1) {
    const src = srcRows[r]
    const out = new Array(active.length)
    for (let c = 0; c < active.length; c += 1) {
      const col = active[c]
      out[c] = col.type === 'static' ? String(col.value ?? '') : (src[col.sourceIndex] ?? '')
    }
    rows[r] = out
  }

  const stats = {
    sourceRows: srcRows.length,
    resultRows: 0,
    resultColumns: active.length,
    emptyRowsRemoved: 0,
    duplicatesRemoved: 0,
    cellsChanged: 0,
    usedEmptyRowRule: false,
    usedDuplicateRule: false,
  }
  const ruleResults = {}

  // 2. Cleaning (berurutan)
  for (const rule of rules) {
    if (!rule || rule.enabled === false || !CLEANING_OPERATIONS[rule.operation]) continue
    const def = CLEANING_OPERATIONS[rule.operation]
    const indexes = resolveColumnIndexes(rule.columns, idToIndex, active.length)

    if (def.kind === 'cell') {
      const fn = cellOperation(rule)
      if (!fn || indexes.length === 0) {
        ruleResults[rule.id] = { affected: 0, skipped: true }
        continue
      }
      let affected = 0
      for (let r = 0; r < rows.length; r += 1) {
        const row = rows[r]
        for (const c of indexes) {
          const before = row[c]
          const after = fn(before)
          if (after !== before) {
            row[c] = after
            affected += 1
          }
        }
      }
      stats.cellsChanged += affected
      ruleResults[rule.id] = { affected }
      continue
    }

    if (rule.operation === 'removeEmptyRows') {
      stats.usedEmptyRowRule = true
      // Kolom manual bernilai tetap diabaikan agar tidak membuat baris kosong terlihat "berisi".
      let checkIdx = active.map((c, i) => (c.type === 'source' ? i : -1)).filter((i) => i >= 0)
      if (checkIdx.length === 0) checkIdx = active.map((_, i) => i)
      const before = rows.length
      rows = rows.filter((row) => !checkIdx.every((c) => isEmptyValue(row[c])))
      const removed = before - rows.length
      stats.emptyRowsRemoved += removed
      ruleResults[rule.id] = { affected: removed }
      continue
    }

    if (rule.operation === 'removeDuplicates') {
      stats.usedDuplicateRule = true
      if (indexes.length === 0) {
        ruleResults[rule.id] = { affected: 0, skipped: true }
        continue
      }
      const p = rule.params || {}
      const norm = (v) => {
        let s = String(v ?? '')
        if (p.ignoreWhitespace !== false) s = s.replace(/\s+/g, ' ').trim()
        if (!p.matchCase) s = s.toLocaleLowerCase('id-ID')
        return s
      }
      const seen = new Set()
      const before = rows.length
      rows = rows.filter((row) => {
        const key = indexes.map((c) => norm(row[c])).join('\u0001')
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      const removed = before - rows.length
      stats.duplicatesRemoved += removed
      ruleResults[rule.id] = { affected: removed }
    }
  }

  stats.resultRows = rows.length
  return { headers, columns: active, rows, stats, ruleResults }
}

// ---------------------------------------------------------------------------
// Validasi
// ---------------------------------------------------------------------------

/**
 * Memvalidasi konfigurasi mapping & cleaning.
 * errors  -> memblokir ekspor
 * warnings -> informasi potensi kehilangan data / konfigurasi tidak efektif
 */
export function validateConfig(source, columns = [], rules = []) {
  const errors = []
  const warnings = []
  const active = columns.filter((c) => c.enabled)

  if (!source || !source.headers || source.headers.length === 0) {
    errors.push('Data sumber tidak memiliki kolom. Periksa sheet atau baris header yang dipilih.')
  }

  if (active.length === 0) {
    errors.push('Belum ada kolom keluaran yang digunakan. Aktifkan minimal satu kolom.')
  }

  const describe = (c) => (c.type === 'static' ? `kolom manual "${c.target || '(tanpa nama)'}"` : `"${c.source}"`)

  for (const c of active) {
    if (String(c.target ?? '').trim() === '') {
      errors.push(`Kolom sumber ${describe(c)} belum memiliki nama kolom keluaran.`)
    }
  }

  const byName = new Map()
  for (const c of active) {
    const key = String(c.target ?? '').trim().toLowerCase()
    if (!key) continue
    if (!byName.has(key)) byName.set(key, [])
    byName.get(key).push(c)
  }
  for (const [, list] of byName) {
    if (list.length > 1) {
      errors.push(
        `Nama kolom keluaran "${list[0].target.trim()}" dipakai oleh ${list.length} kolom (${list
          .map(describe)
          .join(', ')}). DataFlex tidak menggabungkan kolom secara diam-diam — gunakan nama yang berbeda atau abaikan salah satunya.`,
      )
    }
  }

  if (source?.rows?.length === 0) {
    warnings.push('Data sumber tidak memiliki baris data (hanya header atau kosong).')
  }

  const skippedWithData = columns.filter(
    (c) => c.type === 'source' && !c.enabled && columnHasData(source, c.sourceIndex),
  )
  if (skippedWithData.length > 0) {
    warnings.push(
      `${skippedWithData.length} kolom sumber berisi data diabaikan dan tidak akan diekspor: ${skippedWithData
        .map((c) => `"${c.source}"`)
        .join(', ')}.`,
    )
  }

  const activeIds = new Set(active.map((c) => c.id))
  const allIds = new Map(columns.map((c) => [c.id, c]))
  rules.forEach((rule, i) => {
    if (!rule || rule.enabled === false) return
    const def = CLEANING_OPERATIONS[rule.operation]
    const label = `Operasi #${i + 1} (${def?.label || rule.operation})`
    if (!def) {
      warnings.push(`${label} tidak dikenal dan akan dilewati.`)
      return
    }
    if (Array.isArray(rule.columns) && rule.columns.length > 0) {
      const missing = rule.columns.filter((id) => !activeIds.has(id))
      if (missing.length === rule.columns.length) {
        warnings.push(`${label} tidak memiliki kolom aktif sehingga tidak berpengaruh.`)
      } else if (missing.length > 0) {
        const names = missing.map((id) => allIds.get(id)?.target || allIds.get(id)?.source || id)
        warnings.push(`${label} merujuk kolom yang tidak aktif/terhapus: ${names.join(', ')}.`)
      }
    }
    if (rule.operation === 'replace' && !rule.params?.wholeCell && String(rule.params?.find ?? '') === '') {
      warnings.push(`${label}: teks yang dicari masih kosong sehingga operasi dilewati.`)
    }
  })

  return { errors, warnings, valid: errors.length === 0 }
}


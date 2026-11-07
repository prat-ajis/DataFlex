/**
 * templateStorage
 * ---------------
 * Menyimpan template mapping di browser (IndexedDB, fallback LocalStorage).
 * Template HANYA berisi konfigurasi (header sumber, nama kolom keluaran, urutan,
 * status kolom, operasi cleaning, preferensi ekspor) — bukan isi spreadsheet.
 */
import { CLEANING_OPERATIONS, sourceColumnId } from './transformService.js'
import { clone, downloadBlob, sanitizeFileName, uid } from './utils.js'

const DB_NAME = 'dataflex'
const DB_VERSION = 1
const STORE = 'templates'
const LS_KEY = 'dataflex.templates'
export const TEMPLATE_SCHEMA = 'dataflex-template'
export const TEMPLATE_VERSION = 1

// ---------------------------------------------------------------------------
// Validasi & normalisasi
// ---------------------------------------------------------------------------

const str = (v, max = 500) => String(v ?? '').slice(0, max)

function sanitizeColumn(col) {
  if (!col || typeof col !== 'object') return null
  const type = col.type === 'static' ? 'static' : 'source'
  const base = {
    id: str(col.id, 100) || uid(type === 'static' ? 'static' : 'col'),
    type,
    target: str(col.target, 200),
    enabled: col.enabled !== false,
  }
  if (type === 'static') return { ...base, value: str(col.value, 1000) }
  const source = str(col.source, 300)
  if (!source) return null
  return { ...base, source }
}

function sanitizeRule(rule) {
  if (!rule || typeof rule !== 'object' || !CLEANING_OPERATIONS[rule.operation]) return null
  const defaults = CLEANING_OPERATIONS[rule.operation].defaults
  const params = {}
  for (const key of Object.keys(defaults)) {
    const v = rule.params?.[key]
    params[key] = typeof defaults[key] === 'boolean' ? Boolean(v ?? defaults[key]) : str(v ?? defaults[key], 1000)
  }
  return {
    id: str(rule.id, 100) || uid('rule'),
    operation: rule.operation,
    enabled: rule.enabled !== false,
    columns: Array.isArray(rule.columns) ? rule.columns.map((c) => str(c, 100)).filter(Boolean) : [],
    params,
  }
}

function sanitizeExport(exp = {}) {
  const format = ['xlsx', 'csv', 'tsv'].includes(exp.format) ? exp.format : 'xlsx'
  const delimiter = [',', ';', '\t', '|'].includes(exp.delimiter) ? exp.delimiter : ','
  return {
    format,
    delimiter,
    bom: exp.bom !== false,
    formulaGuard: exp.formulaGuard !== false,
    numberMode: exp.numberMode === 'text' ? 'text' : 'auto',
  }
}

/**
 * Memvalidasi objek template (mis. dari file JSON impor).
 * Melempar Error jika struktur tidak valid.
 */
export function sanitizeTemplate(raw, { keepId = true } = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Format template tidak valid.')
  }
  const name = str(raw.name, 120).trim()
  if (!name) throw new Error('Template harus memiliki nama.')
  const columns = (Array.isArray(raw.columns) ? raw.columns : []).map(sanitizeColumn).filter(Boolean)
  if (columns.length === 0) throw new Error(`Template "${name}" tidak memiliki kolom yang valid.`)

  // Pastikan ID kolom unik.
  const seen = new Set()
  for (const c of columns) {
    if (seen.has(c.id)) c.id = uid(c.type === 'static' ? 'static' : 'col')
    seen.add(c.id)
  }

  const now = new Date().toISOString()
  return {
    schema: TEMPLATE_SCHEMA,
    version: TEMPLATE_VERSION,
    id: keepId && raw.id ? str(raw.id, 100) : uid('tpl'),
    name,
    description: str(raw.description, 500),
    headerRow: Math.max(1, Math.min(1000, Math.floor(Number(raw.headerRow) || 1))),
    hasHeader: raw.hasHeader !== false,
    sourceHeaders: (Array.isArray(raw.sourceHeaders) ? raw.sourceHeaders : columns.filter((c) => c.type === 'source').map((c) => c.source))
      .map((h) => str(h, 300))
      .slice(0, 2000),
    columns,
    cleaningRules: (Array.isArray(raw.cleaningRules) ? raw.cleaningRules : []).map(sanitizeRule).filter(Boolean),
    export: sanitizeExport(raw.export),
    createdAt: raw.createdAt && !Number.isNaN(Date.parse(raw.createdAt)) ? raw.createdAt : now,
    updatedAt: raw.updatedAt && !Number.isNaN(Date.parse(raw.updatedAt)) ? raw.updatedAt : now,
  }
}

/** Membuat template dari sesi konversi yang sedang berjalan. */
export function buildTemplateFromSession({ name, description = '', headers, columns, rules, headerRow, hasHeader, exportOptions, id }) {
  // ID kolom sumber diganti menjadi berbasis nama agar tidak bergantung pada posisi kolom.
  const idMap = new Map()
  const cols = columns.map((c, i) => {
    if (c.type === 'static') return { id: c.id, type: 'static', target: c.target, value: c.value ?? '', enabled: c.enabled }
    const newId = `col-${i + 1}`
    idMap.set(c.id, newId)
    return { id: newId, type: 'source', source: c.source, target: c.target, enabled: c.enabled }
  })
  const cleaningRules = rules.map((r) => ({
    ...clone(r),
    columns: (r.columns || []).map((cid) => idMap.get(cid) ?? cid),
  }))
  return sanitizeTemplate(
    {
      id: id || uid('tpl'),
      name,
      description,
      headerRow,
      hasHeader,
      sourceHeaders: headers.map((h) => h.label),
      columns: cols,
      cleaningRules,
      export: exportOptions,
    },
    { keepId: true },
  )
}

const normalizeHeader = (h) => String(h ?? '').replace(/\s+/g, ' ').trim().toLowerCase()

/**
 * Mencocokkan template dengan header file saat ini.
 * @returns {{missing: string[], extra: string[], matched: number}}
 */
export function checkTemplateMatch(template, headers) {
  const available = new Set(headers.map((h) => normalizeHeader(h.label)))
  const used = new Set()
  const missing = []
  let matched = 0
  for (const c of template.columns) {
    if (c.type !== 'source') continue
    const key = normalizeHeader(c.source)
    if (available.has(key)) {
      matched += 1
      used.add(key)
    } else missing.push(c.source)
  }
  const extra = headers.filter((h) => !used.has(normalizeHeader(h.label))).map((h) => h.label)
  return { missing, extra, matched }
}

/**
 * Menerapkan template ke header file saat ini.
 * - Kolom template yang tidak ditemukan di file dilewati.
 * - Kolom file yang tidak ada di template ditambahkan di akhir dalam keadaan diabaikan.
 */
export function applyTemplate(template, headers) {
  const byLabel = new Map()
  for (const h of headers) {
    const key = normalizeHeader(h.label)
    if (!byLabel.has(key)) byLabel.set(key, h)
  }
  const idMap = new Map()
  const usedIndexes = new Set()
  const columns = []
  const missing = []
  for (const c of template.columns) {
    if (c.type === 'static') {
      const id = uid('static')
      idMap.set(c.id, id)
      columns.push({ id, type: 'static', target: c.target, value: c.value ?? '', enabled: c.enabled })
      continue
    }
    const h = byLabel.get(normalizeHeader(c.source))
    if (!h || usedIndexes.has(h.index)) {
      missing.push(c.source)
      continue
    }
    usedIndexes.add(h.index)
    const id = sourceColumnId(h.index)
    idMap.set(c.id, id)
    columns.push({ id, type: 'source', sourceIndex: h.index, source: h.label, target: c.target, enabled: c.enabled })
  }
  const extra = []
  for (const h of headers) {
    if (usedIndexes.has(h.index)) continue
    extra.push(h.label)
    columns.push({ id: sourceColumnId(h.index), type: 'source', sourceIndex: h.index, source: h.label, target: h.label, enabled: false })
  }
  const rules = template.cleaningRules.map((r) => ({
    ...clone(r),
    id: uid('rule'),
    // Kolom yang tidak ditemukan dibuang dari rule. Jika rule awalnya spesifik namun kini
    // tidak memiliki kolom, rule dinonaktifkan agar tidak berubah menjadi "semua kolom".
    columns: (r.columns || []).map((cid) => idMap.get(cid)).filter(Boolean),
    enabled: r.enabled !== false && !((r.columns || []).length > 0 && (r.columns || []).every((cid) => !idMap.has(cid))),
  }))
  return { columns, rules, missing, extra }
}

// ---------------------------------------------------------------------------
// Penyimpanan
// ---------------------------------------------------------------------------

let dbPromise = null

function hasIndexedDB() {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}

function openDb() {
  if (!hasIndexedDB()) return Promise.resolve(null)
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      let req
      try {
        req = indexedDB.open(DB_NAME, DB_VERSION)
      } catch {
        resolve(null)
        return
      }
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
      req.onblocked = () => resolve(null)
    })
  }
  return dbPromise
}

function idbRequest(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const store = tx.objectStore(STORE)
    const req = fn(store)
    tx.oncomplete = () => resolve(req?.result)
    tx.onerror = () => reject(tx.error || new Error('Gagal mengakses penyimpanan lokal.'))
    tx.onabort = () => reject(tx.error || new Error('Operasi penyimpanan dibatalkan.'))
  })
}

function lsRead() {
  try {
    const data = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function lsWrite(list) {
  localStorage.setItem(LS_KEY, JSON.stringify(list))
}

export async function listTemplates() {
  const db = await openDb()
  const list = db ? await idbRequest(db, 'readonly', (s) => s.getAll()) : lsRead()
  return (list || [])
    .map((t) => {
      try {
        return sanitizeTemplate(t)
      } catch {
        return null
      }
    })
    .filter(Boolean)
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
}

export async function getTemplate(id) {
  const db = await openDb()
  const raw = db ? await idbRequest(db, 'readonly', (s) => s.get(id)) : lsRead().find((t) => t.id === id)
  return raw ? sanitizeTemplate(raw) : null
}

export async function saveTemplate(template) {
  const clean = sanitizeTemplate({ ...template, updatedAt: new Date().toISOString() })
  const db = await openDb()
  if (db) {
    await idbRequest(db, 'readwrite', (s) => s.put(clean))
  } else {
    const list = lsRead().filter((t) => t.id !== clean.id)
    list.push(clean)
    lsWrite(list)
  }
  return clean
}

export async function deleteTemplate(id) {
  const db = await openDb()
  if (db) await idbRequest(db, 'readwrite', (s) => s.delete(id))
  else lsWrite(lsRead().filter((t) => t.id !== id))
}

/** Mengunduh satu atau beberapa template sebagai file JSON. */
export function exportTemplatesToJson(templates, fileName) {
  const list = Array.isArray(templates) ? templates : [templates]
  const payload = list.length === 1 ? list[0] : { schema: `${TEMPLATE_SCHEMA}-bundle`, version: TEMPLATE_VERSION, templates: list }
  const name = `${sanitizeFileName(fileName || (list.length === 1 ? `template_${list[0].name}` : 'dataflex_templates'))}.json`
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), name)
}

/**
 * Membaca file JSON template (satu template atau bundle).
 * Template yang diimpor selalu mendapat ID baru agar tidak menimpa template yang sudah ada.
 */
export async function parseTemplateFile(file) {
  if (file.size > 5 * 1024 * 1024) throw new Error('File template terlalu besar (maks. 5 MB).')
  let data
  try {
    data = JSON.parse(await file.text())
  } catch {
    throw new Error('File bukan JSON yang valid.')
  }
  const list = Array.isArray(data) ? data : Array.isArray(data?.templates) ? data.templates : [data]
  if (list.length === 0) throw new Error('File tidak berisi template.')
  return list.map((t) => sanitizeTemplate({ ...t, createdAt: undefined, updatedAt: undefined }, { keepId: false }))
}


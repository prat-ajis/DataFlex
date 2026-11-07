/**
 * Utilitas umum yang tidak bergantung pada framework.
 */

let counter = 0

/** Membuat ID unik sederhana (cukup untuk kebutuhan state lokal). */
export function uid(prefix = 'id') {
  counter += 1
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}${rand}`
}

/** Format ukuran file menjadi teks yang mudah dibaca. */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '-'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i += 1
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[i]}`
}

/** Format angka dengan pemisah ribuan gaya Indonesia. */
export function formatNumber(n) {
  return new Intl.NumberFormat('id-ID').format(n ?? 0)
}

/** Format tanggal ISO menjadi teks lokal. */
export function formatDateTime(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

/** Ekstensi file (huruf kecil, tanpa titik). */
export function getExtension(name = '') {
  const idx = name.lastIndexOf('.')
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : ''
}

/** Nama file tanpa ekstensi. */
export function stripExtension(name = '') {
  const idx = name.lastIndexOf('.')
  return idx > 0 ? name.slice(0, idx) : name
}

/** Membersihkan nama file dari karakter yang tidak valid di sistem operasi umum. */
export function sanitizeFileName(name, fallback = 'dataflex_export') {
  const cleaned = String(name ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
  return cleaned.slice(0, 150) || fallback
}

/** Mengubah teks menjadi snake_case (mendukung karakter non-ASCII dengan menghapus diakritik). */
export function toSnakeCase(text) {
  return String(text ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/** Memicu unduhan Blob di browser. */
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Deep clone untuk objek konfigurasi biasa (JSON-safe). */
export function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

/** Memberi kesempatan browser untuk merender (mis. indikator loading) sebelum pekerjaan berat. */
export function nextFrame() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => setTimeout(resolve, 0))
    } else {
      setTimeout(resolve, 0)
    }
  })
}


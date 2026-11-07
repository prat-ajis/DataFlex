<script setup>
import { computed, ref } from 'vue'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CaseSensitive,
  Eye,
  EyeOff,
  GripVertical,
  LayoutTemplate,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from '@lucide/vue'
import ValidationSummary from '@/components/ValidationSummary.vue'
import { useConverterSession } from '@/composables/useConverterSession.js'
import { useDialog } from '@/composables/useDialog.js'
import { createStaticColumn, sampleValues } from '@/services/transformService.js'
import { toSnakeCase } from '@/services/utils.js'

const props = defineProps({
  templates: { type: Array, default: () => [] },
})
const emit = defineEmits(['next', 'back', 'apply-template', 'save-template'])

const { state, source, validation, resetMapping } = useConverterSession()
const { confirm } = useDialog()

const selectedTemplateId = ref('')

const samples = computed(() => {
  const map = new Map()
  for (const h of source.value.headers) map.set(h.index, sampleValues(source.value, h.index, 3))
  return map
})

const counts = computed(() => {
  const enabled = state.columns.filter((c) => c.enabled).length
  return { enabled, skipped: state.columns.length - enabled }
})

/** ID kolom yang namanya bermasalah (kosong / duplikat) untuk highlight. */
const problemIds = computed(() => {
  const ids = new Set()
  const byName = new Map()
  for (const c of state.columns) {
    if (!c.enabled) continue
    const key = String(c.target ?? '').trim().toLowerCase()
    if (!key) {
      ids.add(c.id)
      continue
    }
    if (!byName.has(key)) byName.set(key, [])
    byName.get(key).push(c.id)
  }
  for (const list of byName.values()) if (list.length > 1) list.forEach((id) => ids.add(id))
  return ids
})

const outputOrder = computed(() => {
  const map = new Map()
  let n = 0
  for (const c of state.columns) if (c.enabled) map.set(c.id, ++n)
  return map
})

function move(index, delta) {
  const to = index + delta
  if (to < 0 || to >= state.columns.length) return
  const [item] = state.columns.splice(index, 1)
  state.columns.splice(to, 0, item)
}

function addColumn() {
  const existing = new Set(state.columns.map((c) => String(c.target).toLowerCase()))
  let name = 'kolom_baru'
  let i = 2
  while (existing.has(name)) name = `kolom_baru_${i++}`
  state.columns.push(createStaticColumn(name, ''))
}

function removeColumn(index) {
  const col = state.columns[index]
  state.columns.splice(index, 1)
  // Bersihkan referensi di rule cleaning.
  for (const r of state.rules) r.columns = r.columns.filter((id) => id !== col.id)
}

function setAll(enabled) {
  state.columns.forEach((c) => (c.enabled = enabled))
}

function snakeCaseAll() {
  state.columns.forEach((c) => {
    const s = toSnakeCase(c.target)
    if (s) c.target = s
  })
}

async function reset() {
  const ok = await confirm({
    title: 'Reset mapping?',
    message: 'Mapping, kolom manual, dan operasi cleaning akan dikembalikan ke kondisi awal.',
    confirmText: 'Reset',
    tone: 'warning',
  })
  if (ok) resetMapping()
}

function applySelected() {
  if (!selectedTemplateId.value) return
  emit('apply-template', selectedTemplateId.value)
  selectedTemplateId.value = ''
}

// ---- Drag & drop ----
const dragIndex = ref(-1)
const overIndex = ref(-1)
function onDragStart(e, index) {
  dragIndex.value = index
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', String(index))
}
function onDragOver(index) {
  if (dragIndex.value < 0) return
  overIndex.value = index
}
function onDrop(index) {
  const from = dragIndex.value
  if (from >= 0 && from !== index) {
    const [item] = state.columns.splice(from, 1)
    state.columns.splice(index, 0, item)
  }
  onDragEnd()
}
function onDragEnd() {
  dragIndex.value = -1
  overIndex.value = -1
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 class="section-title">Dynamic Column Mapping</h2>
        <p class="section-desc">
          Tentukan nama kolom keluaran, abaikan kolom yang tidak diperlukan, dan atur urutannya (seret atau gunakan tombol panah).
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <select v-model="selectedTemplateId" class="input w-56" aria-label="Pilih template" :disabled="!props.templates.length">
          <option value="">{{ props.templates.length ? 'Gunakan template…' : 'Belum ada template' }}</option>
          <option v-for="t in props.templates" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
        <button class="btn btn-secondary" :disabled="!selectedTemplateId" @click="applySelected">
          <LayoutTemplate class="h-4 w-4" /> Terapkan
        </button>
        <button class="btn btn-secondary" @click="emit('save-template')"><Save class="h-4 w-4" /> Simpan template</button>
      </div>
    </div>

    <div
      v-if="state.appliedTemplate"
      class="flex flex-wrap items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800"
    >
      <LayoutTemplate class="h-4 w-4" />
      Template <b>{{ state.appliedTemplate.name }}</b> diterapkan.
      <span v-if="state.appliedTemplate.missing.length" class="text-amber-700">
        {{ state.appliedTemplate.missing.length }} kolom template tidak ditemukan.
      </span>
      <span v-if="state.appliedTemplate.extra.length" class="text-slate-600">
        {{ state.appliedTemplate.extra.length }} kolom baru di file ditambahkan dalam keadaan diabaikan.
      </span>
    </div>

    <div class="card">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div class="text-sm text-slate-600">
          <b class="text-slate-900">{{ counts.enabled }}</b> kolom digunakan ·
          <b class="text-slate-900">{{ counts.skipped }}</b> diabaikan
        </div>
        <div class="flex flex-wrap gap-1">
          <button class="btn btn-sm btn-ghost" @click="setAll(true)"><Eye class="h-3.5 w-3.5" /> Gunakan semua</button>
          <button class="btn btn-sm btn-ghost" @click="setAll(false)"><EyeOff class="h-3.5 w-3.5" /> Abaikan semua</button>
          <button class="btn btn-sm btn-ghost" title="Ubah semua nama keluaran menjadi snake_case" @click="snakeCaseAll">
            <CaseSensitive class="h-3.5 w-3.5" /> snake_case
          </button>
          <button class="btn btn-sm btn-ghost" @click="reset"><RotateCcw class="h-3.5 w-3.5" /> Reset</button>
          <button class="btn btn-sm btn-primary" @click="addColumn"><Plus class="h-3.5 w-3.5" /> Tambah kolom</button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
            <tr>
              <th class="w-16 px-3 py-2 text-left">Urutan</th>
              <th class="w-20 px-3 py-2 text-left">Gunakan</th>
              <th class="px-3 py-2 text-left">Kolom sumber</th>
              <th class="px-3 py-2 text-left">Preview nilai</th>
              <th class="min-w-56 px-3 py-2 text-left">Kolom keluaran</th>
              <th class="w-28 px-3 py-2 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(col, index) in state.columns"
              :key="col.id"
              class="border-t border-slate-100 transition"
              :class="[
                !col.enabled ? 'bg-slate-50/80 text-slate-400' : '',
                overIndex === index && dragIndex !== index ? 'bg-brand-50 outline-2 -outline-offset-2 outline-brand-300' : '',
                dragIndex === index ? 'opacity-40' : '',
              ]"
              @dragover.prevent="onDragOver(index)"
              @drop.prevent="onDrop(index)"
            >
              <td class="px-3 py-2">
                <div class="flex items-center gap-1">
                  <span
                    class="cursor-grab text-slate-400 hover:text-slate-600 active:cursor-grabbing"
                    draggable="true"
                    title="Seret untuk mengubah urutan"
                    @dragstart="onDragStart($event, index)"
                    @dragend="onDragEnd"
                  >
                    <GripVertical class="h-4 w-4" />
                  </span>
                  <span class="w-5 text-center font-mono text-xs" :class="col.enabled ? 'text-slate-700' : 'text-slate-300'">
                    {{ outputOrder.get(col.id) || '–' }}
                  </span>
                </div>
              </td>
              <td class="px-3 py-2">
                <label class="inline-flex cursor-pointer items-center gap-2">
                  <input v-model="col.enabled" type="checkbox" class="checkbox" :aria-label="`Gunakan kolom ${col.source || col.target}`" />
                  <span class="text-xs">{{ col.enabled ? 'Ya' : 'Abaikan' }}</span>
                </label>
              </td>
              <td class="max-w-56 px-3 py-2">
                <template v-if="col.type === 'source'">
                  <div class="truncate font-medium" :class="col.enabled ? 'text-slate-800' : ''" :title="col.source">{{ col.source }}</div>
                </template>
                <span v-else class="badge bg-violet-100 text-violet-700">Kolom manual</span>
              </td>
              <td class="max-w-64 px-3 py-2">
                <template v-if="col.type === 'source'">
                  <div v-if="samples.get(col.sourceIndex)?.length" class="flex flex-wrap gap-1">
                    <span
                      v-for="(v, i) in samples.get(col.sourceIndex)"
                      :key="i"
                      class="max-w-40 truncate rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600"
                      :title="v"
                    >{{ v }}</span>
                  </div>
                  <span v-else class="text-xs text-slate-400 italic">(kosong)</span>
                </template>
                <input
                  v-else
                  v-model.lazy="col.value"
                  class="input input-sm"
                  placeholder="Nilai tetap (kosongkan = sel kosong)"
                  :aria-label="`Nilai tetap untuk ${col.target}`"
                />
              </td>
              <td class="px-3 py-2">
                <input
                  v-model.lazy="col.target"
                  class="input input-sm"
                  :class="problemIds.has(col.id) ? 'border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-rose-200' : ''"
                  :disabled="!col.enabled"
                  placeholder="Nama kolom keluaran"
                  :aria-label="`Nama kolom keluaran untuk ${col.source || 'kolom manual'}`"
                />
              </td>
              <td class="px-3 py-2">
                <div class="flex justify-end">
                  <button class="btn-icon" :disabled="index === 0" aria-label="Naikkan" title="Naikkan" @click="move(index, -1)">
                    <ArrowUp class="h-4 w-4" />
                  </button>
                  <button
                    class="btn-icon"
                    :disabled="index === state.columns.length - 1"
                    aria-label="Turunkan"
                    title="Turunkan"
                    @click="move(index, 1)"
                  >
                    <ArrowDown class="h-4 w-4" />
                  </button>
                  <button
                    v-if="col.type === 'static'"
                    class="btn-icon hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Hapus kolom"
                    title="Hapus kolom manual"
                    @click="removeColumn(index)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <ValidationSummary :errors="validation.errors" :warnings="validation.warnings" compact />

    <div class="flex justify-between">
      <button class="btn btn-secondary" @click="emit('back')"><ArrowLeft class="h-4 w-4" /> Kembali</button>
      <button class="btn btn-primary" :disabled="counts.enabled === 0" @click="emit('next')">
        Lanjut ke Cleaning <ArrowRight class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>


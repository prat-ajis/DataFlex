<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Download,
  FileJson,
  LayoutTemplate,
  Play,
  Plus,
  Trash2,
  Upload,
} from '@lucide/vue'
import EmptyState from '@/components/EmptyState.vue'
import { useDialog } from '@/composables/useDialog.js'
import { useTemplates } from '@/composables/useTemplates.js'
import { useToast } from '@/composables/useToast.js'
import { formatDateTime } from '@/services/utils.js'

const router = useRouter()
const {
  templates,
  status,
  refresh,
  remove,
  importFile,
  exportJson,
  exportAll,
} = useTemplates()
const { confirm } = useDialog()
const toast = useToast()

const fileInput = ref(null)

onMounted(() => {
  refresh()
})

function useTpl(id) {
  router.push({ path: '/convert', query: { template: id } })
}

async function handleDelete(tpl) {
  const ok = await confirm({
    title: `Hapus template "${tpl.name}"?`,
    message: 'Template ini akan dihapus secara permanen dari penyimpanan browser Anda.',
    confirmText: 'Hapus',
    tone: 'danger',
  })
  if (ok) {
    await remove(tpl.id)
    toast.success('Template berhasil dihapus.')
  }
}

function handleExportOne(tpl) {
  exportJson(tpl)
}

function triggerImport() {
  fileInput.value?.click()
}

async function handleFileImport(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const list = await importFile(file)
    toast.success(`Berhasil mengimpor ${list.length} template JSON.`)
  } catch (err) {
    toast.error(err.message || 'Gagal membaca file template JSON.')
  } finally {
    if (fileInput.value) fileInput.value.value = ''
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Template Mapping</h1>
        <p class="text-sm text-slate-500">
          Kelola konfigurasi pemetaan kolom yang tersimpan di browser untuk digunakan kembali.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <input
          ref="fileInput"
          type="file"
          accept=".json,application/json"
          class="hidden"
          @change="handleFileImport"
        />
        <button class="btn btn-secondary" @click="triggerImport">
          <Upload class="h-4 w-4" /> Impor JSON
        </button>
        <button
          class="btn btn-secondary"
          :disabled="templates.length === 0"
          @click="exportAll"
        >
          <Download class="h-4 w-4" /> Ekspor Semua JSON
        </button>
        <button class="btn btn-primary" @click="router.push('/convert')">
          <Plus class="h-4 w-4" /> Konversi Baru
        </button>
      </div>
    </div>

    <!-- State Kosong -->
    <div v-if="status.loading" class="card p-8 text-center text-sm text-slate-400">
      Memuat template...
    </div>
    <div v-else-if="templates.length === 0" class="card">
      <EmptyState
        :icon="LayoutTemplate"
        title="Belum ada template yang tersimpan"
        description="Template akan tersimpan di browser ketika Anda memilih 'Simpan template' di langkah Mapping atau Ekspor."
      >
        <button class="btn btn-primary btn-sm" @click="router.push('/convert')">
          Buat Konversi Pertama
        </button>
      </EmptyState>
    </div>

    <!-- Daftar Template -->
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="tpl in templates"
        :key="tpl.id"
        class="card flex flex-col justify-between p-5 transition hover:shadow-md"
      >
        <div class="space-y-2">
          <div class="flex items-start justify-between gap-2">
            <h3 class="font-bold text-slate-900">{{ tpl.name }}</h3>
            <span class="badge bg-brand-50 text-brand-700 font-mono text-[10px]">
              {{ tpl.columns.filter((c) => c.enabled).length }} kolom
            </span>
          </div>
          <p v-if="tpl.description" class="text-xs text-slate-600 line-clamp-3">
            {{ tpl.description }}
          </p>
          <div class="space-y-1 pt-2 text-[11px] text-slate-400">
            <div>Dibuat / Diperbarui: {{ formatDateTime(tpl.updatedAt) }}</div>
            <div>Format ekspor default: {{ tpl.export?.format?.toUpperCase() || 'XLSX' }}</div>
          </div>
        </div>

        <div class="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
          <div class="flex gap-1">
            <button
              class="btn-icon text-slate-500 hover:text-brand-600"
              title="Unduh file JSON template"
              @click="handleExportOne(tpl)"
            >
              <FileJson class="h-4 w-4" />
            </button>
            <button
              class="btn-icon text-slate-500 hover:text-rose-600"
              title="Hapus template"
              @click="handleDelete(tpl)"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
          <button class="btn btn-sm btn-primary" @click="useTpl(tpl.id)">
            <Play class="h-3.5 w-3.5" /> Gunakan
          </button>
        </div>
      </div>
    </div>
  </div>
</template>


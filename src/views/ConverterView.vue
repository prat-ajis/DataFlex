<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BaseModal from '@/components/BaseModal.vue'
import CleaningRuleEditor from '@/components/CleaningRuleEditor.vue'
import ColumnMapper from '@/components/ColumnMapper.vue'
import ExportOptions from '@/components/ExportOptions.vue'
import FileUploader from '@/components/FileUploader.vue'
import SourceStep from '@/components/SourceStep.vue'
import StepIndicator from '@/components/StepIndicator.vue'
import { STEPS, useConverterSession } from '@/composables/useConverterSession.js'
import { useDialog } from '@/composables/useDialog.js'
import { useTemplates } from '@/composables/useTemplates.js'
import { useToast } from '@/composables/useToast.js'
import { buildTemplateFromSession } from '@/services/templateStorage.js'

const route = useRoute()
const {
  state,
  source,
  hasSession,
  inspectTemplate,
  useTemplate,
} = useConverterSession()
const { templates, refresh, save } = useTemplates()
const { confirm } = useDialog()
const toast = useToast()

const showSaveModal = ref(false)
const templateName = ref('')
const templateDesc = ref('')

onMounted(async () => {
  await refresh()
  const qTpl = route.query.template
  if (qTpl && hasSession.value) {
    applyTemplateById(qTpl)
  }
})

function isStepEnabled(id) {
  if (id === 1) return true
  if (!hasSession.value) return false
  if (id === 2) return true
  if (id === 3) return source.value.headers.length > 0
  if (id === 4) return state.columns.some((c) => c.enabled)
  if (id === 5) return state.columns.some((c) => c.enabled)
  return false
}

function goToStep(id) {
  if (isStepEnabled(id)) {
    state.step = id
  }
}

async function applyTemplateById(tplId) {
  const tpl = templates.value.find((t) => t.id === tplId)
  if (!tpl) {
    toast.error('Template tidak ditemukan.')
    return
  }
  const match = inspectTemplate(tpl)
  if (match.missing.length > 0) {
    const ok = await confirm({
      title: 'Terdapat Kolom yang Tidak Cocok',
      message: `Template "${tpl.name}" memerlukan ${match.missing.length} kolom yang tidak ditemukan pada file saat ini:\n\nKolom tersebut akan dilewati. Tetap terapkan?`,
      details: match.missing,
      confirmText: 'Tetap Terapkan',
      tone: 'warning',
    })
    if (!ok) return
  }
  useTemplate(tpl)
  toast.success(`Template "${tpl.name}" berhasil diterapkan!`)
}

function openSaveModal() {
  templateName.value = `${state.fileInfo?.name || 'Mapping'} - Template`
  templateDesc.value = ''
  showSaveModal.value = true
}

async function handleSaveTemplate() {
  if (!templateName.value.trim()) {
    toast.error('Nama template tidak boleh kosong.')
    return
  }
  try {
    const tpl = buildTemplateFromSession({
      name: templateName.value.trim(),
      description: templateDesc.value.trim(),
      headers: source.value.headers,
      columns: state.columns,
      rules: state.rules,
      headerRow: state.headerRow,
      hasHeader: state.hasHeader,
      exportOptions: state.exportOptions,
    })
    await save(tpl)
    showSaveModal.value = false
    toast.success(`Template "${tpl.name}" berhasil disimpan ke penyimpanan lokal.`)
  } catch (err) {
    toast.error(err.message || 'Gagal menyimpan template.')
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
    <!-- Header Step Progress -->
    <div class="card p-4">
      <StepIndicator
        :steps="STEPS"
        :current="state.step"
        :is-enabled="isStepEnabled"
        @select="goToStep"
      />
    </div>

    <!-- Step Views -->
    <div class="min-h-[500px]">
      <FileUploader
        v-if="state.step === 1"
        @next="goToStep(2)"
      />

      <SourceStep
        v-else-if="state.step === 2"
        @next="goToStep(3)"
        @back="goToStep(1)"
      />

      <ColumnMapper
        v-else-if="state.step === 3"
        :templates="templates"
        @next="goToStep(4)"
        @back="goToStep(2)"
        @apply-template="applyTemplateById"
        @save-template="openSaveModal"
      />

      <CleaningRuleEditor
        v-else-if="state.step === 4"
        @next="goToStep(5)"
        @back="goToStep(3)"
      />

      <ExportOptions
        v-else-if="state.step === 5"
        @back="goToStep(4)"
        @save-template="openSaveModal"
      />
    </div>

    <!-- Modal Simpan Template -->
    <BaseModal
      v-if="showSaveModal"
      title="Simpan Sebagai Template"
      description="Konfigurasi mapping kolom, nama keluaran, urutan, dan cleaning akan disimpan secara lokal."
      @close="showSaveModal = false"
    >
      <div class="space-y-4">
        <div>
          <label class="label" for="tplName">Nama Template</label>
          <input
            id="tplName"
            v-model.trim="templateName"
            class="input"
            placeholder="Contoh: Mapping Format Dapodik 2026"
            required
          />
        </div>
        <div>
          <label class="label" for="tplDesc">Deskripsi (Opsional)</label>
          <textarea
            id="tplDesc"
            v-model.trim="templateDesc"
            class="input h-20 resize-none"
            placeholder="Catatan tambahan mengenai struktur data ini..."
          ></textarea>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="showSaveModal = false">Batal</button>
        <button class="btn btn-primary" :disabled="!templateName.trim()" @click="handleSaveTemplate">
          Simpan Template
        </button>
      </template>
    </BaseModal>
  </div>
</template>


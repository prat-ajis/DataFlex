import { reactive, ref } from 'vue'
import {
  deleteTemplate,
  exportTemplatesToJson,
  listTemplates,
  parseTemplateFile,
  saveTemplate,
} from '@/services/templateStorage.js'

/** State daftar template (dibagikan antarhalaman). */
const templates = ref([])
const status = reactive({ loading: false, loaded: false, error: '' })

export function useTemplates() {
  async function refresh() {
    status.loading = true
    status.error = ''
    try {
      templates.value = await listTemplates()
      status.loaded = true
    } catch (e) {
      status.error = e?.message || 'Gagal memuat template.'
    } finally {
      status.loading = false
    }
  }

  async function save(template) {
    const saved = await saveTemplate(template)
    await refresh()
    return saved
  }

  async function remove(id) {
    await deleteTemplate(id)
    await refresh()
  }

  async function importFile(file) {
    const list = await parseTemplateFile(file)
    for (const t of list) await saveTemplate(t)
    await refresh()
    return list
  }

  function exportJson(tpl) {
    exportTemplatesToJson(tpl)
  }

  function exportAll() {
    if (templates.value.length) exportTemplatesToJson(templates.value, 'dataflex_templates')
  }

  return { templates, status, refresh, save, remove, importFile, exportJson, exportAll }
}


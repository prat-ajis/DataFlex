<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { FileSpreadsheet, LayoutDashboard, LayoutTemplate, Plus, ShieldCheck, Trash2 } from '@lucide/vue'
import { useConverterSession } from '@/composables/useConverterSession.js'
import { useDialog } from '@/composables/useDialog.js'
import { useToast } from '@/composables/useToast.js'
import { formatBytes } from '@/services/utils.js'

const router = useRouter()
const { state, hasSession, clearSession } = useConverterSession()
const { confirm } = useDialog()
const toast = useToast()

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/convert', label: 'Konversi', icon: FileSpreadsheet },
  { to: '/templates', label: 'Template', icon: LayoutTemplate },
]

const sessionLabel = computed(() => state.fileInfo?.name || '')

async function newConversion() {
  if (hasSession.value) {
    const ok = await confirm({
      title: 'Mulai konversi baru?',
      message: 'Sesi yang sedang berjalan (file, mapping, dan cleaning) akan dihapus dari memori browser.',
      confirmText: 'Mulai baru',
      tone: 'warning',
    })
    if (!ok) return
    clearSession()
  }
  router.push('/convert')
}

async function clearAll() {
  const ok = await confirm({
    title: 'Hapus sesi?',
    message: 'Data file yang sedang diproses beserta konfigurasi sesi akan dihapus dari memori. Template tersimpan tidak terpengaruh.',
    confirmText: 'Hapus sesi',
    tone: 'danger',
  })
  if (!ok) return
  clearSession()
  toast.success('Sesi dan data sementara telah dihapus.')
  if (router.currentRoute.value.name === 'convert') router.replace('/convert')
}
</script>

<template>
  <div class="flex h-full flex-col">
    <RouterLink to="/" class="flex items-center gap-3 px-5 py-5">
      <img src="/favicon.svg" alt="" class="h-9 w-9" />
      <div>
        <div class="text-base leading-tight font-bold text-slate-900">DataFlex</div>
        <div class="text-xs text-slate-500">Data Converter &amp; Cleaning</div>
      </div>
    </RouterLink>

    <div class="px-4">
      <button class="btn btn-primary w-full" @click="newConversion"><Plus class="h-4 w-4" /> New Conversion</button>
    </div>

    <nav class="mt-5 flex-1 space-y-1 px-3">
      <RouterLink
        v-for="item in nav"
        :key="item.to"
        v-slot="{ href, navigate, isActive, isExactActive }"
        :to="item.to"
        custom
      >
        <a
          :href="href"
          class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition"
          :class="
            (item.exact ? isExactActive : isActive)
              ? 'bg-brand-50 text-brand-700'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          "
          @click="navigate"
        >
          <component :is="item.icon" class="h-4.5 w-4.5" />
          {{ item.label }}
        </a>
      </RouterLink>
    </nav>

    <div class="space-y-3 p-4">
      <div v-if="hasSession" class="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div class="text-xs font-semibold text-slate-500 uppercase">Sesi aktif</div>
        <div class="mt-1 truncate text-sm font-medium text-slate-800" :title="sessionLabel">{{ sessionLabel }}</div>
        <div class="text-xs text-slate-500">{{ formatBytes(state.fileInfo.size) }}</div>
        <button class="btn btn-sm btn-ghost mt-2 w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700" @click="clearAll">
          <Trash2 class="h-3.5 w-3.5" /> Hapus sesi &amp; data sementara
        </button>
      </div>
      <div class="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
        <ShieldCheck class="mt-0.5 h-4 w-4 shrink-0" />
        <span>File diproses langsung di browser Anda dan tidak dikirim ke server.</span>
      </div>
    </div>
  </div>
</template>


<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight,
  Database,
  FileSpreadsheet,
  FileText,
  LayoutTemplate,
  Plus,
  ShieldCheck,
  Sparkles,
  Zap,
} from '@lucide/vue'
import EmptyState from '@/components/EmptyState.vue'
import { useConverterSession } from '@/composables/useConverterSession.js'
import { useTemplates } from '@/composables/useTemplates.js'
import { formatDateTime, formatNumber } from '@/services/utils.js'

const router = useRouter()
const { hasSession } = useConverterSession()
const { templates, status, refresh } = useTemplates()

onMounted(() => {
  refresh()
})

function startNew() {
  router.push('/convert')
}

function useTpl(id) {
  router.push({ path: '/convert', query: { template: id } })
}
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-8 p-6 lg:p-8">
    <!-- Header Banner -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-800 p-8 text-white shadow-md">
      <div class="relative z-10 max-w-2xl space-y-3">
        <span class="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
          <Sparkles class="h-3.5 w-3.5 text-amber-300" /> Local-first Data Converter &amp; Cleaning
        </span>
        <h1 class="text-3xl font-extrabold tracking-tight sm:text-4xl">DataFlex</h1>
        <p class="text-brand-100 text-sm leading-relaxed sm:text-base">
          Baca, petakan secara dinamis, bersihkan data, dan konversi file Excel (.xlsx/.xls) dan CSV langsung di browser Anda tanpa perlu upload ke server mana pun.
        </p>
        <div class="pt-2">
          <button class="btn bg-white text-brand-700 shadow hover:bg-brand-50" @click="startNew">
            <Plus class="h-4 w-4" /> Mulai Konversi Baru
          </button>
        </div>
      </div>
      <div class="absolute -right-10 -bottom-10 opacity-10">
        <FileSpreadsheet class="h-80 w-80" />
      </div>
    </div>

    <!-- Fitur Utama Highlights -->
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="card p-5">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
          <ShieldCheck class="h-5 w-5" />
        </div>
        <h3 class="mt-3 font-semibold text-slate-900">100% Aman &amp; Lokal</h3>
        <p class="mt-1 text-xs leading-relaxed text-slate-500">
          File Anda diproses seutuhnya di memori browser. Tidak ada backend server atau database cloud yang menyimpan data Anda.
        </p>
      </div>

      <div class="card p-5">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
          <Zap class="h-5 w-5" />
        </div>
        <h3 class="mt-3 font-semibold text-slate-900">Dynamic Column Mapping</h3>
        <p class="mt-1 text-xs leading-relaxed text-slate-500">
          Petakan kolom sumber ke kolom tujuan sesuka Anda, ubah urutan, abaikan kolom yang tidak perlu, atau tambahkan kolom manual.
        </p>
      </div>

      <div class="card p-5">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <LayoutTemplate class="h-5 w-5" />
        </div>
        <h3 class="mt-3 font-semibold text-slate-900">Simpan Template Mapping</h3>
        <p class="mt-1 text-xs leading-relaxed text-slate-500">
          Simpan pola mapping yang sering dipakai untuk memproses file serupa berulang kali secara instan.
        </p>
      </div>
    </div>

    <!-- Template Tersimpan -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Template Mapping Tersimpan</h2>
          <p class="text-xs text-slate-500">Konfigurasi pemetaan kolom yang tersimpan di browser Anda</p>
        </div>
        <RouterLink to="/templates" class="text-sm font-medium text-brand-600 hover:text-brand-700">
          Kelola semua &rarr;
        </RouterLink>
      </div>

      <div v-if="status.loading" class="card p-8 text-center text-sm text-slate-400">
        Memuat template...
      </div>
      <div v-else-if="templates.length === 0" class="card">
        <EmptyState
          :icon="LayoutTemplate"
          title="Belum ada template tersimpan"
          description="Saat Anda melakukan pemetaan kolom di konversi, Anda dapat menyimpannya sebagai template agar dapat dipakai lagi nanti."
        >
          <button class="btn btn-secondary btn-sm" @click="startNew">Mulai konversi pertama</button>
        </EmptyState>
      </div>
      <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="tpl in templates.slice(0, 6)"
          :key="tpl.id"
          class="card flex flex-col justify-between p-4 transition hover:border-brand-300 hover:shadow-md"
        >
          <div>
            <div class="flex items-start justify-between gap-2">
              <h3 class="font-semibold text-slate-800">{{ tpl.name }}</h3>
              <span class="badge bg-slate-100 text-slate-600 font-mono text-[10px]">
                {{ tpl.columns.filter((c) => c.enabled).length }} kolom
              </span>
            </div>
            <p v-if="tpl.description" class="mt-1 text-xs text-slate-500 line-clamp-2">{{ tpl.description }}</p>
            <div class="mt-3 text-[11px] text-slate-400">
              Diperbarui: {{ formatDateTime(tpl.updatedAt) }}
            </div>
          </div>
          <div class="mt-4 pt-3 border-t border-slate-100 flex justify-end">
            <button class="btn btn-sm btn-primary" @click="useTpl(tpl.id)">
              Gunakan <ArrowRight class="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Menu } from '@lucide/vue'
import AppSidebar from '@/components/AppSidebar.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ToastContainer from '@/components/ToastContainer.vue'

const mobileOpen = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => (mobileOpen.value = false))
</script>

<template>
  <div class="flex h-full">
    <!-- Sidebar desktop -->
    <aside class="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
      <AppSidebar />
    </aside>

    <!-- Sidebar mobile -->
    <Transition name="fade">
      <div v-if="mobileOpen" class="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" @click="mobileOpen = false" />
    </Transition>
    <aside
      class="fixed inset-y-0 left-0 z-50 w-64 transform border-r border-slate-200 bg-white transition-transform lg:hidden"
      :class="mobileOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <AppSidebar />
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <button class="btn-icon" aria-label="Buka menu" @click="mobileOpen = true"><Menu class="h-5 w-5" /></button>
        <span class="font-semibold text-slate-900">DataFlex</span>
      </header>
      <main class="min-w-0 flex-1 overflow-y-auto">
        <RouterView />
      </main>
    </div>

    <ConfirmDialog />
    <ToastContainer />
  </div>
</template>


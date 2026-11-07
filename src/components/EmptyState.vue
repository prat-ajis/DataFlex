<script setup>
defineProps({
  icon: { type: [Object, Function], default: null },
  title: { type: String, required: true },
  description: { type: String, default: '' },
})
</script>

<template>
  <div class="flex flex-col items-center justify-center px-6 py-12 text-center">
    <div v-if="icon" class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
      <component :is="icon" class="h-6 w-6" />
    </div>
    <h3 class="text-base font-semibold text-slate-900">{{ title }}</h3>
    <p v-if="description" class="mt-1 max-w-md text-sm text-slate-500">{{ description }}</p>
    <div v-if="$slots.default" class="mt-5"><slot /></div>
  </div>
</template>


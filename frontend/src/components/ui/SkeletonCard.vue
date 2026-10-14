<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'kpi' | 'chart' | 'list' | 'table-row'; rows?: number }>(), {
  variant: 'kpi',
  rows: 4,
})
</script>

<template>
  <div v-if="variant === 'kpi'" class="animate-pulse rounded-card bg-surface p-5 shadow-sm">
    <div class="h-3 w-20 rounded bg-surface-bg" />
    <div class="mt-4 h-6 w-28 rounded bg-surface-bg" />
    <div class="mt-2 h-3 w-24 rounded bg-surface-bg" />
  </div>

  <div v-else-if="variant === 'chart'" class="animate-pulse rounded-card bg-surface p-5 shadow-sm">
    <div class="h-4 w-40 rounded bg-surface-bg" />
    <div class="mt-4 h-56 w-full rounded bg-surface-bg" />
  </div>

  <div v-else-if="variant === 'table-row'" class="flex animate-pulse items-center gap-4 px-4 py-3">
    <div class="h-4 w-full rounded bg-surface-bg" />
  </div>

  <div v-else class="animate-pulse space-y-3 rounded-card bg-surface p-5 shadow-sm">
    <div v-for="i in rows" :key="i" class="h-4 w-full rounded bg-surface-bg" />
  </div>
</template>

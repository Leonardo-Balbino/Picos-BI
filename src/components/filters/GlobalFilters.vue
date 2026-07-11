<script setup lang="ts">
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogClose } from 'reka-ui'
import FilterControls from './FilterControls.vue'
import { useUiStore } from '@/stores/useUiStore'

const ui = useUiStore()
</script>

<template>
  <div class="mb-6 rounded-card bg-surface p-4 shadow-sm sm:p-5">
    <div class="flex items-center justify-between gap-3 md:hidden">
      <div class="flex items-center gap-2 text-sm font-semibold text-ink">
        <i class="bi bi-funnel" />
        <span>Filtros Globais</span>
      </div>
      <button
        class="flex items-center gap-2 rounded-btn border border-surface-border px-3 py-2 text-sm text-ink"
        @click="ui.filtersSheetOpen = true"
      >
        <i class="bi bi-sliders" /> Filtros
      </button>
    </div>

    <div class="hidden items-center gap-3 md:flex">
      <div class="flex shrink-0 items-center gap-2 text-sm font-semibold text-ink">
        <i class="bi bi-funnel" />
        <span>Filtros Globais</span>
      </div>
      <FilterControls class="min-w-0 flex-1" />
    </div>
  </div>

  <DialogRoot v-model:open="ui.filtersSheetOpen">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-40 bg-ink/40 md:hidden" />
      <DialogContent
        class="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-card bg-surface p-5 focus:outline-none md:hidden"
      >
        <div class="flex items-center justify-between">
          <DialogTitle class="text-base font-semibold text-ink">Filtros Globais</DialogTitle>
          <DialogClose class="text-ink-muted">
            <i class="bi bi-x-lg" />
          </DialogClose>
        </div>
        <div class="mt-4">
          <FilterControls stacked />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

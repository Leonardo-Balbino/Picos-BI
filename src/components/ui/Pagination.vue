<script setup lang="ts">
import {
  PaginationRoot,
  PaginationList,
  PaginationListItem,
  PaginationEllipsis,
  PaginationPrev,
  PaginationNext,
} from 'reka-ui'

const page = defineModel<number>('page', { default: 1 })
withDefaults(defineProps<{ total: number; itemsPerPage?: number; siblingCount?: number }>(), {
  itemsPerPage: 10,
  siblingCount: 1,
})
</script>

<template>
  <PaginationRoot
    v-model:page="page"
    :total="total"
    :items-per-page="itemsPerPage"
    :sibling-count="siblingCount"
    show-edges
    class="flex items-center gap-1"
  >
    <PaginationPrev
      class="flex h-8 w-8 items-center justify-center rounded-btn border border-surface-border text-ink-muted hover:bg-surface-bg disabled:cursor-not-allowed disabled:opacity-40"
    >
      <i class="bi bi-chevron-left text-xs" />
    </PaginationPrev>
    <PaginationList v-slot="{ items }" class="flex items-center gap-1">
      <template v-for="(item, i) in items" :key="i">
        <PaginationListItem
          v-if="item.type === 'page'"
          :value="item.value"
          class="flex h-8 w-8 items-center justify-center rounded-btn text-sm font-medium text-ink-muted hover:bg-surface-bg data-[selected]:bg-brand-700 data-[selected]:text-white"
        >
          {{ item.value }}
        </PaginationListItem>
        <PaginationEllipsis v-else class="flex h-8 w-8 items-center justify-center text-ink-muted">
          …
        </PaginationEllipsis>
      </template>
    </PaginationList>
    <PaginationNext
      class="flex h-8 w-8 items-center justify-center rounded-btn border border-surface-border text-ink-muted hover:bg-surface-bg disabled:cursor-not-allowed disabled:opacity-40"
    >
      <i class="bi bi-chevron-right text-xs" />
    </PaginationNext>
  </PaginationRoot>
</template>

<script setup lang="ts" generic="T extends Record<string, unknown>">
import EmptyState from './EmptyState.vue'

export interface DataTableColumn {
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
  sortable?: boolean
}

const props = defineProps<{
  columns: DataTableColumn[]
  rows: T[]
  rowKey: (row: T) => string
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  emptyTitle?: string
  emptyDescription?: string
}>()

const emit = defineEmits<{ sort: [key: string] }>()

function alignClass(align: DataTableColumn['align']) {
  return align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
}
</script>

<template>
  <!-- <768px: uma linha vira um card empilhado (label à esquerda, valor à direita) — evita
       cortar colunas em tabelas largas numa tela estreita, ao custo de perder o clique nos
       cabeçalhos pra ordenar (a ordenação padrão da página já cobre o caso comum). -->
  <div class="space-y-3 md:hidden">
    <EmptyState v-if="rows.length === 0" :title="emptyTitle ?? 'Nenhum resultado encontrado'" :description="emptyDescription" />
    <div
      v-for="row in rows"
      :key="rowKey(row)"
      class="rounded-btn border border-surface-border bg-surface p-3 shadow-sm"
    >
      <div
        v-for="col in columns"
        :key="col.key"
        class="flex items-start justify-between gap-3 py-1.5 first:pt-0 last:pb-0"
      >
        <span class="shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-muted">{{ col.label }}</span>
        <span class="min-w-0 text-right text-sm text-ink">
          <slot :name="`cell-${col.key}`" :row="row">
            {{ row[col.key] }}
          </slot>
        </span>
      </div>
    </div>
  </div>

  <!-- >=768px: tabela tradicional com scroll horizontal se a soma das colunas passar da largura do container. -->
  <div class="hidden overflow-x-auto md:block">
    <table class="w-full min-w-max border-collapse text-sm">
      <thead>
        <tr class="border-b border-surface-border">
          <th
            v-for="col in columns"
            :key="col.key"
            class="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted"
            :class="[alignClass(col.align), col.sortable && 'cursor-pointer select-none hover:text-ink']"
            @click="col.sortable && emit('sort', col.key)"
          >
            <span class="inline-flex items-center gap-1">
              {{ col.label }}
              <i
                v-if="col.sortable"
                class="bi text-[10px]"
                :class="
                  props.sortKey === col.key
                    ? props.sortDir === 'asc'
                      ? 'bi-caret-up-fill'
                      : 'bi-caret-down-fill'
                    : 'bi-caret-down text-ink-muted/30'
                "
              />
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="rows.length === 0">
          <td :colspan="columns.length" class="py-6">
            <slot name="empty">
              <EmptyState :title="emptyTitle ?? 'Nenhum resultado encontrado'" :description="emptyDescription" />
            </slot>
          </td>
        </tr>
        <tr
          v-for="row in rows"
          :key="rowKey(row)"
          class="border-b border-surface-border last:border-0 hover:bg-surface-bg/60"
        >
          <td
            v-for="col in columns"
            :key="col.key"
            class="whitespace-nowrap px-4 py-3 text-ink"
            :class="alignClass(col.align)"
          >
            <slot :name="`cell-${col.key}`" :row="row">
              {{ row[col.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

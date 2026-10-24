<script setup lang="ts">
import { computed } from 'vue'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { DonutChart } from '@/components/charts/lazy'
import { useVendasStore } from '@/stores/useVendasStore'
import { useAggregations, type FormaPagamentoLinha } from '@/composables/useAggregations'
import { useRecarregarDados } from '@/composables/useRecarregarDados'
import { formatCurrency, formatCompact, formatPercent, formatNumber } from '@/utils/formatters'

const vendasStore = useVendasStore()
const agg = useAggregations()
const { forcarAtualizacao } = useRecarregarDados()

const formas = computed<FormaPagamentoLinha[]>(() => agg.porFormaPagamento())
const totalGeral = computed(() => formas.value.reduce((acc, f) => acc + f.valor, 0))
const totalTransacoes = computed(() => formas.value.reduce((acc, f) => acc + f.nTransacoes, 0))


const columns: DataTableColumn[] = [
  { key: 'label', label: 'Forma' },
  { key: 'nTransacoes', label: 'Nº Transações', align: 'right' },
  { key: 'valor', label: 'Valor Total', align: 'right' },
  { key: 'ticketMedio', label: 'Ticket Médio', align: 'right' },
  { key: 'percentual', label: '% Faturamento', align: 'right' },
]
</script>

<template>
  <div>

    <div v-if="vendasStore.carregando" class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <SkeletonCard variant="chart" />
      <SkeletonCard variant="chart" />
    </div>

    <EmptyState
      v-else-if="vendasStore.erro"
      icon="bi-exclamation-triangle"
      title="Não foi possível carregar os pagamentos do período"
      :description="vendasStore.erro"
    >
      <BaseButton variant="secondary" class="mt-3" @click="forcarAtualizacao">Tentar novamente</BaseButton>
    </EmptyState>

    <template v-else>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="rounded-card bg-surface p-5 shadow-sm">
          <p class="mb-2 text-sm font-semibold text-ink">Distribuição</p>
          <EmptyState v-if="totalGeral === 0" title="Sem transações no período" />
          <DonutChart v-else :labels="formas.map((f) => f.label)" :series="formas.map((f) => f.valor)" :value-formatter="formatCompact" />
        </div>

        <div class="rounded-card bg-surface p-5 shadow-sm">
          <p class="mb-3 text-sm font-semibold text-ink">Resumo</p>
          <div class="space-y-3">
            <div v-for="f in formas" :key="f.idPagamento" class="flex items-center justify-between gap-3 text-sm">
              <span class="text-ink-muted">{{ f.label }}</span>
              <span class="tabular-nums font-semibold text-ink">{{ formatCompact(f.valor) }} · {{ formatPercent(f.percentual, true) }}</span>
            </div>
            <EmptyState v-if="formas.length === 0" title="Sem transações no período" />
          </div>
        </div>
      </div>

      <div class="mt-6 rounded-card bg-surface p-5 shadow-sm">
        <p class="text-sm font-semibold text-ink">Detalhamento por Forma</p>
        <div class="mt-4">
          <DataTable :columns="columns" :rows="formas" :row-key="(r) => r.idPagamento" empty-title="Sem transações no período">
            <template #cell-valor="{ row }">{{ formatCurrency(row.valor) }}</template>
            <template #cell-ticketMedio="{ row }">{{ formatCurrency(row.ticketMedio) }}</template>
            <template #cell-percentual="{ row }">{{ formatPercent(row.percentual, true) }}</template>
            <template #cell-nTransacoes="{ row }">{{ formatNumber(row.nTransacoes) }}</template>
          </DataTable>
        </div>
        <div v-if="formas.length > 0" class="mt-2 flex items-center justify-between border-t border-surface-border px-4 py-3 text-sm font-semibold text-ink">
          <span>Total</span>
          <span class="flex gap-8 tabular-nums">
            <span>{{ formatNumber(totalTransacoes) }}</span>
            <span>{{ formatCurrency(totalGeral) }}</span>
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

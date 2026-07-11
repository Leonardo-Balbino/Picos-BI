<script setup lang="ts">
import { computed } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import GlobalFilters from '@/components/filters/GlobalFilters.vue'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import BarChart from '@/components/charts/BarChart.vue'
import { useVendasStore } from '@/stores/useVendasStore'
import { useAggregations, type FormaPagamentoLinha } from '@/composables/useAggregations'
import { formatCurrency, formatCompact, formatPercent, formatNumber } from '@/utils/formatters'

const TAXA_ESTIMADA: Record<string, number> = { credito: 0.025, debito: 0.014, pix: 0, dinheiro: 0 }
const ICONES: Record<string, string> = { credito: 'bi-credit-card', pix: 'bi-qr-code', debito: 'bi-credit-card-2-back', dinheiro: 'bi-cash-coin' }

const vendasStore = useVendasStore()
const agg = useAggregations()

const formas = computed<FormaPagamentoLinha[]>(() => agg.porFormaPagamento())
const evolucao = computed(() => agg.evolucaoDiariaPorFormaPagamento())

const custoCartao = computed(() =>
  formas.value.reduce((acc, f) => acc + f.valor * (TAXA_ESTIMADA[f.forma] ?? 0), 0),
)
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
    <PageHeader title="Pagamentos" subtitle="Visão consolidada das transações e formas de recebimento." />
    <GlobalFilters />

    <div v-if="!vendasStore.carregado" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SkeletonCard v-for="i in 4" :key="i" variant="kpi" />
    </div>

    <template v-else>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div v-for="forma in formas" :key="forma.forma" class="rounded-card bg-surface p-5 shadow-sm">
          <div class="flex items-start justify-between">
            <span class="flex h-9 w-9 items-center justify-center rounded-btn bg-brand-100 text-brand-700">
              <i class="bi" :class="ICONES[forma.forma]" />
            </span>
            <span class="rounded-full bg-surface-bg px-2 py-0.5 text-xs font-semibold text-ink-muted">
              {{ formatPercent(forma.percentual, true) }}
            </span>
          </div>
          <p class="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">{{ forma.label }}</p>
          <p class="tabular-nums text-2xl font-bold text-ink">{{ formatCompact(forma.valor) }}</p>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="rounded-card bg-surface p-5 shadow-sm">
          <p class="mb-2 text-sm font-semibold text-ink">Distribuição</p>
          <EmptyState v-if="totalGeral === 0" title="Sem transações no período" />
          <DonutChart
            v-else
            :labels="formas.map((f) => f.label)"
            :series="formas.map((f) => f.valor)"
            :value-formatter="formatCompact"
          />
        </div>

        <div class="rounded-card bg-surface p-5 shadow-sm lg:col-span-1">
          <p class="mb-2 text-sm font-semibold text-ink">Evolução Diária</p>
          <BarChart
            :categories="evolucao.categorias"
            :series="evolucao.series"
            stacked
            :value-formatter="formatCompact"
          />
        </div>

        <div class="rounded-card bg-brand-700 p-5 text-white shadow-sm">
          <p class="text-sm font-semibold">Taxas de Cartão</p>
          <p class="mb-4 text-xs text-white/70">Custo estimado retido pelas adquirentes no período selecionado.</p>
          <div class="rounded-btn bg-white/10 p-4">
            <p class="text-xs uppercase tracking-wide text-white/60">Custo Total</p>
            <p class="tabular-nums text-2xl font-bold">{{ formatCurrency(custoCartao) }}</p>
            <p class="mt-1 text-xs text-white/60">
              {{ formatPercent(totalGeral ? custoCartao / totalGeral : 0, true) }} do faturamento em cartão
            </p>
          </div>
        </div>
      </div>

      <div class="mt-6 rounded-card bg-surface p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-ink">Detalhamento por Forma</p>
        </div>
        <div class="mt-4">
          <DataTable :columns="columns" :rows="formas" :row-key="(r) => r.forma" empty-title="Sem transações no período">
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

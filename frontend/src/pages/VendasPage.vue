<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import GlobalFilters from '@/components/filters/GlobalFilters.vue'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import Pagination from '@/components/ui/Pagination.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { LineAreaChart, BarChart } from '@/components/charts/lazy'
import { useVendasStore } from '@/stores/useVendasStore'
import { useExportStore } from '@/stores/useExportStore'
import { useAggregations, type VendaExibicao } from '@/composables/useAggregations'
import { useRecarregarDados } from '@/composables/useRecarregarDados'
import { usePagination } from '@/composables/usePagination'
import { formatCurrency, formatCompact, formatNumber, formatDateTime } from '@/utils/formatters'
import { statusVendaVariant } from '@/services/apiConstants'

const vendasStore = useVendasStore()
const exportStore = useExportStore()
const agg = useAggregations()
const { forcarAtualizacao } = useRecarregarDados()

const serieTemporal = computed(() => agg.serieTemporalFaturamento())
const diaSemana = computed(() => agg.vendasPorDiaSemana())

const busca = ref('')
const sortKey = ref<string>('dataHora')
const sortDir = ref<'asc' | 'desc'>('desc')

const linhasFiltradas = computed<VendaExibicao[]>(() => {
  const termo = busca.value.trim().toLowerCase()
  const base = !termo
    ? agg.tabelaVendas.value
    : agg.tabelaVendas.value.filter(
        (v) => v.numero.toLowerCase().includes(termo) || v.nomeUsuario.toLowerCase().includes(termo),
      )
  const linhas = [...base]
  linhas.sort((a, b) => {
    const dir = sortDir.value === 'asc' ? 1 : -1
    if (sortKey.value === 'valTotal') return (a.valTotal - b.valTotal) * dir
    return a.dataHora.localeCompare(b.dataHora) * dir
  })
  return linhas
})

function handleSort(key: string) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
}

const { page, paginated } = usePagination(linhasFiltradas, 8)

watchEffect(() => {
  exportStore.registrar(
    'vendas',
    [
      { chave: 'dataHora', rotulo: 'Data/Hora' },
      { chave: 'numero', rotulo: 'Cupom' },
      { chave: 'idCaixa', rotulo: 'PDV' },
      { chave: 'nomeUsuario', rotulo: 'Operador' },
      { chave: 'valTotal', rotulo: 'Valor' },
      { chave: 'statusDescricao', rotulo: 'Status' },
    ],
    linhasFiltradas.value.map((v) => ({
      dataHora: formatDateTime(v.dataHora),
      numero: `${v.numero}${v.serie ? `-${v.serie}` : ''}`,
      idCaixa: `Caixa ${v.idCaixa}`,
      nomeUsuario: v.nomeUsuario,
      valTotal: formatCurrency(v.valTotal),
      statusDescricao: v.statusDescricao || '—',
    })),
  )
})

const columns: DataTableColumn[] = [
  { key: 'dataHora', label: 'Data/Hora', sortable: true },
  { key: 'numero', label: 'Cupom' },
  { key: 'idCaixa', label: 'PDV' },
  { key: 'nomeUsuario', label: 'Operador' },
  { key: 'valTotal', label: 'Valor', align: 'right', sortable: true },
  { key: 'statusDescricao', label: 'Status', align: 'center' },
]
</script>

<template>
  <div>
    <PageHeader title="Vendas" subtitle="Visão detalhada de faturamento e volume." />
    <GlobalFilters />

    <div v-if="vendasStore.carregando" class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <SkeletonCard variant="chart" />
      <SkeletonCard variant="chart" />
    </div>

    <EmptyState
      v-else-if="vendasStore.erro"
      icon="bi-exclamation-triangle"
      title="Não foi possível carregar as vendas do período"
      :description="vendasStore.erro"
    >
      <BaseButton variant="secondary" class="mt-3" @click="forcarAtualizacao">Tentar novamente</BaseButton>
    </EmptyState>

    <template v-else>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="rounded-card bg-surface p-5 shadow-sm">
          <p class="mb-2 text-sm font-semibold text-ink">Vendas no período</p>
          <EmptyState v-if="agg.kpisGerais.value.numeroVendas === 0" title="Sem vendas no período selecionado" />
          <LineAreaChart v-else :categories="serieTemporal.categorias" :series="[{ name: 'Faturamento', data: serieTemporal.valores }]" :value-formatter="formatCompact" />
        </div>
        <div class="rounded-card bg-surface p-5 shadow-sm">
          <p class="mb-2 text-sm font-semibold text-ink">Comparativo entre os dias</p>
          <BarChart
            :categories="diaSemana.categorias"
            :series="[{ name: 'Vendas', data: diaSemana.valores }]"
            :highlight-index="diaSemana.highlightIndex"
            :value-formatter="formatNumber"
          />
        </div>
      </div>

      <div class="mt-6 rounded-card bg-surface p-5 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-ink">Analítico de Vendas</p>
            <p class="text-xs text-ink-muted">Detalhamento transacional</p>
          </div>
          <input
            v-model="busca"
            type="search"
            placeholder="Buscar cupom, operador..."
            class="w-full max-w-xs rounded-btn border border-surface-border bg-surface-bg px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <div class="mt-4">
          <DataTable
            :columns="columns"
            :rows="paginated"
            :row-key="(r) => r.codigo"
            :sort-key="sortKey"
            :sort-dir="sortDir"
            empty-title="Nenhuma venda encontrada"
            empty-description="Ajuste a busca ou os filtros globais."
            @sort="handleSort"
          >
            <template #cell-dataHora="{ row }">{{ formatDateTime(row.dataHora) }}</template>
            <template #cell-numero="{ row }">{{ row.numero }}{{ row.serie ? `-${row.serie}` : '' }}</template>
            <template #cell-idCaixa="{ row }">Caixa {{ row.idCaixa }}</template>
            <template #cell-valTotal="{ row }">{{ formatCurrency(row.valTotal) }}</template>
            <template #cell-statusDescricao="{ row }">
              <StatusBadge :variant="statusVendaVariant(row.statusDescricao)">{{ row.statusDescricao || '—' }}</StatusBadge>
            </template>
          </DataTable>
        </div>

        <div class="mt-4 flex flex-col items-start gap-2 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <span>Exibindo {{ linhasFiltradas.length === 0 ? 0 : (page - 1) * 8 + 1 }}-{{ Math.min(page * 8, linhasFiltradas.length) }} de {{ linhasFiltradas.length }}</span>
          <Pagination v-model:page="page" :total="linhasFiltradas.length" :items-per-page="8" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import GlobalFilters from '@/components/filters/GlobalFilters.vue'
import KpiCard from '@/components/ui/KpiCard.vue'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import Pagination from '@/components/ui/Pagination.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import ComboChart from '@/components/charts/ComboChart.vue'
import BarChart from '@/components/charts/BarChart.vue'
import { useVendasStore } from '@/stores/useVendasStore'
import { useAggregations, type VendaExibicao } from '@/composables/useAggregations'
import { usePagination } from '@/composables/usePagination'
import { formatCurrency, formatCompact, formatNumber, formatDateTime } from '@/utils/formatters'
import { FORMA_PAGAMENTO_LABEL, statusVendaLabel, statusVendaVariant, iniciais, corAvatar } from '@/utils/statusMaps'

const vendasStore = useVendasStore()
const agg = useAggregations()

const serieDiaria = computed(() => agg.serieTemporalFaturamento())
const numeroVendasSerie = computed(() => agg.serieTemporalNumeroVendas())
const comparativo = computed(() => agg.comparativoPeriodos())
const destaques = computed(() => agg.destaquesPeriodo())

const busca = ref('')
const sortKey = ref<string>('dataHora')
const sortDir = ref<'asc' | 'desc'>('desc')

const linhasFiltradas = computed<VendaExibicao[]>(() => {
  const termo = busca.value.trim().toLowerCase()
  const base = !termo
    ? agg.tabelaVendas.value
    : agg.tabelaVendas.value.filter(
        (v) => v.numero.toLowerCase().includes(termo) || v.vendedorNome.toLowerCase().includes(termo),
      )
  const linhas = [...base]
  linhas.sort((a, b) => {
    const dir = sortDir.value === 'asc' ? 1 : -1
    if (sortKey.value === 'total') return (a.total - b.total) * dir
    if (sortKey.value === 'vendedorNome') return a.vendedorNome.localeCompare(b.vendedorNome) * dir
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

const columns: DataTableColumn[] = [
  { key: 'dataHora', label: 'Data/Hora', sortable: true },
  { key: 'numero', label: 'Cupom' },
  { key: 'vendedorNome', label: 'Vendedor', sortable: true },
  { key: 'nItens', label: 'Itens', align: 'center' },
  { key: 'formaPagamento', label: 'Pagamento' },
  { key: 'total', label: 'Valor Total', align: 'right', sortable: true },
  { key: 'status', label: 'Status', align: 'center' },
]
</script>

<template>
  <div>
    <PageHeader title="Vendas" subtitle="Visão detalhada de faturamento e volume." />
    <GlobalFilters />

    <div v-if="!vendasStore.carregado" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SkeletonCard v-for="i in 4" :key="i" variant="kpi" />
    </div>

    <template v-else>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Faturamento"
          :value="formatCurrency(agg.kpisGerais.value.faturamento)"
          icon="bi-currency-dollar"
          :variation="agg.kpisGerais.value.faturamentoVar"
        />
        <KpiCard
          label="Nº de Vendas"
          :value="formatNumber(agg.kpisGerais.value.numeroVendas)"
          icon="bi-receipt"
          :variation="agg.kpisGerais.value.numeroVendasVar"
        />
        <KpiCard
          label="Ticket Médio"
          :value="formatCurrency(agg.kpisGerais.value.ticketMedio)"
          icon="bi-tag"
          :variation="agg.kpisGerais.value.ticketMedioVar"
        />
        <KpiCard
          label="Nº de Itens"
          :value="formatNumber(agg.kpisGerais.value.itensVendidos)"
          icon="bi-box-seam"
          :variation="agg.kpisGerais.value.itensVendidosVar"
        />
      </div>

      <div class="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="rounded-card bg-surface p-5 shadow-sm lg:col-span-2">
          <p class="text-sm font-semibold text-ink">Faturamento vs. Volume</p>
          <p class="mb-2 text-xs text-ink-muted">Evolução diária no período selecionado</p>
          <ComboChart
            :categories="serieDiaria.categorias"
            bar-name="Faturamento"
            :bar-data="serieDiaria.valores"
            line-name="Nº Vendas"
            :line-data="numeroVendasSerie.valores"
            :bar-formatter="formatCompact"
          />
        </div>

        <div class="flex flex-col gap-4">
          <div class="rounded-card bg-surface p-5 shadow-sm">
            <p class="text-sm font-semibold text-ink">Comparativo de Períodos</p>
            <p class="mb-2 text-xs text-ink-muted">Atual vs. Anterior</p>
            <BarChart
              :categories="comparativo.categorias"
              :series="[
                { name: 'Atual', data: comparativo.atual },
                { name: 'Anterior', data: comparativo.anterior },
              ]"
              :value-formatter="formatCompact"
              :height="150"
            />
          </div>
          <div class="rounded-card bg-brand-700 p-5 text-white shadow-sm">
            <p class="mb-3 text-sm font-semibold">Destaques do Período</p>
            <div class="space-y-3 text-sm">
              <div class="flex items-center justify-between gap-3">
                <span class="flex items-center gap-2 text-white/80"><i class="bi bi-award" /> Maior Venda</span>
                <span class="tabular-nums font-semibold">{{ formatCurrency(destaques.maiorVenda) }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="flex items-center gap-2 text-white/80"><i class="bi bi-calendar-event" /> Melhor Dia</span>
                <span class="font-semibold">{{ destaques.melhorDia }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="flex items-center gap-2 text-white/80"><i class="bi bi-clock" /> Horário de Pico</span>
                <span class="font-semibold">{{ destaques.horarioPico }}</span>
              </div>
            </div>
          </div>
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
            placeholder="Buscar cupom, vendedor..."
            class="w-full max-w-xs rounded-btn border border-surface-border bg-surface-bg px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <div class="mt-4">
          <DataTable
            :columns="columns"
            :rows="paginated"
            :row-key="(r) => r.id"
            :sort-key="sortKey"
            :sort-dir="sortDir"
            empty-title="Nenhuma venda encontrada"
            empty-description="Ajuste a busca ou os filtros globais."
            @sort="handleSort"
          >
            <template #cell-dataHora="{ row }">{{ formatDateTime(row.dataHora) }}</template>
            <template #cell-vendedorNome="{ row }">
              <span class="flex items-center gap-2">
                <span
                  class="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  :style="{ backgroundColor: corAvatar(row.vendedorNome) }"
                >
                  {{ iniciais(row.vendedorNome) }}
                </span>
                {{ row.vendedorNome }}
              </span>
            </template>
            <template #cell-formaPagamento="{ row }">{{ FORMA_PAGAMENTO_LABEL[row.formaPagamento] }}</template>
            <template #cell-total="{ row }">{{ formatCurrency(row.total) }}</template>
            <template #cell-status="{ row }">
              <StatusBadge :variant="statusVendaVariant(row.status)">{{ statusVendaLabel(row.status) }}</StatusBadge>
            </template>
          </DataTable>
        </div>

        <div class="mt-4 flex items-center justify-between gap-3 text-xs text-ink-muted">
          <span>Exibindo {{ linhasFiltradas.length === 0 ? 0 : (page - 1) * 8 + 1 }}-{{ Math.min(page * 8, linhasFiltradas.length) }} de {{ linhasFiltradas.length }}</span>
          <Pagination v-model:page="page" :total="linhasFiltradas.length" :items-per-page="8" />
        </div>
      </div>
    </template>
  </div>
</template>

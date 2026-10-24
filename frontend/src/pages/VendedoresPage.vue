<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import GlobalFilters from '@/components/filters/GlobalFilters.vue'
import KpiCard from '@/components/ui/KpiCard.vue'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import Pagination from '@/components/ui/Pagination.vue'
import { HBarChart } from '@/components/charts/lazy'
import { useVendasStore } from '@/stores/useVendasStore'
import { useVendedoresStore } from '@/stores/useVendedoresStore'
import { useFiltersStore } from '@/stores/useFiltersStore'
import { useExportStore } from '@/stores/useExportStore'
import { useRecarregarDados } from '@/composables/useRecarregarDados'
import { usePagination } from '@/composables/usePagination'
import { formatCurrency, formatCompact, formatNumber, formatPercent } from '@/utils/formatters'
import type { VendedorVendas } from '@/services/dataService'

const vendasStore = useVendasStore()
const vendedoresStore = useVendedoresStore()
const filters = useFiltersStore()
const exportStore = useExportStore()
const { periodoAtualISO } = useRecarregarDados()

const busca = ref('')
const ordenarPor = ref<'valor' | 'pedidos' | 'ticket'>('valor')

function carregar() {
  const { inicio, fim } = periodoAtualISO()
  const idsLojas = filters.lojasSelecionadas.slice().sort().join(',')
  vendedoresStore.carregarPeriodo(inicio, fim, idsLojas, filters.idCaixa)
}

watch(
  () => [
    filters.periodo,
    filters.range.inicio,
    filters.range.fim,
    filters.lojasSelecionadas.join(','),
    filters.idCaixa,
    vendasStore.revisao,
  ],
  carregar,
  { immediate: true },
)

const rankingBase = computed(() => {
  return [...vendedoresStore.vendedores].sort((a, b) => {
    if (ordenarPor.value === 'pedidos') {
      return b.quantidadeVendas - a.quantidadeVendas || b.totalVendido - a.totalVendido
    }
    if (ordenarPor.value === 'ticket') {
      const ta = a.ticketMedio ?? (a.quantidadeVendas ? a.totalVendido / a.quantidadeVendas : 0)
      const tb = b.ticketMedio ?? (b.quantidadeVendas ? b.totalVendido / b.quantidadeVendas : 0)
      return tb - ta || b.totalVendido - a.totalVendido
    }
    return b.totalVendido - a.totalVendido || b.quantidadeVendas - a.quantidadeVendas
  })
})

const totalVendidoGeral = computed(() =>
  vendedoresStore.vendedores.reduce((acc, v) => acc + v.totalVendido, 0),
)

const totalPedidosGeral = computed(() =>
  vendedoresStore.vendedores.reduce((acc, v) => acc + v.quantidadeVendas, 0),
)

const ticketMedioGeral = computed(() =>
  totalPedidosGeral.value > 0 ? totalVendidoGeral.value / totalPedidosGeral.value : 0,
)

const vendedoresAtivos = computed(() =>
  vendedoresStore.vendedores.filter((v) => v.totalVendido > 0 || v.quantidadeVendas > 0).length,
)

interface VendedorLinhaTabela extends VendedorVendas {
  posicao: number
  percentualTotal: number
}

const rankingEnriquecido = computed<VendedorLinhaTabela[]>(() => {
  const total = totalVendidoGeral.value || 1
  return rankingBase.value.map((v, index) => ({
    ...v,
    posicao: index + 1,
    percentualTotal: (v.totalVendido / total) * 100,
  }))
})

const rankingFiltrado = computed(() => {
  if (!busca.value.trim()) return rankingEnriquecido.value
  const termo = busca.value.toLowerCase().trim()
  return rankingEnriquecido.value.filter(
    (v) =>
      v.nome.toLowerCase().includes(termo) ||
      v.nomeLoja.toLowerCase().includes(termo) ||
      v.codigo.toLowerCase().includes(termo),
  )
})

const { page, paginated } = usePagination(rankingFiltrado, 12)

// Gráfico top 10
const top10Grafico = computed(() => rankingBase.value.slice(0, 10))
const graficoCategorias = computed(() => top10Grafico.value.map((v) => v.nome))
const graficoSeries = computed(() => {
  if (ordenarPor.value === 'pedidos') {
    return [{ name: 'Volume de Pedidos', data: top10Grafico.value.map((v) => v.quantidadeVendas) }]
  }
  return [{ name: 'Total Vendido (R$)', data: top10Grafico.value.map((v) => v.totalVendido) }]
})

watchEffect(() => {
  exportStore.registrar(
    'vendedores',
    [
      { chave: 'posicao', rotulo: 'Posição' },
      { chave: 'nome', rotulo: 'Vendedor' },
      { chave: 'nomeLoja', rotulo: 'Unidade' },
      { chave: 'quantidadeVendas', rotulo: 'Volume de Pedidos' },
      { chave: 'totalVendido', rotulo: 'Total Vendido (R$)' },
      { chave: 'ticketMedio', rotulo: 'Ticket Médio (R$)' },
      { chave: 'percentualTotal', rotulo: '% do Faturamento' },
    ],
    rankingFiltrado.value.map((v) => ({
      posicao: v.posicao,
      nome: v.nome,
      nomeLoja: v.nomeLoja,
      quantidadeVendas: formatNumber(v.quantidadeVendas),
      totalVendido: formatCurrency(v.totalVendido),
      ticketMedio: formatCurrency(v.ticketMedio ?? (v.quantidadeVendas ? v.totalVendido / v.quantidadeVendas : 0)),
      percentualTotal: formatPercent(v.percentualTotal, true),
    })),
  )
})

const columns: DataTableColumn[] = [
  { key: 'posicao', label: '#', align: 'center' },
  { key: 'nome', label: 'Vendedor' },
  { key: 'nomeLoja', label: 'Unidade / Loja' },
  { key: 'quantidadeVendas', label: 'Pedidos', align: 'right' },
  { key: 'totalVendido', label: 'Total Vendido', align: 'right' },
  { key: 'ticketMedio', label: 'Ticket Médio', align: 'right' },
  { key: 'percentualTotal', label: 'Participação', align: 'right' },
]
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Vendas por Vendedor"
      subtitle="Ranking analítico de vendas, volume de pedidos e ticket médio por vendedor."
    />

    <GlobalFilters />

    <div v-if="vendedoresStore.carregando" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SkeletonCard v-for="i in 4" :key="i" variant="kpi" />
    </div>

    <EmptyState
      v-else-if="vendedoresStore.erro"
      icon="bi-exclamation-triangle"
      title="Não foi possível carregar as vendas por vendedor"
      :description="vendedoresStore.erro"
    >
      <BaseButton variant="secondary" class="mt-3" @click="carregar">Tentar novamente</BaseButton>
    </EmptyState>

    <template v-else>
      <!-- KPIs essenciais -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Vendido"
          :value="formatCurrency(totalVendidoGeral)"
          icon="bi-cash-coin"
          tone="brand"
        />
        <KpiCard
          label="Volume de Pedidos"
          :value="formatNumber(totalPedidosGeral)"
          icon="bi-receipt"
        />
        <KpiCard
          label="Ticket Médio"
          :value="formatCurrency(ticketMedioGeral)"
          icon="bi-calculator"
        />
        <KpiCard
          label="Vendedores Ativos"
          :value="formatNumber(vendedoresAtivos)"
          icon="bi-person-check-fill"
        />
      </div>

      <!-- Gráfico do Top 10 Vendedores -->
      <div class="rounded-card border border-surface-border bg-surface p-5 shadow-sm">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-surface-border/50 pb-3">
          <div>
            <h2 class="text-base font-bold text-ink">Ranking dos Vendedores (Top 10)</h2>
            <p class="text-xs text-ink-muted">Visão comparativa dos líderes de venda no período selecionado</p>
          </div>

          <div class="inline-flex rounded-btn bg-surface-bg p-1 text-xs font-semibold">
            <button
              type="button"
              class="rounded-btn px-3 py-1.5 transition-colors"
              :class="
                ordenarPor === 'valor'
                  ? 'bg-brand-700 text-white shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              "
              @click="ordenarPor = 'valor'"
            >
              <i class="bi bi-currency-dollar mr-1" />Por Faturamento
            </button>
            <button
              type="button"
              class="rounded-btn px-3 py-1.5 transition-colors"
              :class="
                ordenarPor === 'pedidos'
                  ? 'bg-brand-700 text-white shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              "
              @click="ordenarPor = 'pedidos'"
            >
              <i class="bi bi-bag-check mr-1" />Por Pedidos
            </button>
          </div>
        </div>

        <EmptyState
          v-if="top10Grafico.length === 0"
          title="Sem vendas registradas no período selecionado"
          description="Altere a data ou o filtro de lojas acima para visualizar o ranking de vendedores."
        />
        <HBarChart
          v-else
          :categories="graficoCategorias"
          :series="graficoSeries"
          :value-formatter="ordenarPor === 'pedidos' ? (v) => `${formatNumber(v)} pedidos` : formatCompact"
          :height="300"
        />
      </div>

      <!-- Tabela Analítica Completa -->
      <div class="rounded-card border border-surface-border bg-surface p-5 shadow-sm">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-surface-border/50 pb-3">
          <div>
            <h2 class="text-base font-bold text-ink">Detalhamento por Vendedor</h2>
            <p class="text-xs text-ink-muted">Tabela detalhada com pedidos, faturamento e ticket médio</p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <div class="relative w-64">
              <i class="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted" />
              <input
                v-model="busca"
                type="text"
                placeholder="Buscar vendedor..."
                class="w-full rounded-btn border border-surface-border bg-surface-bg py-1.5 pl-8 pr-3 text-xs text-ink placeholder-ink-muted focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div class="inline-flex rounded-btn bg-surface-bg p-1 text-xs font-semibold">
              <button
                type="button"
                class="rounded-btn px-2.5 py-1 transition-colors"
                :class="ordenarPor === 'valor' ? 'bg-brand-700 text-white shadow-sm' : 'text-ink-muted hover:text-ink'"
                @click="ordenarPor = 'valor'"
              >
                R$ Maior
              </button>
              <button
                type="button"
                class="rounded-btn px-2.5 py-1 transition-colors"
                :class="ordenarPor === 'pedidos' ? 'bg-brand-700 text-white shadow-sm' : 'text-ink-muted hover:text-ink'"
                @click="ordenarPor = 'pedidos'"
              >
                Qtd Pedidos
              </button>
              <button
                type="button"
                class="rounded-btn px-2.5 py-1 transition-colors"
                :class="ordenarPor === 'ticket' ? 'bg-brand-700 text-white shadow-sm' : 'text-ink-muted hover:text-ink'"
                @click="ordenarPor = 'ticket'"
              >
                Ticket Médio
              </button>
            </div>
          </div>
        </div>

        <DataTable
          :columns="columns"
          :rows="paginated"
          :row-key="(r) => (r.idLoja ?? 'loja') + ':' + r.codigo"
          empty-title="Nenhum vendedor encontrado"
          empty-description="Não foram encontradas vendas com os filtros selecionados."
        >
          <!-- Célula de Posição / Medalha -->
          <template #cell-posicao="{ row }">
            <span
              v-if="row.posicao === 1"
              class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800 shadow-sm"
              title="1º Lugar"
            >
              🥇
            </span>
            <span
              v-else-if="row.posicao === 2"
              class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 shadow-sm"
              title="2º Lugar"
            >
              🥈
            </span>
            <span
              v-else-if="row.posicao === 3"
              class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 text-xs font-bold text-amber-900 border border-amber-200"
              title="3º Lugar"
            >
              🥉
            </span>
            <span v-else class="text-xs font-semibold text-ink-muted">
              {{ row.posicao }}º
            </span>
          </template>

          <!-- Nome com ícone amigável -->
          <template #cell-nome="{ row }">
            <div class="flex items-center gap-2">
              <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-700">
                {{ row.nome.slice(0, 2).toUpperCase() }}
              </div>
              <span class="font-semibold text-ink">{{ row.nome }}</span>
            </div>
          </template>

          <template #cell-nomeLoja="{ row }">
            <span class="text-xs text-ink-muted">{{ row.nomeLoja }}</span>
          </template>

          <template #cell-quantidadeVendas="{ row }">
            <span class="inline-flex items-center rounded-full bg-surface-bg px-2.5 py-0.5 text-xs font-medium text-ink">
              {{ formatNumber(row.quantidadeVendas) }} pedidos
            </span>
          </template>

          <template #cell-totalVendido="{ row }">
            <span class="font-bold text-ink">{{ formatCurrency(row.totalVendido) }}</span>
          </template>

          <template #cell-ticketMedio="{ row }">
            <span class="font-medium text-ink">{{ formatCurrency(row.ticketMedio ?? 0) }}</span>
          </template>

          <template #cell-percentualTotal="{ row }">
            <div class="flex items-center justify-end gap-2">
              <div class="h-1.5 w-16 overflow-hidden rounded-full bg-surface-bg">
                <div
                  class="h-full rounded-full bg-brand-600"
                  :style="{ width: `${Math.min(100, Math.max(2, row.percentualTotal))}%` }"
                />
              </div>
              <span class="text-xs font-medium text-ink-muted">
                {{ formatPercent(row.percentualTotal, true) }}
              </span>
            </div>
          </template>
        </DataTable>

        <div
          v-if="rankingFiltrado.length > 0"
          class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-surface-border/50 pt-3 text-xs text-ink-muted"
        >
          <span>Exibindo {{ rankingFiltrado.length }} vendedor(es)</span>
          <Pagination v-model:page="page" :total="rankingFiltrado.length" :items-per-page="12" />
        </div>
      </div>
    </template>
  </div>
</template>

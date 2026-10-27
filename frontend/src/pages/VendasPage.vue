<script setup lang="ts">
import { computed, ref, watch, watchEffect, onUnmounted } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import GlobalFilters from '@/components/filters/GlobalFilters.vue'
import KpiCard from '@/components/ui/KpiCard.vue'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import Pagination from '@/components/ui/Pagination.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { LineAreaChart, BarChart } from '@/components/charts/lazy'
import { useVendasStore } from '@/stores/useVendasStore'
import { useExportStore } from '@/stores/useExportStore'
import { useAggregations } from '@/composables/useAggregations'
import { useRecarregarDados } from '@/composables/useRecarregarDados'
import { useFiltersStore } from '@/stores/useFiltersStore'
import { usePolianaLayout } from '@/composables/usePolianaLayout'
import PagamentosResumo from '@/components/vendas/PagamentosResumo.vue'
import { getVendedoresVendas, getPaginaVendas, type ResumoVendedores, type PaginaVendas } from '@/services/dataService'
import { formatCurrency, formatCompact, formatPercent, formatDateTime, formatNumber } from '@/utils/formatters'
import { statusVendaVariant } from '@/services/apiConstants'
import type { Venda } from '@/types'

const vendasStore = useVendasStore()
const exportStore = useExportStore()
const agg = useAggregations()
const { forcarAtualizacao, periodoAtualISO } = useRecarregarDados()
const filters = useFiltersStore()
const { somentePoliana } = usePolianaLayout()

// 1. Vendas por Vendedor
const vendedores = ref<ResumoVendedores | null>(null)
const carregandoVendedores = ref(false)
const erroVendedores = ref('')
let consultaVendedores: AbortController | undefined
const rankingVendedores = computed(() => vendedores.value?.items ?? [])
const totalVendedores = computed(() => vendedores.value?.totalAtribuido ?? 0)

const colunasVendedores: DataTableColumn[] = [
  { key: 'nome', label: 'Vendedor' },
  { key: 'quantidadeVendas', label: 'Vendas / pedidos', align: 'right' },
  { key: 'totalVendido', label: 'Total vendido', align: 'right' },
  { key: 'ticketMedio', label: 'Ticket médio', align: 'right' },
]

async function carregarVendedores() {
  consultaVendedores?.abort()
  const consulta = new AbortController()
  consultaVendedores = consulta
  vendedores.value = null
  carregandoVendedores.value = true
  erroVendedores.value = ''
  const { inicio, fim } = periodoAtualISO()
  try {
    const resposta = await getVendedoresVendas(
      inicio,
      fim,
      filters.lojasSelecionadas.slice().sort().join(','),
      filters.idCaixa,
      consulta.signal,
    )
    if (!consulta.signal.aborted) vendedores.value = resposta
  } catch (erro) {
    if (!consulta.signal.aborted) {
      erroVendedores.value =
        erro instanceof Error ? erro.message : 'Não foi possível carregar as vendas por vendedor.'
    }
  } finally {
    if (!consulta.signal.aborted) carregandoVendedores.value = false
  }
}

// 2. Relatório Analítico de Vendas (Detalhamento com Margem - Solicitação do Fábio)
export interface VendaComMargem extends Record<string, unknown> {
  codigo: string
  numero: string
  serie: string
  modelo: string
  dataHora: string
  idCaixa: string
  nomeLoja?: string
  valTotal: number | null
  custoTotal?: number
  status: string
  statusDescricao: string
  nomeUsuario: string
  margemValor: number
  margemPercentual: number | null
}

const paginaVendas = ref<PaginaVendas | null>(null)
const carregandoTabela = ref(false)
const erroTabela = ref('')
const page = ref(1)
const pageSize = ref(12)
const busca = ref('')
const sortKey = ref('dataHora')
const sortDir = ref<'asc' | 'desc'>('desc')

async function carregarPaginaVendas() {
  carregandoTabela.value = true
  erroTabela.value = ''
  const { inicio, fim } = periodoAtualISO()
  try {
    const res = await getPaginaVendas(
      inicio,
      fim,
      page.value,
      pageSize.value,
      busca.value,
      sortKey.value,
      sortDir.value,
      filters.lojasSelecionadas.slice().sort().join(','),
      filters.idCaixa,
    )
    paginaVendas.value = res
  } catch (e) {
    erroTabela.value = e instanceof Error ? e.message : 'Falha ao carregar relatório analítico de vendas.'
  } finally {
    carregandoTabela.value = false
  }
}

const vendasComMargem = computed<VendaComMargem[]>(() => {
  if (!paginaVendas.value?.items) return []
  return paginaVendas.value.items.map((v: Venda) => {
    const valTotal = v.valTotal ?? 0
    const custo = v.custoTotal != null ? Number(v.custoTotal) : null
    const margemValor = custo != null ? valTotal - custo : 0
    const margemPercentual =
      custo != null && valTotal > 0 ? ((valTotal - custo) / valTotal) * 100 : null
    return {
      codigo: v.codigo,
      numero: v.numero,
      serie: v.serie,
      modelo: v.modelo,
      dataHora: v.dataHora,
      idCaixa: v.idCaixa,
      nomeLoja: v.nomeLoja,
      valTotal: v.valTotal,
      custoTotal: v.custoTotal,
      status: v.status,
      statusDescricao: v.statusDescricao,
      nomeUsuario: v.nomeUsuario,
      margemValor,
      margemPercentual,
    }
  })
})

function handleSort(coluna: string) {
  if (sortKey.value === coluna) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = coluna
    sortDir.value = 'desc'
  }
  page.value = 1
  void carregarPaginaVendas()
}

function handleBusca() {
  page.value = 1
  void carregarPaginaVendas()
}

const colunasTabelaVendas: DataTableColumn[] = [
  { key: 'dataHora', label: 'Data/Hora', sortable: true },
  { key: 'numero', label: 'Documento' },
  { key: 'idCaixa', label: 'PDV' },
  { key: 'nomeUsuario', label: 'Operador' },
  { key: 'valTotal', label: 'Valor Total', align: 'right', sortable: true },
  { key: 'custoTotal', label: 'Custo', align: 'right' },
  { key: 'margemValor', label: 'Margem (R$)', align: 'right' },
  { key: 'margemPercentual', label: 'Margem (%)', align: 'center' },
  { key: 'statusDescricao', label: 'Status', align: 'center' },
]

// 3. Gráficos temporais
const serieTemporal = computed(() => agg.serieTemporalFaturamento())
const diaSemana = computed(() => agg.vendasPorDiaSemana())

// Watchers
watch(
  () => [
    filters.periodo,
    filters.range.inicio,
    filters.range.fim,
    filters.idCaixa,
    filters.lojasSelecionadas.join(','),
    vendasStore.resumo,
    vendasStore.revisao,
  ],
  () => {
    page.value = 1
    void carregarVendedores()
    void carregarPaginaVendas()
  },
  { immediate: true },
)

watch(page, () => {
  void carregarPaginaVendas()
})

onUnmounted(() => consultaVendedores?.abort())

// Export CSV com Margem
watchEffect(() => {
  if (vendasComMargem.value.length) {
    exportStore.registrar(
      'relatorio-vendas-margem',
      [
        { chave: 'dataHora', rotulo: 'Data/Hora' },
        { chave: 'numero', rotulo: 'Documento' },
        { chave: 'idCaixa', rotulo: 'PDV' },
        { chave: 'nomeUsuario', rotulo: 'Operador' },
        { chave: 'valTotal', rotulo: 'Valor Total' },
        { chave: 'custoTotal', rotulo: 'Custo' },
        { chave: 'margemValor', rotulo: 'Margem (R$)' },
        { chave: 'margemPercentual', rotulo: 'Margem (%)' },
        { chave: 'statusDescricao', rotulo: 'Status' },
      ],
      vendasComMargem.value.map((v) => ({
        dataHora: formatDateTime(v.dataHora),
        numero: `${v.numero}${v.serie ? `-${v.serie}` : ''}`,
        idCaixa: `Caixa ${v.idCaixa}`,
        nomeUsuario: v.nomeUsuario,
        valTotal: formatCurrency(Number(v.valTotal) || 0),
        custoTotal: v.custoTotal != null ? formatCurrency(Number(v.custoTotal)) : '—',
        margemValor: v.custoTotal != null ? formatCurrency(Number(v.margemValor)) : '—',
        margemPercentual: v.margemPercentual != null ? formatPercent(Number(v.margemPercentual), true) : '—',
        statusDescricao: v.statusDescricao || '—',
      })),
    )
  }
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Vendas"
      subtitle="Relatório analítico de vendas, faturamento por período e margem de rentabilidade."
    />

    <GlobalFilters />

    <div v-if="vendasStore.carregando" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SkeletonCard v-for="i in 4" :key="i" variant="kpi" />
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
      <!-- KPIs Estruturais de Faturamento e Margem -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Vendido"
          :value="formatCurrency(agg.kpisGerais.value.totalPeriodo)"
          icon="bi-cash-coin"
          tone="brand"
          :suffix="`${agg.kpisGerais.value.numeroVendas} pedidos faturados`"
        />
        <KpiCard
          label="Custo Total (CMV)"
          :value="agg.kpisGerais.value.custoTotal != null ? formatCurrency(agg.kpisGerais.value.custoTotal) : '—'"
          icon="bi-box-seam"
          :suffix="agg.kpisGerais.value.isCustoEstimado ? 'Estimado pelo cadastro' : 'Custo real registrado'"
        />
        <KpiCard
          label="Lucro Bruto (Margem R$)"
          :value="agg.kpisGerais.value.lucroBruto != null ? formatCurrency(agg.kpisGerais.value.lucroBruto) : '—'"
          icon="bi-graph-up-arrow"
          :tone="(agg.kpisGerais.value.lucroBruto ?? 0) >= 0 ? 'brand' : 'critical'"
          suffix="Faturamento menos custo total"
        />
        <KpiCard
          label="Margem Média (%)"
          :value="agg.kpisGerais.value.margemLucro != null ? formatPercent(agg.kpisGerais.value.margemLucro, true) : '—'"
          icon="bi-pie-chart-fill"
          :badge="agg.kpisGerais.value.margemLucro != null ? (agg.kpisGerais.value.margemLucro >= 20 ? 'Margem Saudável' : 'Atenção') : undefined"
          :badge-variant="agg.kpisGerais.value.margemLucro != null && agg.kpisGerais.value.margemLucro >= 20 ? 'green' : 'amber'"
          suffix="Percentual de margem sobre vendas"
        />
      </div>

      <!-- Gráficos de Evolução e Dias -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="rounded-card bg-surface p-5 shadow-sm border border-surface-border/50">
          <p class="mb-2 text-sm font-semibold text-ink">Vendas no período (por {{ serieTemporal.granularidade }})</p>
          <EmptyState v-if="agg.kpisGerais.value.numeroVendas === 0" title="Sem vendas no período selecionado" />
          <LineAreaChart v-else :categories="serieTemporal.categorias" :series="[{ name: 'Faturamento', data: serieTemporal.valores }]" :value-formatter="formatCompact" />
        </div>
        <div class="rounded-card bg-surface p-5 shadow-sm border border-surface-border/50">
          <p class="mb-2 text-sm font-semibold text-ink">Comparativo entre os dias da semana</p>
          <BarChart
            :categories="diaSemana.categorias"
            :series="[{ name: 'Faturamento', data: diaSemana.valores }]"
            :highlight-index="diaSemana.highlightIndex"
            :value-formatter="formatCompact"
          />
        </div>
      </div>

      <!-- Relatório Analítico de Vendas com Margem (Solicitação do Fábio) -->
      <section class="rounded-card bg-surface p-5 shadow-sm border border-surface-border/70" aria-labelledby="titulo-relatorio-vendas">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border/50 pb-3">
          <div>
            <h2 id="titulo-relatorio-vendas" class="text-base font-bold text-ink flex items-center gap-2">
              <i class="bi bi-table text-brand-600" />
              Relatório Analítico de Vendas
            </h2>
            <p class="text-xs text-ink-muted">
              Listagem detalhada dos pedidos faturados com indicadores de Custo, Lucro e Margem (%).
            </p>
          </div>

          <!-- Campo de Busca -->
          <div class="flex items-center gap-2">
            <div class="relative">
              <i class="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted" />
              <input
                v-model="busca"
                type="search"
                placeholder="Buscar documento ou operador..."
                class="w-64 rounded-btn border border-surface-border bg-surface-bg py-1.5 pl-8 pr-3 text-xs outline-none focus:border-brand-500"
                @keyup.enter="handleBusca"
              />
            </div>
            <BaseButton variant="secondary" size="sm" @click="handleBusca">
              Filtrar
            </BaseButton>
          </div>
        </div>

        <div v-if="carregandoTabela" class="py-8">
          <SkeletonCard variant="table-row" :rows="6" />
        </div>

        <EmptyState
          v-else-if="erroTabela"
          icon="bi-exclamation-triangle"
          title="Não foi possível carregar as vendas"
          :description="erroTabela"
        >
          <BaseButton variant="secondary" class="mt-3" @click="carregarPaginaVendas">Tentar novamente</BaseButton>
        </EmptyState>

        <template v-else>
          <div class="mt-4 overflow-x-auto">
            <DataTable
              :columns="colunasTabelaVendas"
              :rows="vendasComMargem"
              :row-key="(r: Record<string, unknown>) => String(r.codigo || '')"
              :sort-key="sortKey"
              :sort-dir="sortDir"
              empty-title="Nenhuma venda encontrada"
              empty-description="Não há vendas faturadas no período e filtros informados."
              @sort="handleSort"
            >
              <template #cell-dataHora="{ row }">
                <span class="text-xs font-medium text-ink">{{ formatDateTime(String(row.dataHora || '')) }}</span>
              </template>

              <template #cell-numero="{ row }">
                <span class="font-mono text-xs font-semibold text-ink">
                  {{ String(row.numero || '') }}{{ row.serie ? `-${String(row.serie)}` : '' }}
                </span>
              </template>

              <template #cell-idCaixa="{ row }">
                <span class="text-xs text-ink-muted">Caixa {{ String(row.idCaixa || '') }}</span>
              </template>

              <template #cell-nomeUsuario="{ row }">
                <span class="text-xs text-ink truncate max-w-[140px] inline-block">{{ String(row.nomeUsuario || '') }}</span>
              </template>

              <template #cell-valTotal="{ row }">
                <span class="text-xs font-bold text-ink">
                  {{ formatCurrency(Number(row.valTotal) || 0) }}
                </span>
              </template>

              <template #cell-custoTotal="{ row }">
                <span class="text-xs text-ink-muted">
                  {{ row.custoTotal != null ? formatCurrency(Number(row.custoTotal)) : '—' }}
                </span>
              </template>

              <template #cell-margemValor="{ row }">
                <span
                  class="text-xs font-semibold"
                  :class="Number(row.margemValor || 0) >= 0 ? 'text-emerald-700' : 'text-danger-700'"
                >
                  {{ row.custoTotal != null ? formatCurrency(Number(row.margemValor || 0)) : '—' }}
                </span>
              </template>

              <template #cell-margemPercentual="{ row }">
                <span
                  v-if="row.margemPercentual != null"
                  class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  :class="{
                    'bg-emerald-100 text-emerald-800 border border-emerald-200': Number(row.margemPercentual) >= 20,
                    'bg-amber-100 text-amber-800 border border-amber-200': Number(row.margemPercentual) >= 0 && Number(row.margemPercentual) < 20,
                    'bg-rose-100 text-rose-800 border border-rose-200': Number(row.margemPercentual) < 0,
                  }"
                >
                  <i :class="Number(row.margemPercentual) >= 20 ? 'bi bi-arrow-up-right' : (Number(row.margemPercentual) >= 0 ? 'bi bi-dash' : 'bi bi-arrow-down-right')" />
                  {{ formatPercent(Number(row.margemPercentual), true) }}
                </span>
                <span v-else class="text-xs text-ink-muted">—</span>
              </template>

              <template #cell-statusDescricao="{ row }">
                <StatusBadge :variant="statusVendaVariant(String(row.statusDescricao || ''))">
                  {{ String(row.statusDescricao || 'Faturado') }}
                </StatusBadge>
              </template>
            </DataTable>
          </div>

          <!-- Paginação -->
          <div class="mt-4 flex flex-col items-start gap-2 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
            <span>
              Exibindo {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, paginaVendas?.total ?? 0) }} de {{ formatNumber(paginaVendas?.total ?? 0) }} vendas
            </span>
            <Pagination
              v-if="(paginaVendas?.total ?? 0) > pageSize"
              v-model:page="page"
              :total="paginaVendas?.total ?? 0"
              :items-per-page="pageSize"
            />
          </div>
        </template>
      </section>

      <!-- Ranking de Vendedores -->
      <section class="rounded-card bg-surface p-5 shadow-sm border border-surface-border/50" aria-labelledby="titulo-vendedores-vendas">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="titulo-vendedores-vendas" class="text-sm font-semibold text-ink">Vendas por Vendedor</h2>
            <p class="mt-1 text-xs text-ink-muted">Valor vendido e número de pedidos atribuídos no período.</p>
          </div>
          <div v-if="rankingVendedores.length && !carregandoVendedores && !erroVendedores" class="text-right">
            <p class="text-xs text-ink-muted">Total por vendedor</p>
            <p class="text-lg font-bold text-brand-700">{{ formatCurrency(totalVendedores) }}</p>
          </div>
        </div>
        <SkeletonCard v-if="carregandoVendedores" class="mt-4" variant="list" :rows="3" />
        <EmptyState v-else-if="erroVendedores" class="mt-4" icon="bi-exclamation-triangle" title="Não foi possível carregar os vendedores" :description="erroVendedores">
          <BaseButton variant="secondary" class="mt-3" @click="carregarVendedores">Tentar novamente</BaseButton>
        </EmptyState>
        <div v-else class="mt-4">
          <DataTable
            :columns="colunasVendedores"
            :rows="rankingVendedores"
            :row-key="(r: Record<string, unknown>) => JSON.stringify([r.idLoja, r.codigo])"
            empty-title="Sem vendas identificadas por vendedor"
            empty-description="Não há vendas detalhadas por vendedor para este período e estas empresas."
          >
            <template #cell-nome="{ row }"><span class="font-semibold">{{ String(row.nome || '') }}</span></template>
            <template #cell-quantidadeVendas="{ row }">{{ String(row.quantidadeVendas || '') }}</template>
            <template #cell-ticketMedio="{ row }">{{ formatCurrency(Number(row.quantidadeVendas) ? (Number(row.totalVendido) / Number(row.quantidadeVendas)) : 0) }}</template>
            <template #cell-totalVendido="{ row }"><span class="font-bold">{{ formatCurrency(Number(row.totalVendido) || 0) }}</span></template>
          </DataTable>
        </div>
      </section>

      <!-- Pagamentos (Poliana) -->
      <section v-if="somentePoliana" id="pagamentos" class="scroll-mt-24" aria-labelledby="titulo-pagamentos-vendas">
        <h2 id="titulo-pagamentos-vendas" class="mb-3 text-base font-semibold text-ink">Pagamentos</h2>
        <PagamentosResumo />
      </section>
    </template>
  </div>
</template>

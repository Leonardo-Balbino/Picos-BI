<script setup lang="ts">
import { computed, ref } from 'vue'
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from 'reka-ui'
import PageHeader from '@/components/layout/PageHeader.vue'
import GlobalFilters from '@/components/filters/GlobalFilters.vue'
import KpiCard from '@/components/ui/KpiCard.vue'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import Pagination from '@/components/ui/Pagination.vue'
import RankingList, { type RankingItem } from '@/components/ui/RankingList.vue'
import ParetoChart from '@/components/charts/ParetoChart.vue'
import HBarChart from '@/components/charts/HBarChart.vue'
import { useVendasStore } from '@/stores/useVendasStore'
import { useAggregations, type ProdutoTabela } from '@/composables/useAggregations'
import { usePagination } from '@/composables/usePagination'
import { formatCurrency, formatCompact, formatNumber, formatPercent } from '@/utils/formatters'
import { CHART_COLORS } from '@/components/charts/ChartTheme'

const vendasStore = useVendasStore()
const agg = useAggregations()

const abc = computed(() => agg.curvaABC())
const porCategoria = computed(() => agg.vendasPorCategoria())
const alertaEstoque = computed(() => agg.alertaEstoque())

const produtoCampeao = computed(() => agg.topProdutos(1, 'faturamento')[0])
const faturamentoTotal = computed(() => agg.kpisGerais.value.faturamento)
const margemMedia = computed(() => {
  const linhas = agg.tabelaProdutos().filter((p) => p.faturamento > 0)
  if (linhas.length === 0) return 0
  return linhas.reduce((acc, p) => acc + p.margem, 0) / linhas.length
})

const abaRanking = ref<'faturamento' | 'quantidade'>('faturamento')
const topRanking = computed(() => agg.topProdutos(5, abaRanking.value))
const maiorValorRanking = computed(() =>
  abaRanking.value === 'faturamento' ? (topRanking.value[0]?.valor ?? 1) : (topRanking.value[0]?.quantidade ?? 1),
)
const itemsRanking = computed<RankingItem[]>(() =>
  topRanking.value.map((p, i) => ({
    id: p.produtoId,
    rank: i + 1,
    avatarText: String(i + 1),
    avatarColor: CHART_COLORS.roxo,
    title: p.nome,
    subtitle: p.categoriaNome,
    value: abaRanking.value === 'faturamento' ? formatCurrency(p.valor) : formatNumber(p.quantidade),
    progress: Math.round(
      ((abaRanking.value === 'faturamento' ? p.valor : p.quantidade) / maiorValorRanking.value) * 100,
    ),
  })),
)

const busca = ref('')
const sortKey = ref('faturamento')
const sortDir = ref<'asc' | 'desc'>('desc')

const linhasTabela = computed<ProdutoTabela[]>(() => {
  const termo = busca.value.trim().toLowerCase()
  const base = agg.tabelaProdutos()
  const filtradas = !termo
    ? base
    : base.filter((p) => p.sku.toLowerCase().includes(termo) || p.nome.toLowerCase().includes(termo))
  const linhas = [...filtradas]
  linhas.sort((a, b) => {
    const dir = sortDir.value === 'asc' ? 1 : -1
    const key = sortKey.value as keyof ProdutoTabela
    const va = a[key]
    const vb = b[key]
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
    return String(va).localeCompare(String(vb)) * dir
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

const { page, paginated } = usePagination(linhasTabela, 8)

const columns: DataTableColumn[] = [
  { key: 'sku', label: 'SKU' },
  { key: 'nome', label: 'Nome do Produto', sortable: true },
  { key: 'categoriaNome', label: 'Categoria' },
  { key: 'quantidade', label: 'Qtd. Vendida', align: 'right', sortable: true },
  { key: 'faturamento', label: 'Faturamento', align: 'right', sortable: true },
  { key: 'ticketMedio', label: 'Ticket Médio', align: 'right' },
  { key: 'margem', label: 'Margem %', align: 'right', sortable: true },
]
</script>

<template>
  <div>
    <PageHeader title="Produtos" subtitle="Análise de performance e gestão do portfólio de produtos." />
    <GlobalFilters />

    <div v-if="!vendasStore.carregado" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SkeletonCard v-for="i in 4" :key="i" variant="kpi" />
    </div>

    <template v-else>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Produtos Ativos" :value="formatNumber(vendasStore.produtos.length)" icon="bi-box-seam" suffix="Portfólio total" />
        <KpiCard
          label="Itens Vendidos"
          :value="formatCompact(agg.kpisGerais.value.itensVendidos)"
          icon="bi-cart-check"
          :variation="agg.kpisGerais.value.itensVendidosVar"
        />
        <KpiCard
          label="Produto Campeão"
          :value="produtoCampeao?.nome ?? '-'"
          icon="bi-trophy"
          :suffix="produtoCampeao ? `${formatCurrency(produtoCampeao.valor)} (${formatPercent(faturamentoTotal ? produtoCampeao.valor / faturamentoTotal : 0)} do total)` : undefined"
        />
        <KpiCard label="Margem Média" :value="formatPercent(margemMedia, true)" icon="bi-percent" />
      </div>

      <div class="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="rounded-card bg-surface p-5 shadow-sm lg:col-span-2">
          <p class="text-sm font-semibold text-ink">Curva ABC de Produtos</p>
          <p class="mb-2 text-xs text-ink-muted">Classificação por impacto no faturamento</p>
          <ParetoChart :categorias="abc.categorias" :valores="abc.valores" :classes="abc.classes" :acumulado="abc.acumulado" />
          <div class="mt-3 flex flex-wrap items-center gap-4 text-xs text-ink-muted">
            <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm" :style="{ background: CHART_COLORS.roxo }" /> Classe A (80%)</span>
            <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm" style="background:#8B6DB0" /> Classe B (15%)</span>
            <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm" style="background:#D8D3E0" /> Classe C (5%)</span>
            <span class="flex items-center gap-1.5"><span class="h-0.5 w-3" :style="{ background: CHART_COLORS.ambar }" /> % Acumulado</span>
          </div>
        </div>

        <div class="rounded-card bg-surface p-5 shadow-sm">
          <p class="mb-2 text-sm font-semibold text-ink">Faturamento por Categoria</p>
          <EmptyState v-if="porCategoria.length === 0" title="Sem vendas no período" />
          <HBarChart
            v-else
            :categories="porCategoria.map((c) => c.nome)"
            :series="[{ name: 'Faturamento', data: porCategoria.map((c) => c.valor) }]"
            :value-formatter="formatCompact"
            :height="220"
          />
        </div>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div id="detalhamento-produtos" class="rounded-card bg-surface p-5 shadow-sm lg:col-span-2">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-ink">Detalhamento de Produtos</p>
              <p class="text-xs text-ink-muted">Visão tabular com métricas de rentabilidade</p>
            </div>
            <input
              v-model="busca"
              type="search"
              placeholder="Buscar SKU, nome..."
              class="w-full max-w-xs rounded-btn border border-surface-border bg-surface-bg px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div class="mt-4">
            <DataTable
              :columns="columns"
              :rows="paginated"
              :row-key="(r) => r.produtoId"
              :sort-key="sortKey"
              :sort-dir="sortDir"
              empty-title="Nenhum produto encontrado"
              @sort="handleSort"
            >
              <template #cell-categoriaNome="{ row }">
                <span class="rounded-full bg-surface-bg px-2 py-0.5 text-xs text-ink-muted">{{ row.categoriaNome }}</span>
              </template>
              <template #cell-faturamento="{ row }">{{ formatCurrency(row.faturamento) }}</template>
              <template #cell-ticketMedio="{ row }">{{ formatCurrency(row.ticketMedio) }}</template>
              <template #cell-margem="{ row }">{{ formatPercent(row.margem, true) }}</template>
            </DataTable>
          </div>
          <div class="mt-4 flex items-center justify-between gap-3 text-xs text-ink-muted">
            <span>Mostrando {{ linhasTabela.length === 0 ? 0 : (page - 1) * 8 + 1 }}-{{ Math.min(page * 8, linhasTabela.length) }} de {{ linhasTabela.length }}</span>
            <Pagination v-model:page="page" :total="linhasTabela.length" :items-per-page="8" />
          </div>
        </div>

        <div class="flex flex-col gap-4">
          <div class="rounded-card bg-surface p-5 shadow-sm">
            <div class="mb-3 flex items-center justify-between">
              <p class="text-sm font-semibold text-ink">Top 5 Mais Vendidos</p>
              <a href="#detalhamento-produtos" class="text-xs font-semibold text-green-700 hover:underline">Ver ranking completo</a>
            </div>
            <TabsRoot v-model="abaRanking">
              <TabsList class="mb-3 inline-flex rounded-btn bg-surface-bg p-1 text-xs font-semibold">
                <TabsTrigger
                  value="faturamento"
                  class="rounded-btn px-3 py-1.5 text-ink-muted data-[state=active]:bg-brand-700 data-[state=active]:text-white"
                >
                  Faturamento
                </TabsTrigger>
                <TabsTrigger
                  value="quantidade"
                  class="rounded-btn px-3 py-1.5 text-ink-muted data-[state=active]:bg-brand-700 data-[state=active]:text-white"
                >
                  Quantidade
                </TabsTrigger>
              </TabsList>
              <TabsContent value="faturamento">
                <RankingList :items="itemsRanking" />
              </TabsContent>
              <TabsContent value="quantidade">
                <RankingList :items="itemsRanking" />
              </TabsContent>
            </TabsRoot>
          </div>

          <div class="rounded-card border border-danger-100 bg-danger-100/40 p-5 shadow-sm">
            <p class="flex items-center gap-2 text-sm font-semibold text-danger-700">
              <i class="bi bi-exclamation-triangle-fill" /> Alerta de Estoque
            </p>
            <p class="mb-3 text-xs text-ink-muted">Produtos com alto giro e estoque crítico (&lt; 7 dias).</p>
            <p v-if="alertaEstoque.length === 0" class="text-xs text-ink-muted">Nenhum produto em situação crítica.</p>
            <div v-else class="space-y-2">
              <div
                v-for="item in alertaEstoque"
                :key="item.produtoId"
                class="rounded-btn border border-danger-100 bg-surface p-3"
              >
                <div class="flex items-center justify-between gap-2">
                  <p class="text-sm font-medium text-ink">{{ item.nome }}</p>
                  <span class="text-xs text-ink-muted">Giro/Dia: {{ item.giroDia.toFixed(1) }}</span>
                </div>
                <div class="mt-1 flex items-center justify-between gap-2 text-xs">
                  <span class="flex items-center gap-1 text-ink-muted">
                    <span class="font-mono">{{ item.sku }}</span>
                    <span class="rounded-full bg-warning-100 px-2 py-0.5 font-semibold text-warning-700">{{ item.estoque }} unid.</span>
                  </span>
                  <span class="flex items-center gap-1 font-semibold text-danger-700">
                    <i class="bi bi-hourglass-split" /> {{ item.diasRestantes < 1 ? '< 1 dia' : `${Math.round(item.diasRestantes)} dias` }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

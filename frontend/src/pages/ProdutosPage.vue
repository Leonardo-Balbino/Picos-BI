<script setup lang="ts">
import { computed, onMounted, ref, watch, watchEffect } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import GlobalFilters from '@/components/filters/GlobalFilters.vue'
import KpiCard from '@/components/ui/KpiCard.vue'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import Pagination from '@/components/ui/Pagination.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { HBarChart } from '@/components/charts/lazy'
import { useVendasStore } from '@/stores/useVendasStore'
import { useProdutosStore } from '@/stores/useProdutosStore'
import { useDimensoesStore } from '@/stores/useDimensoesStore'
import { useFiltersStore } from '@/stores/useFiltersStore'
import { useExportStore } from '@/stores/useExportStore'
import { useAggregations } from '@/composables/useAggregations'
import { useRecarregarDados } from '@/composables/useRecarregarDados'
import { usePagination } from '@/composables/usePagination'
import { formatCompact, formatNumber } from '@/utils/formatters'
import type { Produto } from '@/types'

const vendasStore = useVendasStore()
const produtosStore = useProdutosStore()
const dimensoes = useDimensoesStore()
const filters = useFiltersStore()
const exportStore = useExportStore()
const agg = useAggregations()
const { periodoAtualISO } = useRecarregarDados()

onMounted(() => produtosStore.carregar())

// Top Produtos (mercadorias-vendidas) só é buscado aqui, sob demanda — não em toda troca de
// período em qualquer tela, já que só esta página usa esse dado (ver useVendasStore.ts).
function carregarTopProdutos() {
  const { inicio, fim } = periodoAtualISO()
  vendasStore.carregarItensVendidos(inicio, fim, filters.lojasSelecionadas.slice().sort().join(','))
}
watch(() => [filters.periodo, filters.range.inicio, filters.range.fim, filters.lojasSelecionadas.join(','), vendasStore.revisao], carregarTopProdutos, { immediate: true })

const topProdutos = computed(() => agg.topItensVendidos(8))

const busca = ref('')
const linhasFiltradas = computed<Produto[]>(() => {
  const termo = busca.value.trim().toLowerCase()
  if (!termo) return produtosStore.catalogo
  return produtosStore.catalogo.filter(
    (p) => p.descricao.toLowerCase().includes(termo) || p.codigoBarras.toLowerCase().includes(termo),
  )
})
const { page, paginated } = usePagination(linhasFiltradas, 8)

watchEffect(() => {
  exportStore.registrar(
    'produtos',
    [
      { chave: 'descricao', rotulo: 'Descrição' },
      { chave: 'codigoBarras', rotulo: 'Código de Barras' },
      { chave: 'embalagem', rotulo: 'Embalagem' },
      { chave: 'ativo', rotulo: 'Status' },
    ],
    linhasFiltradas.value.map((p) => ({
      descricao: p.descricao,
      codigoBarras: p.codigoBarras,
      embalagem: p.embalagem,
      ativo: p.ativo ? 'Ativo' : 'Inativo',
    })),
  )
})

const columns: DataTableColumn[] = [
  { key: 'descricao', label: 'Descrição' },
  { key: 'codigoBarras', label: 'Código de Barras' },
  { key: 'embalagem', label: 'Embalagem' },
  { key: 'ativo', label: 'Status', align: 'center' },
]
</script>

<template>
  <div>
    <PageHeader title="Produtos" subtitle="Catálogo e ranking de mais vendidos no período." />
    <GlobalFilters />

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Itens em Estoque"
        :value="dimensoes.estoqueDisponivel ? formatNumber(dimensoes.totalItensEstoque) : 'Indisponível'"
        icon="bi-box-seam"
      />
      <KpiCard label="Produtos Ativos" :value="formatNumber(produtosStore.catalogo.filter((p) => p.ativo).length)" icon="bi-tags" suffix="Portfólio total" />
    </div>

    <div class="mt-6 rounded-card bg-surface p-5 shadow-sm">
      <p class="mb-2 text-sm font-semibold text-ink">Top produtos vendidos no período</p>
      <SkeletonCard v-if="vendasStore.carregandoItensVendidos" variant="chart" />
      <EmptyState
        v-else-if="vendasStore.erroItensVendidos"
        icon="bi-exclamation-triangle"
        title="Não foi possível carregar os produtos vendidos"
        :description="vendasStore.erroItensVendidos"
      >
        <BaseButton variant="secondary" class="mt-3" @click="carregarTopProdutos">Tentar novamente</BaseButton>
      </EmptyState>
      <EmptyState v-else-if="topProdutos.length === 0" title="Sem vendas de produtos no período" />
      <HBarChart
        v-else
        :categories="topProdutos.map((p) => p.descricao)"
        :series="[{ name: 'Faturamento', data: topProdutos.map((p) => p.valTotalLiquido) }]"
        :value-formatter="formatCompact"
        :height="280"
      />
    </div>

    <div class="mt-6 rounded-card bg-surface p-5 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-ink">Catálogo de Produtos</p>
          <p class="text-xs text-ink-muted">Cadastro base (sem preço/estoque por item)</p>
        </div>
        <input
          v-model="busca"
          type="search"
          placeholder="Buscar descrição, código de barras..."
          class="w-full max-w-xs rounded-btn border border-surface-border bg-surface-bg px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
      </div>

      <div class="mt-4">
        <div v-if="produtosStore.carregando" class="space-y-2">
          <SkeletonCard v-for="i in 4" :key="i" variant="table-row" />
        </div>
        <EmptyState
          v-else-if="produtosStore.erro"
          icon="bi-exclamation-triangle"
          title="Não foi possível carregar o catálogo"
          :description="produtosStore.erro"
        >
          <BaseButton variant="secondary" class="mt-3" @click="produtosStore.carregar">Tentar novamente</BaseButton>
        </EmptyState>
        <DataTable v-else :columns="columns" :rows="paginated" :row-key="(r) => r.codigoMercadoriaVariacao" empty-title="Nenhum produto encontrado">
          <template #cell-ativo="{ row }">
            <StatusBadge :variant="row.ativo ? 'success' : 'neutral'">{{ row.ativo ? 'Ativo' : 'Inativo' }}</StatusBadge>
          </template>
        </DataTable>
      </div>
      <div class="mt-4 flex flex-col items-start gap-2 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <span>Mostrando {{ linhasFiltradas.length === 0 ? 0 : (page - 1) * 8 + 1 }}-{{ Math.min(page * 8, linhasFiltradas.length) }} de {{ linhasFiltradas.length }}</span>
        <Pagination v-model:page="page" :total="linhasFiltradas.length" :items-per-page="8" />
      </div>
    </div>
  </div>
</template>

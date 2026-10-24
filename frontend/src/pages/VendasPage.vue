<script setup lang="ts">
import { computed, ref, watch, watchEffect, onUnmounted } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import GlobalFilters from '@/components/filters/GlobalFilters.vue'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
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
import { getVendedoresVendas, type ResumoVendedores } from '@/services/dataService'
import { formatCurrency, formatCompact } from '@/utils/formatters'

const vendasStore = useVendasStore()
const exportStore = useExportStore()
const agg = useAggregations()
const { forcarAtualizacao, periodoAtualISO } = useRecarregarDados()
const filters = useFiltersStore()
const { somentePoliana } = usePolianaLayout()

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
    const resposta = await getVendedoresVendas(inicio, fim, filters.lojasSelecionadas.slice().sort().join(','), filters.idCaixa, consulta.signal)
    if (!consulta.signal.aborted) vendedores.value = resposta
  } catch (erro) {
    if (!consulta.signal.aborted) erroVendedores.value = erro instanceof Error ? erro.message : 'Não foi possível carregar as vendas por vendedor.'
  } finally {
    if (!consulta.signal.aborted) carregandoVendedores.value = false
  }
}
watch(
  () => [filters.periodo, filters.range.inicio, filters.range.fim, filters.idCaixa, filters.lojasSelecionadas.join(','), vendasStore.resumo, vendasStore.revisao],
  () => { void carregarVendedores() },
  { immediate: true },
)
onUnmounted(() => consultaVendedores?.abort())

const serieTemporal = computed(() => agg.serieTemporalFaturamento())
const diaSemana = computed(() => agg.vendasPorDiaSemana())

watchEffect(() => {
  const diarios = agg.serieTemporalFaturamento(false)
  exportStore.registrar('vendas-diarias', [
    { chave: 'dia', rotulo: 'Dia' }, { chave: 'total', rotulo: 'Total vendido' },
  ], diarios.categorias.map((dia, i) => ({ dia, total: formatCurrency(diarios.valores[i] ?? 0) })))
})
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
          <p class="mb-2 text-sm font-semibold text-ink">Vendas no período (por {{ serieTemporal.granularidade }})</p>
          <EmptyState v-if="agg.kpisGerais.value.numeroVendas === 0" title="Sem vendas no período selecionado" />
          <LineAreaChart v-else :categories="serieTemporal.categorias" :series="[{ name: 'Faturamento', data: serieTemporal.valores }]" :value-formatter="formatCompact" />
        </div>
        <div class="rounded-card bg-surface p-5 shadow-sm">
          <p class="mb-2 text-sm font-semibold text-ink">Comparativo entre os dias</p>
          <BarChart
            :categories="diaSemana.categorias"
            :series="[{ name: 'Faturamento', data: diaSemana.valores }]"
            :highlight-index="diaSemana.highlightIndex"
             :value-formatter="formatCompact"
          />
        </div>
      </div>

      <section class="mt-6 rounded-card bg-surface p-5 shadow-sm" aria-labelledby="titulo-vendedores-vendas">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="titulo-vendedores-vendas" class="text-sm font-semibold text-ink">Vendas por vendedor</h2>
            <p class="mt-1 text-xs text-ink-muted">Valor vendido e número de vendas/pedidos no período selecionado.</p>
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
        <div v-else class="mt-4"><DataTable :columns="colunasVendedores" :rows="rankingVendedores" :row-key="r => JSON.stringify([r.idLoja, r.codigo])" empty-title="Sem vendas identificadas por vendedor" empty-description="Não há vendas detalhadas por vendedor para este período e estas empresas.">
          <template #cell-nome="{ row }"><span class="font-semibold">{{ row.nome }}</span></template>
          <template #cell-quantidadeVendas="{ row }">{{ row.quantidadeVendas }}</template>
          <template #cell-ticketMedio="{ row }">{{ formatCurrency(row.quantidadeVendas ? row.totalVendido / row.quantidadeVendas : 0) }}</template>
          <template #cell-totalVendido="{ row }"><span class="font-bold">{{ formatCurrency(row.totalVendido) }}</span></template>
        </DataTable></div>
        <p v-if="vendedores?.vendasSemDetalhamento" class="mt-3 text-xs text-ink-muted">{{ vendedores.vendasSemDetalhamento }} venda(s) deste período ainda aguardam detalhamento por vendedor.</p>
        <p v-if="vendedores?.diferencaItens" class="mt-3 text-xs text-ink-muted">O total por vendedor considera os itens; ajustes no documento representam {{ formatCurrency(vendedores.diferencaItens) }}.</p>
        <p v-if="rankingVendedores.length" class="mt-3 text-xs text-ink-muted">Cada venda conta uma vez para cada vendedor que participou dela. O valor corresponde aos itens atribuídos a ele.</p>
      </section>

      <section v-if="somentePoliana" id="pagamentos" class="mt-6 scroll-mt-24" aria-labelledby="titulo-pagamentos-vendas">
        <h2 id="titulo-pagamentos-vendas" class="mb-3 text-base font-semibold text-ink">Pagamentos</h2>
        <PagamentosResumo />
      </section>

    </template>
  </div>
</template>

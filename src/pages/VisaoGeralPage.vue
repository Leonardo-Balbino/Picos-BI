<script setup lang="ts">
import { computed } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import GlobalFilters from '@/components/filters/GlobalFilters.vue'
import KpiCard from '@/components/ui/KpiCard.vue'
import RankingList, { type RankingItem } from '@/components/ui/RankingList.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import LineAreaChart from '@/components/charts/LineAreaChart.vue'
import BarChart from '@/components/charts/BarChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import { CHART_PALETTE } from '@/components/charts/ChartTheme'
import { useVendasStore } from '@/stores/useVendasStore'
import { useAggregations } from '@/composables/useAggregations'
import { formatCurrency, formatCompact, formatNumber } from '@/utils/formatters'

const vendasStore = useVendasStore()
const agg = useAggregations()

const serieTemporal = computed(() => agg.serieTemporalFaturamento())
const diaSemana = computed(() => agg.vendasPorDiaSemana())
const formasPagamento = computed(() => agg.porFormaPagamento())
const topProdutos = computed(() => agg.topProdutos(5, 'faturamento'))
const topVendedores = computed(() => agg.topVendedores(5))
const porCategoria = computed(() => agg.vendasPorCategoria())

const maiorValorProduto = computed(() => topProdutos.value[0]?.valor ?? 1)

const itemsProdutos = computed<RankingItem[]>(() =>
  topProdutos.value.map((p) => ({
    id: p.produtoId,
    title: p.nome,
    value: formatCurrency(p.valor),
    progress: Math.max(6, Math.round((p.valor / maiorValorProduto.value) * 100)),
  })),
)

const itemsVendedores = computed<RankingItem[]>(() =>
  topVendedores.value.map((v, i) => ({
    id: v.vendedorId,
    rank: i + 1,
    avatarText: v.nome
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase(),
    title: v.nome,
    subtitle: v.loja,
    value: formatCurrency(v.valor),
    meta: `${formatNumber(v.nVendas)} vendas`,
  })),
)

const itemsCategoria = computed<RankingItem[]>(() =>
  porCategoria.value.map((c, i) => ({
    id: c.categoriaId,
    title: c.nome,
    value: formatCurrency(c.valor),
    progress: Math.round(c.percentual),
    progressColor: CHART_PALETTE[i % CHART_PALETTE.length],
  })),
)
</script>

<template>
  <div>
    <PageHeader title="Visão Geral" />
    <GlobalFilters />

    <div v-if="!vendasStore.carregado" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <SkeletonCard v-for="i in 5" :key="i" variant="kpi" />
    </div>

    <template v-else>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Faturamento"
          :value="formatCurrency(agg.kpisGerais.value.faturamento)"
          icon="bi-currency-dollar"
          :variation="agg.kpisGerais.value.faturamentoVar"
          highlight
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
          label="Itens Vendidos"
          :value="formatNumber(agg.kpisGerais.value.itensVendidos)"
          icon="bi-box-seam"
          suffix="Volume total"
        />
        <KpiCard label="Meta do Mês" :progress="agg.metaDoMes.value.progresso" />
      </div>

      <div class="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="rounded-card bg-surface p-5 shadow-sm lg:col-span-2">
          <p class="mb-2 text-sm font-semibold text-ink">Faturamento ao longo do tempo</p>
          <LineAreaChart
            :categories="serieTemporal.categorias"
            :series="[{ name: 'Faturamento', data: serieTemporal.valores }]"
            :meta-value="agg.metaDoMes.value.meta"
            meta-label="Meta (mês)"
            :value-formatter="formatCompact"
          />
        </div>

        <div class="flex flex-col gap-4">
          <div class="rounded-card bg-surface p-5 shadow-sm">
            <p class="mb-2 text-sm font-semibold text-ink">Vendas por dia da semana</p>
            <BarChart
              :categories="diaSemana.categorias"
              :series="[{ name: 'Vendas', data: diaSemana.valores }]"
              :highlight-index="diaSemana.highlightIndex"
              :height="140"
            />
          </div>
          <div class="rounded-card bg-surface p-5 shadow-sm">
            <p class="mb-2 text-sm font-semibold text-ink">Por Forma de Pagamento</p>
            <DonutChart
              :labels="formasPagamento.map((f) => f.label)"
              :series="formasPagamento.map((f) => f.valor)"
              :value-formatter="formatCompact"
              :height="180"
            />
          </div>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="rounded-card bg-surface p-5 shadow-sm">
          <p class="mb-3 text-sm font-semibold text-ink">Top 5 Produtos</p>
          <EmptyState v-if="itemsProdutos.length === 0" title="Sem vendas de produtos no período" />
          <RankingList v-else :items="itemsProdutos" />
        </div>
        <div class="rounded-card bg-surface p-5 shadow-sm">
          <p class="mb-3 text-sm font-semibold text-ink">Top 5 Vendedores</p>
          <EmptyState v-if="itemsVendedores.length === 0" title="Sem vendas no período" />
          <RankingList v-else :items="itemsVendedores" />
        </div>
        <div class="rounded-card bg-surface p-5 shadow-sm">
          <p class="mb-3 text-sm font-semibold text-ink">Vendas por Categoria</p>
          <EmptyState v-if="itemsCategoria.length === 0" title="Sem vendas no período" />
          <RankingList v-else :items="itemsCategoria" />
        </div>
      </div>
    </template>
  </div>
</template>

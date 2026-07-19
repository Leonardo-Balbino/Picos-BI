<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import GlobalFilters from '@/components/filters/GlobalFilters.vue'
import KpiCard from '@/components/ui/KpiCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { LineAreaChart, BarChart, HBarChart } from '@/components/charts/lazy'
import { useVendasStore } from '@/stores/useVendasStore'
import { useDimensoesStore } from '@/stores/useDimensoesStore'
import { useExportStore } from '@/stores/useExportStore'
import { useAggregations } from '@/composables/useAggregations'
import { useRecarregarDados } from '@/composables/useRecarregarDados'
import { formatCurrency, formatCompact, formatNumber } from '@/utils/formatters'

const vendasStore = useVendasStore()
const dimensoes = useDimensoesStore()
const exportStore = useExportStore()
const agg = useAggregations()
const { forcarAtualizacao } = useRecarregarDados()

const serieTemporal = computed(() => agg.serieTemporalFaturamento())
const diaSemana = computed(() => agg.vendasPorDiaSemana())
const porPdv = computed(() => agg.vendasPorPDV())
const porHora = computed(() => agg.vendasPorHora())

watchEffect(() => {
  exportStore.registrar(
    'visao-geral',
    [
      { chave: 'indicador', rotulo: 'Indicador' },
      { chave: 'valor', rotulo: 'Valor' },
    ],
    [
      { indicador: 'Total de Vendas', valor: formatCurrency(agg.kpisGerais.value.totalPeriodo) },
      { indicador: 'Vendas de Hoje', valor: formatCurrency(agg.kpisGerais.value.vendasHoje) },
      { indicador: 'Nº de Vendas', valor: formatNumber(agg.kpisGerais.value.numeroVendas) },
      { indicador: 'Ticket Médio', valor: formatCurrency(agg.kpisGerais.value.ticketMedio) },
      {
        indicador: 'Itens em Estoque',
        valor: dimensoes.estoqueDisponivel ? formatNumber(dimensoes.totalItensEstoque) : 'Indisponível',
      },
    ],
  )
})
</script>

<template>
  <div>
    <PageHeader title="Visão Geral" />
    <GlobalFilters />

    <div v-if="vendasStore.carregando" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
      <SkeletonCard v-for="i in 5" :key="i" variant="kpi" />
      <p v-if="vendasStore.progresso.totalPaginas > 1" class="col-span-full text-xs text-ink-muted">
        Carregando vendas… página {{ vendasStore.progresso.pagina }} de {{ vendasStore.progresso.totalPaginas }}
      </p>
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
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Total de Vendas"
          :value="formatCurrency(agg.kpisGerais.value.totalPeriodo)"
          icon="bi-currency-dollar"
          highlight
        />
        <KpiCard label="Vendas de Hoje" :value="formatCurrency(agg.kpisGerais.value.vendasHoje)" icon="bi-calendar-check" />
        <KpiCard label="Nº de Vendas" :value="formatNumber(agg.kpisGerais.value.numeroVendas)" icon="bi-receipt" />
        <KpiCard label="Ticket Médio" :value="formatCurrency(agg.kpisGerais.value.ticketMedio)" icon="bi-tag" />
        <KpiCard
          label="Itens em Estoque"
          :value="dimensoes.estoqueDisponivel ? formatNumber(dimensoes.totalItensEstoque) : 'Indisponível'"
          icon="bi-box-seam"
        />
      </div>

      <div class="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div class="rounded-card bg-surface p-5 shadow-sm xl:col-span-2">
          <p class="mb-2 text-sm font-semibold text-ink">Vendas no período</p>
          <EmptyState v-if="agg.kpisGerais.value.numeroVendas === 0" title="Sem vendas no período selecionado" />
          <LineAreaChart
            v-else
            :categories="serieTemporal.categorias"
            :series="[{ name: 'Faturamento', data: serieTemporal.valores }]"
            :value-formatter="formatCompact"
          />
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

      <div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="rounded-card bg-surface p-5 shadow-sm">
          <p class="mb-2 text-sm font-semibold text-ink">Total de venda pelo PDV</p>
          <EmptyState v-if="porPdv.categorias.length === 0" title="Sem vendas no período selecionado" />
          <HBarChart v-else :categories="porPdv.categorias" :series="[{ name: 'Faturamento', data: porPdv.valores }]" :value-formatter="formatCompact" />
        </div>
        <div class="rounded-card bg-surface p-5 shadow-sm">
          <p class="mb-2 text-sm font-semibold text-ink">Total de venda por horário</p>
          <BarChart
            :categories="porHora.categorias"
            :series="[{ name: 'Faturamento', data: porHora.valores }]"
            :highlight-index="porHora.highlightIndex"
            :value-formatter="formatCompact"
          />
        </div>
      </div>
    </template>
  </div>
</template>

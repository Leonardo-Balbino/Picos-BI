<script setup lang="ts">
import { computed, watch, watchEffect } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import GlobalFilters from '@/components/filters/GlobalFilters.vue'
import KpiCard from '@/components/ui/KpiCard.vue'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { LineAreaChart } from '@/components/charts/lazy'
import { useVendasStore } from '@/stores/useVendasStore'
import { useFinanceiroStore } from '@/stores/useFinanceiroStore'
import { useFiltersStore } from '@/stores/useFiltersStore'
import { useExportStore } from '@/stores/useExportStore'
import { useAggregations } from '@/composables/useAggregations'
import { useRecarregarDados } from '@/composables/useRecarregarDados'
import { useUiStore } from '@/stores/useUiStore'
import { formatCurrency, formatCompact, formatDate } from '@/utils/formatters'
import { exportarCsv, imprimir } from '@/utils/exportar'
import type { ContaPendente } from '@/types'

const vendasStore = useVendasStore()
const financeiroStore = useFinanceiroStore()
const filters = useFiltersStore()
const exportStore = useExportStore()
const agg = useAggregations()
const ui = useUiStore()
const { forcarAtualizacao, periodoAtualISO } = useRecarregarDados()

function carregarFinanceiro() {
  const { inicio, fim } = periodoAtualISO()
  financeiroStore.carregarPeriodo(inicio, fim)
}
watch(() => [filters.periodo, filters.range.inicio, filters.range.fim], carregarFinanceiro, { immediate: true })

const serie = computed(() => agg.serieTemporalFaturamento())
const ultimosDias = computed(() => {
  const n = Math.min(7, serie.value.categorias.length)
  return serie.value.categorias.slice(-n).map((data, i) => ({
    data,
    faturamento: serie.value.valores.slice(-n)[i],
  }))
})

const totalAReceber = computed(() => financeiroStore.aReceber.reduce((acc, c) => acc + c.valSaldo, 0))
const totalAPagar = computed(() => financeiroStore.aPagar.reduce((acc, c) => acc + c.valSaldo, 0))

interface LinhaVencimento extends ContaPendente, Record<string, unknown> {
  tipo: 'Receber' | 'Pagar'
}

const vencimentos = computed<LinhaVencimento[]>(() => {
  const receber: LinhaVencimento[] = financeiroStore.aReceber.map((c) => ({ ...c, tipo: 'Receber' }))
  const pagar: LinhaVencimento[] = financeiroStore.aPagar.map((c) => ({ ...c, tipo: 'Pagar' }))
  return [...receber, ...pagar].sort((a, b) => a.dtVencimento.localeCompare(b.dtVencimento))
})

function vencido(linha: LinhaVencimento): boolean {
  return linha.valSaldo > 0 && new Date(linha.dtVencimento) < new Date()
}

watchEffect(() => {
  exportStore.registrar(
    'relatorios-vencimentos',
    [
      { chave: 'nome', rotulo: 'Pessoa' },
      { chave: 'tipo', rotulo: 'Tipo' },
      { chave: 'dtVencimento', rotulo: 'Vencimento' },
      { chave: 'valSaldo', rotulo: 'Saldo' },
    ],
    vencimentos.value.map((v) => ({
      nome: v.nome,
      tipo: vencido(v) ? 'Vencido' : v.tipo,
      dtVencimento: formatDate(v.dtVencimento),
      valSaldo: formatCurrency(v.valSaldo),
    })),
  )
})

function exportarRelatorioCsv() {
  exportarCsv(
    'vendas-por-periodo',
    [
      { chave: 'data', rotulo: 'Data' },
      { chave: 'faturamento', rotulo: 'Faturamento' },
    ],
    ultimosDias.value.map((d) => ({ data: d.data, faturamento: formatCurrency(d.faturamento) })),
  )
  ui.toast({ title: 'CSV exportado', variant: 'success' })
}

function exportarRelatorioPdf() {
  imprimir()
}

const columnsVencimentos: DataTableColumn[] = [
  { key: 'nome', label: 'Pessoa' },
  { key: 'tipo', label: 'Tipo', align: 'center' },
  { key: 'dtVencimento', label: 'Vencimento' },
  { key: 'valSaldo', label: 'Saldo', align: 'right' },
]
</script>

<template>
  <div>
    <PageHeader title="Relatórios" subtitle="Vendas por período e situação financeira." />
    <GlobalFilters />

    <div v-if="vendasStore.carregando" class="grid grid-cols-1 gap-4">
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
      <div class="rounded-card bg-surface p-5 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm font-semibold text-ink">Vendas por Período</p>
          <div class="no-print flex gap-3">
            <BaseButton variant="secondary" icon="bi-file-earmark-pdf" @click="exportarRelatorioPdf">Exportar PDF</BaseButton>
            <BaseButton variant="primary" icon="bi-file-earmark-excel" @click="exportarRelatorioCsv">Exportar Excel</BaseButton>
          </div>
        </div>

        <div class="mt-4">
          <EmptyState v-if="serie.valores.every((v) => v === 0)" title="Sem vendas no período selecionado" />
          <LineAreaChart v-else :categories="serie.categorias" :series="[{ name: 'Faturamento', data: serie.valores }]" :value-formatter="formatCompact" />
        </div>

        <div class="mt-6 border-t border-surface-border pt-6">
          <p class="mb-2 text-sm font-semibold text-ink">Últimos dias do período</p>
          <DataTable
            :columns="[
              { key: 'data', label: 'Data' },
              { key: 'faturamento', label: 'Faturamento', align: 'right' },
            ]"
            :rows="ultimosDias"
            :row-key="(r) => r.data"
          >
            <template #cell-faturamento="{ row }">{{ formatCurrency(row.faturamento) }}</template>
          </DataTable>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <KpiCard label="A Receber no Período" :value="formatCurrency(totalAReceber)" icon="bi-arrow-down-circle" />
        <KpiCard label="A Pagar no Período" :value="formatCurrency(totalAPagar)" icon="bi-arrow-up-circle" />
      </div>

      <div class="mt-6 rounded-card bg-surface p-5 shadow-sm">
        <p class="mb-3 text-sm font-semibold text-ink">Vencimentos</p>
        <div v-if="financeiroStore.carregando" class="space-y-2">
          <SkeletonCard v-for="i in 3" :key="i" variant="table-row" />
        </div>
        <EmptyState
          v-else-if="financeiroStore.erro"
          icon="bi-exclamation-triangle"
          title="Não foi possível carregar as contas pendentes"
          :description="financeiroStore.erro"
        >
          <BaseButton variant="secondary" class="mt-3" @click="carregarFinanceiro">Tentar novamente</BaseButton>
        </EmptyState>
        <DataTable v-else :columns="columnsVencimentos" :rows="vencimentos" :row-key="(r) => `${r.tipo}-${r.idDocumento}`" empty-title="Nenhuma conta pendente no período">
          <template #cell-dtVencimento="{ row }">{{ formatDate(row.dtVencimento) }}</template>
          <template #cell-valSaldo="{ row }">{{ formatCurrency(row.valSaldo) }}</template>
          <template #cell-tipo="{ row }">
            <StatusBadge :variant="vencido(row) ? 'danger' : 'neutral'">{{ vencido(row) ? 'Vencido' : row.tipo }}</StatusBadge>
          </template>
        </DataTable>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, watchEffect } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import GlobalFilters from '@/components/filters/GlobalFilters.vue'
import KpiCard from '@/components/ui/KpiCard.vue'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { HBarChart } from '@/components/charts/lazy'
import { useVendedoresStore } from '@/stores/useVendedoresStore'
import { useFiltersStore } from '@/stores/useFiltersStore'
import { useExportStore } from '@/stores/useExportStore'
import { useRecarregarDados } from '@/composables/useRecarregarDados'
import { formatCurrency, formatCompact } from '@/utils/formatters'

const vendedoresStore = useVendedoresStore()
const filters = useFiltersStore()
const exportStore = useExportStore()
const { periodoAtualISO } = useRecarregarDados()

function carregar() {
  const { inicio, fim } = periodoAtualISO()
  vendedoresStore.carregarPeriodo(inicio, fim)
}

watch(() => [filters.periodo, filters.range.inicio, filters.range.fim], carregar, { immediate: true })

const rankingOrdenado = computed(() => [...vendedoresStore.comissoes].sort((a, b) => b.valTotalLiquido - a.valTotalLiquido))
const faturamentoTotal = computed(() => rankingOrdenado.value.reduce((acc, c) => acc + c.valTotalLiquido, 0))
const comissaoTotal = computed(() => rankingOrdenado.value.reduce((acc, c) => acc + c.valTotalComissao, 0))

watchEffect(() => {
  exportStore.registrar(
    'vendedores',
    [
      { chave: 'nomeFuncionario', rotulo: 'Funcionário' },
      { chave: 'valTotalLiquido', rotulo: 'Faturamento' },
      { chave: 'valTotalComissao', rotulo: 'Comissão' },
    ],
    rankingOrdenado.value.map((c) => ({
      nomeFuncionario: c.nomeFuncionario,
      valTotalLiquido: formatCurrency(c.valTotalLiquido),
      valTotalComissao: formatCurrency(c.valTotalComissao),
    })),
  )
})

const columns: DataTableColumn[] = [
  { key: 'nomeFuncionario', label: 'Funcionário' },
  { key: 'valTotalLiquido', label: 'Faturamento', align: 'right' },
  { key: 'valTotalComissao', label: 'Comissão', align: 'right' },
]
</script>

<template>
  <div>
    <PageHeader title="Vendedores" subtitle="Faturamento e comissões por funcionário no período." />
    <GlobalFilters />

    <div v-if="vendedoresStore.carregando" class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <SkeletonCard variant="kpi" />
      <SkeletonCard variant="kpi" />
    </div>

    <EmptyState
      v-else-if="vendedoresStore.erro"
      icon="bi-exclamation-triangle"
      title="Não foi possível carregar as comissões"
      :description="vendedoresStore.erro"
    >
      <BaseButton variant="secondary" class="mt-3" @click="carregar">Tentar novamente</BaseButton>
    </EmptyState>

    <template v-else>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <KpiCard label="Faturamento Total" :value="formatCurrency(faturamentoTotal)" icon="bi-cash-stack" />
        <KpiCard label="Comissões Totais" :value="formatCurrency(comissaoTotal)" icon="bi-person-badge" />
      </div>

      <div class="mt-6 rounded-card bg-surface p-5 shadow-sm">
        <p class="mb-2 text-sm font-semibold text-ink">Faturamento por Funcionário</p>
        <EmptyState v-if="rankingOrdenado.length === 0" title="Sem comissões no período selecionado" />
        <HBarChart
          v-else
          :categories="rankingOrdenado.map((c) => c.nomeFuncionario)"
          :series="[{ name: 'Faturamento', data: rankingOrdenado.map((c) => c.valTotalLiquido) }]"
          :value-formatter="formatCompact"
          :height="260"
        />
      </div>

      <div class="mt-6 rounded-card bg-surface p-5 shadow-sm">
        <p class="mb-3 text-sm font-semibold text-ink">Detalhamento de Comissões</p>
        <DataTable :columns="columns" :rows="rankingOrdenado" :row-key="(r) => r.nomeFuncionario" empty-title="Nenhum funcionário encontrado">
          <template #cell-valTotalLiquido="{ row }">{{ formatCurrency(row.valTotalLiquido) }}</template>
          <template #cell-valTotalComissao="{ row }">{{ formatCurrency(row.valTotalComissao) }}</template>
        </DataTable>
      </div>
    </template>
  </div>
</template>

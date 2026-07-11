<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import GlobalFilters from '@/components/filters/GlobalFilters.vue'
import KpiCard from '@/components/ui/KpiCard.vue'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import RankingList, { type RankingItem } from '@/components/ui/RankingList.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import BarChart from '@/components/charts/BarChart.vue'
import { useVendasStore } from '@/stores/useVendasStore'
import { useAggregations, type VendedorTabela } from '@/composables/useAggregations'
import { formatCurrency, formatCompact, formatNumber } from '@/utils/formatters'
import { iniciais, corAvatar } from '@/utils/statusMaps'

const vendasStore = useVendasStore()
const agg = useAggregations()

const tabela = computed<VendedorTabela[]>(() => agg.tabelaVendedores())
const melhorVendedor = computed(() => [...tabela.value].sort((a, b) => b.faturamento - a.faturamento)[0])
const desempenho = computed(() => agg.desempenhoEquipeMensal())

const top5 = computed(() => [...tabela.value].sort((a, b) => b.faturamento - a.faturamento).slice(0, 5))
const itemsRanking = computed<RankingItem[]>(() =>
  top5.value.map((v, i) => ({
    id: v.vendedorId,
    rank: i + 1,
    avatarText: iniciais(v.nome),
    avatarColor: corAvatar(v.nome),
    title: v.nome,
    value: formatCompact(v.faturamento),
    meta: `${v.statusMeta}% da meta`,
    progress: v.statusMeta,
  })),
)

const busca = ref('')
const linhasFiltradas = computed(() => {
  const termo = busca.value.trim().toLowerCase()
  const base = [...tabela.value].sort((a, b) => b.faturamento - a.faturamento)
  if (!termo) return base
  return base.filter((v) => v.nome.toLowerCase().includes(termo))
})

const columns: DataTableColumn[] = [
  { key: 'nome', label: 'Vendedor' },
  { key: 'faturamento', label: 'Faturamento', align: 'right' },
  { key: 'nVendas', label: 'Nº Vendas', align: 'right' },
  { key: 'ticketMedio', label: 'Ticket Médio', align: 'right' },
  { key: 'statusMeta', label: 'Status Meta', align: 'right' },
]
</script>

<template>
  <div>
    <PageHeader title="Vendedores" subtitle="Visão geral do desempenho da equipe de vendas." />
    <GlobalFilters />

    <div v-if="!vendasStore.carregado" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SkeletonCard v-for="i in 4" :key="i" variant="kpi" />
    </div>

    <template v-else>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Vendedores Ativos" :value="formatNumber(vendasStore.vendedores.length)" icon="bi-person-badge" suffix="Equipe atual" />
        <KpiCard
          label="Faturamento Total"
          :value="formatCurrency(agg.kpisGerais.value.faturamento)"
          icon="bi-cash-stack"
          :variation="agg.kpisGerais.value.faturamentoVar"
        />
        <KpiCard
          label="Ticket Médio"
          :value="formatCurrency(agg.kpisGerais.value.ticketMedio)"
          icon="bi-receipt"
          :variation="agg.kpisGerais.value.ticketMedioVar"
        />
        <div class="rounded-card bg-surface p-5 shadow-sm">
          <p class="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <i class="bi bi-trophy" /> Melhor Vendedor
          </p>
          <div v-if="melhorVendedor" class="flex items-center gap-3">
            <span
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
              :style="{ backgroundColor: corAvatar(melhorVendedor.nome) }"
            >
              {{ iniciais(melhorVendedor.nome) }}
            </span>
            <div class="min-w-0">
              <p class="truncate text-base font-bold text-ink">{{ melhorVendedor.nome }}</p>
              <p class="text-xs text-ink-muted">{{ formatCurrency(melhorVendedor.faturamento) }} gerados</p>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="rounded-card bg-surface p-5 shadow-sm">
          <div class="mb-3 flex items-center justify-between">
            <p class="text-sm font-semibold text-ink">Top 5 Vendedores</p>
          </div>
          <EmptyState v-if="itemsRanking.length === 0" title="Sem vendas no período" />
          <RankingList v-else :items="itemsRanking" />
          <a href="#detalhamento-vendedores" class="mt-3 block text-center text-xs font-semibold text-green-700 hover:underline">
            Ver todos os rankings
          </a>
        </div>

        <div class="rounded-card bg-surface p-5 shadow-sm">
          <p class="text-sm font-semibold text-ink">Desempenho da Equipe</p>
          <p class="mb-2 text-xs text-ink-muted">Faturamento por período</p>
          <BarChart
            :categories="desempenho.categorias"
            :series="[
              { name: 'Atual', data: desempenho.atual },
              { name: 'Anterior', data: desempenho.anterior },
            ]"
            :value-formatter="formatCompact"
          />
        </div>
      </div>

      <div id="detalhamento-vendedores" class="mt-6 rounded-card bg-surface p-5 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm font-semibold text-ink">Detalhamento por Vendedor</p>
          <input
            v-model="busca"
            type="search"
            placeholder="Buscar vendedor..."
            class="w-full max-w-xs rounded-btn border border-surface-border bg-surface-bg px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <div class="mt-4">
          <DataTable :columns="columns" :rows="linhasFiltradas" :row-key="(r) => r.vendedorId" empty-title="Nenhum vendedor encontrado">
            <template #cell-nome="{ row }">
              <span class="flex items-center gap-2">
                <span
                  class="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                  :style="{ backgroundColor: corAvatar(row.nome) }"
                >
                  {{ iniciais(row.nome) }}
                </span>
                {{ row.nome }}
              </span>
            </template>
            <template #cell-faturamento="{ row }">
              <span class="inline-flex items-center gap-1">
                {{ formatCurrency(row.faturamento) }}
                <i
                  v-if="row.tendencia !== 0"
                  class="bi text-xs"
                  :class="row.tendencia > 0 ? 'bi-arrow-up-short text-green-500' : 'bi-arrow-down-short text-danger-500'"
                />
              </span>
            </template>
            <template #cell-ticketMedio="{ row }">{{ formatCurrency(row.ticketMedio) }}</template>
            <template #cell-statusMeta="{ row }">
              <div class="flex items-center justify-end gap-2">
                <div class="h-1.5 w-20 overflow-hidden rounded-full bg-surface-bg">
                  <div
                    class="h-full rounded-full"
                    :class="row.statusMeta >= 90 ? 'bg-green-500' : row.statusMeta >= 70 ? 'bg-brand-500' : 'bg-warning-500'"
                    :style="{ width: `${row.statusMeta}%` }"
                  />
                </div>
                <span class="tabular-nums text-xs text-ink-muted">{{ row.statusMeta }}%</span>
              </div>
            </template>
          </DataTable>
        </div>
      </div>
    </template>
  </div>
</template>

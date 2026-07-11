<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import GlobalFilters from '@/components/filters/GlobalFilters.vue'
import KpiCard from '@/components/ui/KpiCard.vue'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import RankingList, { type RankingItem } from '@/components/ui/RankingList.vue'
import BarChart from '@/components/charts/BarChart.vue'
import { useVendasStore } from '@/stores/useVendasStore'
import { useAggregations } from '@/composables/useAggregations'
import { usePagination } from '@/composables/usePagination'
import { formatCurrency, formatCompact, formatNumber, formatPercent, formatDate } from '@/utils/formatters'
import { iniciais, corAvatar } from '@/utils/statusMaps'

const vendasStore = useVendasStore()
const agg = useAggregations()

const novosVsRecorrentes = computed(() => agg.novosVsRecorrentes())
const segmentacao = computed(() => agg.segmentacaoClientes())
const topFaturamento = computed(() => agg.topClientes(5))

const tabelaClientes = computed(() => agg.tabelaClientes())
const ticketMedioCliente = computed(() => {
  const linhas = tabelaClientes.value
  const totalGasto = linhas.reduce((acc, l) => acc + l.totalGasto, 0)
  const totalCompras = linhas.reduce((acc, l) => acc + l.nCompras, 0)
  return totalCompras ? totalGasto / totalCompras : 0
})

const itemsTopFaturamento = computed<RankingItem[]>(() =>
  topFaturamento.value.map((c, i) => ({
    id: c.clienteId,
    rank: i + 1,
    title: c.nome,
    subtitle: c.ramo,
    value: formatCompact(c.valor),
  })),
)

const busca = ref('')
const linhasFiltradas = computed(() => {
  const termo = busca.value.trim().toLowerCase()
  if (!termo) return tabelaClientes.value
  return tabelaClientes.value.filter((c) => c.nome.toLowerCase().includes(termo))
})
const { page, paginated } = usePagination(linhasFiltradas, 8)

const columns: DataTableColumn[] = [
  { key: 'nome', label: 'Cliente' },
  { key: 'ultimaCompra', label: 'Última Compra' },
  { key: 'nCompras', label: 'Nº Compras', align: 'right' },
  { key: 'ticketMedio', label: 'Ticket Médio', align: 'right' },
  { key: 'totalGasto', label: 'Total Gasto', align: 'right' },
]
</script>

<template>
  <div>
    <PageHeader title="Clientes" subtitle="Análise detalhada de comportamento e retenção." />
    <GlobalFilters />

    <div v-if="!vendasStore.carregado" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SkeletonCard v-for="i in 4" :key="i" variant="kpi" />
    </div>

    <template v-else>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Clientes Ativos" :value="formatNumber(agg.clientesAtivos.value)" icon="bi-people" />
        <KpiCard label="Novos Clientes" :value="formatNumber(agg.novosClientes.value)" icon="bi-person-plus" />
        <KpiCard label="Ticket Médio" :value="formatCurrency(ticketMedioCliente)" icon="bi-receipt" />
        <KpiCard label="Taxa de Recompra" :value="formatPercent(agg.taxaRecompra.value, true)" icon="bi-arrow-repeat" />
      </div>

      <div class="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="rounded-card bg-surface p-5 shadow-sm lg:col-span-2">
          <p class="mb-2 text-sm font-semibold text-ink">Novos vs. Recorrentes</p>
          <BarChart
            :categories="novosVsRecorrentes.categorias"
            :series="[
              { name: 'Recorrentes', data: novosVsRecorrentes.recorrentes },
              { name: 'Novos', data: novosVsRecorrentes.novos },
            ]"
            stacked
            :value-formatter="formatNumber"
          />
        </div>

        <div class="rounded-card bg-surface p-5 shadow-sm">
          <p class="mb-3 text-sm font-semibold text-ink">Segmentação</p>
          <div class="space-y-2">
            <div class="rounded-btn bg-brand-700 p-4 text-white">
              <p class="text-2xl font-bold">{{ formatPercent(segmentacao.vip.percentual, true) }}</p>
              <p class="text-xs text-white/80">VIP (Alto LTV)</p>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="rounded-btn bg-green-700 p-4 text-white">
                <p class="text-xl font-bold">{{ formatPercent(segmentacao.regular.percentual, true) }}</p>
                <p class="text-xs text-white/80">Regular</p>
              </div>
              <div class="rounded-btn bg-surface-bg p-4 text-ink">
                <p class="text-xl font-bold">{{ formatPercent(segmentacao.ocasional.percentual, true) }}</p>
                <p class="text-xs text-ink-muted">Ocasional</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="rounded-card bg-surface p-5 shadow-sm lg:col-span-2">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm font-semibold text-ink">Lista de Clientes</p>
            <input
              v-model="busca"
              type="search"
              placeholder="Buscar..."
              class="w-full max-w-xs rounded-btn border border-surface-border bg-surface-bg px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div class="mt-4">
            <DataTable :columns="columns" :rows="paginated" :row-key="(r) => r.clienteId" empty-title="Nenhum cliente encontrado">
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
              <template #cell-ultimaCompra="{ row }">{{ formatDate(row.ultimaCompra) }}</template>
              <template #cell-ticketMedio="{ row }">{{ formatCurrency(row.ticketMedio) }}</template>
              <template #cell-totalGasto="{ row }">{{ formatCurrency(row.totalGasto) }}</template>
            </DataTable>
          </div>
          <div class="mt-4 flex items-center justify-between gap-3 text-xs text-ink-muted">
            <span>Mostrando {{ linhasFiltradas.length === 0 ? 0 : (page - 1) * 8 + 1 }}-{{ Math.min(page * 8, linhasFiltradas.length) }} de {{ linhasFiltradas.length }}</span>
            <span>Ver Todos ({{ formatNumber(linhasFiltradas.length) }})</span>
          </div>
        </div>

        <div class="rounded-card bg-surface p-5 shadow-sm">
          <p class="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <i class="bi bi-trophy text-warning-500" /> Top 5 Faturamento
          </p>
          <RankingList :items="itemsTopFaturamento" />
        </div>
      </div>
    </template>
  </div>
</template>

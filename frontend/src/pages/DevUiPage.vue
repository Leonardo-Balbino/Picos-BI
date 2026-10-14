<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import KpiCard from '@/components/ui/KpiCard.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import RankingList, { type RankingItem } from '@/components/ui/RankingList.vue'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'
import Pagination from '@/components/ui/Pagination.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import AppToast from '@/components/ui/AppToast.vue'
import LineAreaChart from '@/components/charts/LineAreaChart.vue'
import BarChart from '@/components/charts/BarChart.vue'
import HBarChart from '@/components/charts/HBarChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import ComboChart from '@/components/charts/ComboChart.vue'
import ParetoChart from '@/components/charts/ParetoChart.vue'
import { useUiStore } from '@/stores/useUiStore'
import { formatCurrency, formatCompact } from '@/utils/formatters'

const ui = useUiStore()

const modalOpen = ref(false)
const selectValue = ref('7d')
const switchValue = ref(true)
const page = ref(1)

const rankingItems: RankingItem[] = [
  { id: '1', title: 'Produto A - Premium', value: formatCurrency(45200), progress: 100 },
  { id: '2', title: 'Produto B - Standard', value: formatCurrency(32100), progress: 71 },
  { id: '3', title: 'Produto C - Básico', value: formatCurrency(18500), progress: 41 },
]

const rankingAvatares: RankingItem[] = [
  { id: '1', rank: 1, avatarText: 'AS', title: 'Ana Silva', subtitle: 'Loja Matriz', value: formatCurrency(52400), meta: '240 vendas' },
  { id: '2', rank: 2, avatarText: 'CE', title: 'Carlos Eduardo', subtitle: 'Filial Sul', value: formatCurrency(41200), meta: '185 vendas' },
]

interface DemoRow extends Record<string, unknown> {
  id: string
  cupom: string
  vendedor: string
  total: number
  status: 'concluida' | 'cancelada' | 'estornada'
}

const columns: DataTableColumn[] = [
  { key: 'cupom', label: 'Cupom' },
  { key: 'vendedor', label: 'Vendedor', sortable: true },
  { key: 'total', label: 'Total', align: 'right', sortable: true },
  { key: 'status', label: 'Status', align: 'center' },
]

const rows: DemoRow[] = [
  { id: '1', cupom: '#CP-8921', vendedor: 'Maria Costa', total: 245.9, status: 'concluida' },
  { id: '2', cupom: '#CP-8919', vendedor: 'Ana Paula', total: 540.2, status: 'cancelada' },
  { id: '3', cupom: '#CP-8918', vendedor: 'Maria Costa', total: 120.5, status: 'estornada' },
]

const chartCategories = ['01/10', '05/10', '10/10', '15/10', '20/10', '25/10']
const chartSerie = [
  { name: 'Faturamento', data: [82000, 91000, 87000, 99000, 112000, 124500] },
]
</script>

<template>
  <div class="min-h-screen bg-surface-bg p-8">
    <h1 class="text-2xl font-bold text-ink">Design System · PICOS Analytics</h1>
    <p class="mt-1 text-sm text-ink-muted">Catálogo de componentes e gráficos (rota de desenvolvimento).</p>

    <section class="mt-8">
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">Botões</h2>
      <div class="flex flex-wrap items-center gap-3 rounded-card bg-surface p-5 shadow-sm">
        <BaseButton variant="primary" icon="bi-download">Exportar</BaseButton>
        <BaseButton variant="secondary" icon="bi-arrow-clockwise">Atualizar</BaseButton>
        <BaseButton variant="danger-ghost" icon="bi-trash">Desvincular</BaseButton>
        <BaseButton variant="primary" size="sm">Pequeno</BaseButton>
        <BaseButton variant="primary" disabled>Desabilitado</BaseButton>
      </div>
    </section>

    <section class="mt-8">
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">KPI Cards</h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Faturamento" :value="formatCurrency(124500)" icon="bi-currency-dollar" :variation="12" highlight />
        <KpiCard label="Nº de Vendas" value="1.240" icon="bi-receipt" :variation="5" />
        <KpiCard label="Ticket Médio" :value="formatCurrency(100.4)" icon="bi-tag" :variation="-2" />
        <KpiCard label="Meta do Mês" :progress="85" />
      </div>
    </section>

    <section class="mt-8">
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">Status Badges</h2>
      <div class="flex flex-wrap gap-2 rounded-card bg-surface p-5 shadow-sm">
        <StatusBadge variant="success">Concluída</StatusBadge>
        <StatusBadge variant="danger">Cancelada</StatusBadge>
        <StatusBadge variant="warning">Abaixo</StatusBadge>
        <StatusBadge variant="info">VIP</StatusBadge>
        <StatusBadge variant="neutral">Estornada</StatusBadge>
      </div>
    </section>

    <section class="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div class="rounded-card bg-surface p-5 shadow-sm">
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">Ranking List (barra)</h2>
        <RankingList :items="rankingItems" />
      </div>
      <div class="rounded-card bg-surface p-5 shadow-sm">
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">Ranking List (avatar)</h2>
        <RankingList :items="rankingAvatares" />
      </div>
    </section>

    <section class="mt-8">
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">Data Table + Paginação</h2>
      <div class="rounded-card bg-surface p-5 shadow-sm">
        <DataTable :columns="columns" :rows="rows" :row-key="(r) => r.id">
          <template #cell-total="{ row }">{{ formatCurrency(row.total) }}</template>
          <template #cell-status="{ row }">
            <StatusBadge :variant="row.status === 'concluida' ? 'success' : row.status === 'cancelada' ? 'danger' : 'neutral'">
              {{ row.status }}
            </StatusBadge>
          </template>
        </DataTable>
        <div class="mt-4 flex justify-end">
          <Pagination v-model:page="page" :total="287" :items-per-page="5" />
        </div>
      </div>
    </section>

    <section class="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div class="rounded-card bg-surface p-5 shadow-sm">
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">Modal / Select / Switch</h2>
        <div class="flex flex-wrap items-center gap-3">
          <BaseButton variant="secondary" @click="modalOpen = true">Abrir modal</BaseButton>
          <BaseSelect
            v-model="selectValue"
            :options="[
              { value: '7d', label: 'Últimos 7 dias' },
              { value: '30d', label: 'Últimos 30 dias' },
            ]"
          />
          <BaseSwitch v-model="switchValue" />
        </div>
        <BaseModal v-model:open="modalOpen" title="Exemplo de modal" description="Conteúdo de demonstração.">
          <p class="text-sm text-ink-muted">Corpo do modal via Reka UI Dialog.</p>
          <template #footer>
            <BaseButton variant="secondary" @click="modalOpen = false">Cancelar</BaseButton>
            <BaseButton variant="primary" @click="modalOpen = false">Salvar</BaseButton>
          </template>
        </BaseModal>
      </div>
      <div class="rounded-card bg-surface p-5 shadow-sm">
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">Toasts</h2>
        <div class="flex flex-wrap gap-2">
          <BaseButton variant="secondary" @click="ui.toast({ title: 'Sucesso', description: 'Alterações salvas.', variant: 'success' })">
            Sucesso
          </BaseButton>
          <BaseButton variant="secondary" @click="ui.toast({ title: 'Em breve', description: 'Exportação disponível em breve.', variant: 'info' })">
            Info
          </BaseButton>
        </div>
      </div>
      <div class="rounded-card bg-surface p-5 shadow-sm">
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">Empty state</h2>
        <EmptyState title="Nenhum dado encontrado" description="Ajuste os filtros para ver resultados." />
      </div>
    </section>

    <section class="mt-8">
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">Skeletons</h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SkeletonCard variant="kpi" />
        <SkeletonCard variant="chart" />
        <SkeletonCard variant="list" :rows="3" />
      </div>
    </section>

    <section class="mt-8">
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">Gráficos (ApexCharts)</h2>
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div class="rounded-card bg-surface p-5 shadow-sm">
          <p class="mb-2 text-sm font-medium text-ink">Linha/Área com meta</p>
          <LineAreaChart :categories="chartCategories" :series="chartSerie" :meta-value="100000" :value-formatter="formatCompact" />
        </div>
        <div class="rounded-card bg-surface p-5 shadow-sm">
          <p class="mb-2 text-sm font-medium text-ink">Barras (destaque)</p>
          <BarChart
            :categories="['D', 'T', 'Q', 'Q', 'S', 'S', 'D']"
            :series="[{ name: 'Vendas', data: [40, 55, 48, 60, 52, 90, 70] }]"
            :highlight-index="5"
          />
        </div>
        <div class="rounded-card bg-surface p-5 shadow-sm">
          <p class="mb-2 text-sm font-medium text-ink">Barras horizontais</p>
          <HBarChart
            :categories="['Eletrônicos', 'Informática', 'Acessórios', 'Áudio & Vídeo']"
            :series="[{ name: 'Faturamento', data: [1200000, 850000, 320000, 290000] }]"
            :value-formatter="formatCompact"
          />
        </div>
        <div class="rounded-card bg-surface p-5 shadow-sm">
          <p class="mb-2 text-sm font-medium text-ink">Donut com total</p>
          <DonutChart :labels="['Cartão', 'PIX', 'Dinheiro']" :series="[55, 30, 15]" :value-formatter="formatCompact" />
        </div>
        <div class="rounded-card bg-surface p-5 shadow-sm">
          <p class="mb-2 text-sm font-medium text-ink">Combo (barra + linha)</p>
          <ComboChart
            :categories="chartCategories"
            bar-name="Faturamento"
            :bar-data="[82000, 91000, 87000, 99000, 112000, 124500]"
            line-name="Nº Vendas"
            :line-data="[800, 850, 830, 900, 980, 1050]"
            :bar-formatter="formatCompact"
          />
        </div>
        <div class="rounded-card bg-surface p-5 shadow-sm">
          <p class="mb-2 text-sm font-medium text-ink">Pareto / Curva ABC</p>
          <ParetoChart
            :categorias="['P1', 'P2', 'P3', 'P4', 'P5', 'P6']"
            :valores="[452000, 380000, 178000, 135000, 128000, 60000]"
            :classes="['A', 'A', 'A', 'B', 'B', 'C']"
            :acumulado="[34, 62, 75, 85, 95, 100]"
          />
        </div>
      </div>
    </section>

    <AppToast />
  </div>
</template>

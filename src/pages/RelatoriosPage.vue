<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import BarChart from '@/components/charts/BarChart.vue'
import { useVendasStore } from '@/stores/useVendasStore'
import { useConfiguracoesStore } from '@/stores/useConfiguracoesStore'
import { useUiStore } from '@/stores/useUiStore'
import { formatCurrency, formatNumber, formatDate, formatDateTime } from '@/utils/formatters'

interface RelatorioDef {
  id: string
  nome: string
  descricao: string
  icone: string
}

const CATALOGO: RelatorioDef[] = [
  { id: 'vendas-periodo', nome: 'Vendas por Período', descricao: 'Análise detalhada do volume de vendas, faturamento e ticket médio.', icone: 'bi-graph-up-arrow' },
  { id: 'produtos-campeoes', nome: 'Produtos Campeões', descricao: 'Ranking dos produtos mais vendidos por volume e receita.', icone: 'bi-star' },
  { id: 'desempenho-vendedores', nome: 'Desempenho Vendedores', descricao: 'Métricas individuais de performance e taxas de conversão.', icone: 'bi-person-badge' },
  { id: 'fluxo-caixa', nome: 'Fluxo de Caixa', descricao: 'Demonstrativo de entradas e saídas previstas e realizadas.', icone: 'bi-cash-coin' },
]

const vendasStore = useVendasStore()
const config = useConfiguracoesStore()
const ui = useUiStore()

const selecionado = ref('vendas-periodo')
const geradoEm = ref(new Date().toISOString())

function gerar(id: string) {
  selecionado.value = id
  geradoEm.value = new Date().toISOString()
  if (id !== 'vendas-periodo') {
    ui.toast({ title: 'Relatório em desenvolvimento', description: 'Pré-visualização disponível em breve.', variant: 'info' })
  }
}

function exportar(formato: 'PDF' | 'Excel') {
  ui.toast({ title: 'Exportação disponível em breve', description: `Exportar ${formato} ainda não está implementado nesta fase.`, variant: 'info' })
}

const ultimos7Dias = computed(() => {
  const dias: { data: Date; volume: number; faturamento: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const data = new Date(Date.UTC(2026, 6, 11 - i))
    const chave = data.toISOString().slice(0, 10)
    const doDia = vendasStore.vendas.filter((v) => v.status === 'concluida' && v.dataHora.slice(0, 10) === chave)
    const faturamento = doDia.reduce((acc, v) => acc + v.itens.reduce((a, it) => a + it.quantidade * it.precoUnit, 0), 0)
    dias.push({ data, volume: doDia.length, faturamento })
  }
  return dias
})

const metaDiaria = computed(() => {
  const metaMensal = config.dados?.metas.faturamentoMensalGlobal ?? 0
  return metaMensal / 30
})

function statusMeta(faturamento: number): { label: string; variant: 'success' | 'danger' | 'info' } {
  if (faturamento >= metaDiaria.value * 1.1) return { label: 'Superada', variant: 'info' }
  if (faturamento >= metaDiaria.value * 0.9) return { label: 'Atingida', variant: 'success' }
  return { label: 'Abaixo', variant: 'danger' }
}

interface LinhaRelatorio extends Record<string, unknown> {
  data: string
  volume: number
  faturamento: number
  ticketMedio: number
  status: { label: string; variant: 'success' | 'danger' | 'info' }
}

const linhas = computed<LinhaRelatorio[]>(() =>
  ultimos7Dias.value.map((d) => ({
    data: formatDate(d.data),
    volume: d.volume,
    faturamento: d.faturamento,
    ticketMedio: d.volume ? d.faturamento / d.volume : 0,
    status: statusMeta(d.faturamento),
  })),
)

const totalVolume = computed(() => ultimos7Dias.value.reduce((acc, d) => acc + d.volume, 0))
const totalFaturamento = computed(() => ultimos7Dias.value.reduce((acc, d) => acc + d.faturamento, 0))

const columns: DataTableColumn[] = [
  { key: 'data', label: 'Data' },
  { key: 'volume', label: 'Volume', align: 'right' },
  { key: 'faturamento', label: 'Faturamento (R$)', align: 'right' },
  { key: 'ticketMedio', label: 'Ticket Médio (R$)', align: 'right' },
  { key: 'status', label: 'Status Meta', align: 'center' },
]
</script>

<template>
  <div>
    <PageHeader title="Relatórios" subtitle="Gere, visualize e exporte dados consolidados da operação." />

    <div class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      <div>
        <p class="mb-3 text-sm font-semibold text-ink">Catálogo de Relatórios</p>
        <div class="space-y-4">
          <div
            v-for="rel in CATALOGO"
            :key="rel.id"
            class="rounded-card border bg-surface p-5 shadow-sm"
            :class="selecionado === rel.id ? 'border-green-500' : 'border-surface-border'"
          >
            <span class="mb-3 flex h-10 w-10 items-center justify-center rounded-btn bg-green-100 text-green-700">
              <i class="bi" :class="rel.icone" />
            </span>
            <p class="font-semibold text-ink">{{ rel.nome }}</p>
            <p class="mt-1 text-sm text-ink-muted">{{ rel.descricao }}</p>
            <BaseButton
              :variant="selecionado === rel.id ? 'primary' : 'secondary'"
              icon="bi-play-fill"
              class="mt-4 w-full justify-center"
              @click="gerar(rel.id)"
            >
              Gerar
            </BaseButton>
          </div>
        </div>
      </div>

      <div class="rounded-card bg-surface p-5 shadow-sm md:col-span-2">
        <template v-if="selecionado === 'vendas-periodo'">
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 items-center justify-center rounded-btn bg-green-100 text-green-700">
              <i class="bi bi-graph-up-arrow" />
            </span>
            <div>
              <p class="text-lg font-bold text-ink">Vendas por Período</p>
              <p class="text-xs text-ink-muted">Pré-visualização gerada em {{ formatDateTime(geradoEm) }}</p>
            </div>
          </div>

          <div class="mt-4 flex gap-3">
            <BaseButton variant="secondary" icon="bi-file-earmark-pdf" @click="exportar('PDF')">Exportar PDF</BaseButton>
            <BaseButton variant="primary" icon="bi-file-earmark-excel" @click="exportar('Excel')">Exportar Excel</BaseButton>
          </div>

          <div class="mt-6 border-t border-surface-border pt-6">
            <p class="mb-2 text-sm font-semibold text-ink">Faturamento vs Meta (Últimos 7 dias)</p>
            <BarChart
              :categories="ultimos7Dias.map((d) => formatDate(d.data))"
              :series="[{ name: 'Faturamento', data: ultimos7Dias.map((d) => d.faturamento) }]"
              :value-formatter="formatCurrency"
            />
          </div>

          <div class="mt-6">
            <DataTable :columns="columns" :rows="linhas" :row-key="(r) => r.data">
              <template #cell-faturamento="{ row }">{{ formatCurrency(row.faturamento) }}</template>
              <template #cell-ticketMedio="{ row }">{{ formatCurrency(row.ticketMedio) }}</template>
              <template #cell-volume="{ row }">{{ formatNumber(row.volume) }}</template>
              <template #cell-status="{ row }">
                <StatusBadge :variant="row.status.variant">{{ row.status.label }}</StatusBadge>
              </template>
            </DataTable>
            <div class="mt-2 flex items-center justify-between border-t border-surface-border px-4 py-3 text-sm font-semibold text-ink">
              <span>Total (7 dias)</span>
              <span class="flex gap-8 tabular-nums">
                <span>{{ formatNumber(totalVolume) }}</span>
                <span>{{ formatCurrency(totalFaturamento) }}</span>
              </span>
            </div>
          </div>
        </template>

        <EmptyState
          v-else
          icon="bi-hourglass-split"
          title="Relatório em desenvolvimento"
          description="A pré-visualização deste relatório estará disponível em uma próxima fase."
        />
      </div>
    </div>
  </div>
</template>

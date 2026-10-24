<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from 'reka-ui'
import PageHeader from '@/components/layout/PageHeader.vue'
import StoreFilter from '@/components/filters/StoreFilter.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import KpiCard from '@/components/ui/KpiCard.vue'
import BarChart from '@/components/charts/BarChart.vue'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
import Pagination from '@/components/ui/Pagination.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { useFiltersStore } from '@/stores/useFiltersStore'
import { usePagination } from '@/composables/usePagination'
import {
  getPainelContasPagar,
  type PainelContasResultado,
  type ContaPainelItem,
} from '@/services/dataService'
import { formatCurrency, formatNumber } from '@/utils/formatters'
import { exportarCsv } from '@/utils/exportar'

const filters = useFiltersStore()
const painel = ref<PainelContasResultado | null>(null)
const carregando = ref(false)
const erro = ref('')

// Filtros locais de visualização
const situacaoFiltro = ref<'TODOS' | 'A_VENCER' | 'VENCIDO' | 'LIQUIDADO'>('TODOS')
const busca = ref('')
const detalhe = ref<ContaPainelItem | null>(null)
const modalAberto = ref(false)

// Seletor de período rápido para Contas a Pagar
const periodoPredefinido = ref<'mes-atual' | 'proximo-mes' | 'ultimos-30' | 'ano' | 'tudo'>('mes-atual')

function calcularDatasPeriodo(): { inicio?: string; fim?: string } {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = agora.getMonth()

  if (periodoPredefinido.value === 'mes-atual') {
    const dIni = new Date(ano, mes, 1)
    const dFim = new Date(ano, mes + 1, 0)
    return {
      inicio: dIni.toISOString().slice(0, 10),
      fim: dFim.toISOString().slice(0, 10),
    }
  } else if (periodoPredefinido.value === 'proximo-mes') {
    const dIni = new Date(ano, mes + 1, 1)
    const dFim = new Date(ano, mes + 2, 0)
    return {
      inicio: dIni.toISOString().slice(0, 10),
      fim: dFim.toISOString().slice(0, 10),
    }
  } else if (periodoPredefinido.value === 'ultimos-30') {
    const dIni = new Date(agora.getTime() - 30 * 86400000)
    const dFim = new Date(agora.getTime() + 30 * 86400000)
    return {
      inicio: dIni.toISOString().slice(0, 10),
      fim: dFim.toISOString().slice(0, 10),
    }
  } else if (periodoPredefinido.value === 'ano') {
    return {
      inicio: `${ano}-01-01`,
      fim: `${ano}-12-31`,
    }
  }
  return {}
}

async function carregarDados() {
  carregando.value = true
  erro.value = ''
  try {
    const datas = calcularDatasPeriodo()
    const idLoja =
      filters.lojasSelecionadas.length === 1 ? filters.lojasSelecionadas[0] : undefined
    const res = await getPainelContasPagar(datas.inicio, datas.fim, idLoja)
    painel.value = res
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Falha ao carregar contas a pagar.'
  } finally {
    carregando.value = false
  }
}

watch(
  () => [periodoPredefinido.value, filters.lojasSelecionadas.join(',')],
  () => {
    void carregarDados()
  },
)

onMounted(() => {
  void carregarDados()
})

const kpis = computed(() => painel.value?.kpis)

// Itens filtrados por busca e situação
const itensFiltrados = computed(() => {
  if (!painel.value?.items) return []
  let lista = painel.value.items

  if (situacaoFiltro.value !== 'TODOS') {
    lista = lista.filter((it) => it.situacao === situacaoFiltro.value)
  }

  const termo = busca.value.trim().toLowerCase()
  if (termo) {
    lista = lista.filter(
      (it) =>
        (it.nome && it.nome.toLowerCase().includes(termo)) ||
        (it.numero && it.numero.toLowerCase().includes(termo)) ||
        (it.descricao && it.descricao.toLowerCase().includes(termo)) ||
        (it.nomeLoja && it.nomeLoja.toLowerCase().includes(termo)),
    )
  }

  return lista
})

// Paginação: 15 itens por página
const { page, paginated } = usePagination(itensFiltrados, 15)

// Gráfico de Fluxo de Vencimentos
const categoriasFluxo = computed(() => {
  if (!painel.value?.fluxo) return []
  return painel.value.fluxo.map((f) => {
    const parts = f.data.split('-')
    if (parts.length === 2) {
      const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
      const mesNum = parseInt(parts[1], 10) - 1
      return `${meses[mesNum] ?? parts[1]}/${parts[0].slice(2)}`
    }
    return f.data
  })
})

const seriesFluxo = computed(() => {
  if (!painel.value?.fluxo) return []
  return [
    {
      name: 'Em Aberto',
      data: painel.value.fluxo.map((f) => f.aberto),
    },
    {
      name: 'Vencido',
      data: painel.value.fluxo.map((f) => f.vencido),
    },
    {
      name: 'Liquidado',
      data: painel.value.fluxo.map((f) => f.liquidado),
    },
  ]
})

function formatarDataIso(iso: string | null) {
  if (!iso) return '—'
  const partes = iso.slice(0, 10).split('-')
  if (partes.length !== 3) return iso
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function abrirDetalhe(item: ContaPainelItem) {
  detalhe.value = item
  modalAberto.value = true
}

const colunas: DataTableColumn[] = [
  { key: 'nome', label: 'Favorecido / Fornecedor' },
  { key: 'numero', label: 'Documento' },
  { key: 'dtVencimento', label: 'Vencimento' },
  { key: 'nomeLoja', label: 'Unidade' },
  { key: 'valOrigem', label: 'Original', align: 'right' },
  { key: 'valPago', label: 'Pago', align: 'right' },
  { key: 'valSaldo', label: 'Saldo', align: 'right' },
  { key: 'situacao', label: 'Situação', align: 'center' },
  { key: 'acoes', label: 'Ações', align: 'center' },
]

function dispararExportacaoCsv() {
  if (!itensFiltrados.value.length) return
  const colunasExport = [
    { chave: 'favorecido', rotulo: 'Favorecido' },
    { chave: 'documento', rotulo: 'Documento' },
    { chave: 'unidade', rotulo: 'Unidade' },
    { chave: 'lancamento', rotulo: 'Lançamento' },
    { chave: 'vencimento', rotulo: 'Vencimento' },
    { chave: 'pagamento', rotulo: 'Data Pagamento' },
    { chave: 'valOrigem', rotulo: 'Valor Original' },
    { chave: 'valPago', rotulo: 'Valor Pago' },
    { chave: 'valSaldo', rotulo: 'Saldo a Pagar' },
    { chave: 'situacao', rotulo: 'Situação' },
  ]
  const linhasExport = itensFiltrados.value.map((it) => ({
    favorecido: it.nome || 'Não informado',
    documento: it.numero || '—',
    unidade: it.nomeLoja,
    lancamento: formatarDataIso(it.dtLancamento),
    vencimento: formatarDataIso(it.dtVencimento),
    pagamento: formatarDataIso(it.dtPagamento),
    valOrigem: formatCurrency(it.valOrigem),
    valPago: formatCurrency(it.valPago),
    valSaldo: formatCurrency(it.valSaldo),
    situacao: it.situacao === 'LIQUIDADO' ? 'Liquidado' : it.situacao === 'VENCIDO' ? 'Vencido' : 'A Vencer',
  }))
  exportarCsv(`contas-a-pagar-${new Date().toISOString().slice(0, 10)}`, colunasExport, linhasExport)
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Contas a Pagar" />

    <!-- Barra de Controles Globais -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <StoreFilter />
        <!-- Seletor de Competência Rápida -->
        <div class="inline-flex rounded-btn border border-surface-border bg-surface p-1 shadow-xs">
          <button
            class="rounded px-3 py-1 text-xs font-semibold transition-colors"
            :class="periodoPredefinido === 'mes-atual' ? 'bg-brand-900 text-white' : 'text-ink-muted hover:text-ink'"
            @click="periodoPredefinido = 'mes-atual'"
          >
            Mês Atual
          </button>
          <button
            class="rounded px-3 py-1 text-xs font-semibold transition-colors"
            :class="periodoPredefinido === 'proximo-mes' ? 'bg-brand-900 text-white' : 'text-ink-muted hover:text-ink'"
            @click="periodoPredefinido = 'proximo-mes'"
          >
            Próximo Mês
          </button>
          <button
            class="rounded px-3 py-1 text-xs font-semibold transition-colors"
            :class="periodoPredefinido === 'ultimos-30' ? 'bg-brand-900 text-white' : 'text-ink-muted hover:text-ink'"
            @click="periodoPredefinido = 'ultimos-30'"
          >
            +/- 30 Dias
          </button>
          <button
            class="rounded px-3 py-1 text-xs font-semibold transition-colors"
            :class="periodoPredefinido === 'ano' ? 'bg-brand-900 text-white' : 'text-ink-muted hover:text-ink'"
            @click="periodoPredefinido = 'ano'"
          >
            Ano Inteiro
          </button>
          <button
            class="rounded px-3 py-1 text-xs font-semibold transition-colors"
            :class="periodoPredefinido === 'tudo' ? 'bg-brand-900 text-white' : 'text-ink-muted hover:text-ink'"
            @click="periodoPredefinido = 'tudo'"
          >
            Todas
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <BaseButton
          variant="secondary"
          icon="bi-download"
          :disabled="!itensFiltrados.length"
          @click="dispararExportacaoCsv"
        >
          Exportar CSV
        </BaseButton>
        <BaseButton
          variant="secondary"
          icon="bi-arrow-clockwise"
          :loading="carregando"
          @click="carregarDados"
        >
          Atualizar
        </BaseButton>
      </div>
    </div>

    <!-- 4 KPIs de Contas a Pagar -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Total em Aberto"
        :value="kpis ? formatCurrency(kpis.totalAberto) : '—'"
        icon="bi-hourglass-split"
        :highlight="true"
        :suffix="kpis ? `${formatNumber(kpis.quantidadeAberto)} título(s) pendente(s)` : undefined"
      />
      <KpiCard
        label="Total Vencido"
        :value="kpis ? formatCurrency(kpis.totalVencido) : '—'"
        icon="bi-exclamation-triangle-fill"
        badge="Atenção"
        badge-variant="amber"
        :suffix="kpis ? `${formatNumber(kpis.quantidadeVencido)} título(s) em atraso` : undefined"
      />
      <KpiCard
        label="Total Liquidado"
        :value="kpis ? formatCurrency(kpis.totalLiquidado) : '—'"
        icon="bi-check-circle-fill"
        badge="Quitado"
        badge-variant="green"
        :suffix="kpis ? `${formatNumber(kpis.quantidadeLiquidado)} título(s) pagos` : undefined"
      />
      <KpiCard
        label="Total Geral de Títulos"
        :value="kpis ? formatCurrency(kpis.totalGeral) : '—'"
        icon="bi-receipt"
        :suffix="kpis ? `${formatNumber(kpis.totalTitulos)} título(s) no total` : undefined"
      />
    </div>

    <!-- Gráfico de Fluxo de Vencimentos -->
    <div class="rounded-card border border-surface-border bg-surface p-5 shadow-sm">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-base font-bold text-ink">Fluxo de Vencimentos</h2>
          <p class="text-xs text-ink-muted">Distribuição temporal das obrigações a pagar por competência de vencimento</p>
        </div>
      </div>

      <div v-if="carregando && !painel" class="py-12">
        <SkeletonCard variant="chart" :height="260" />
      </div>
      <EmptyState
        v-else-if="!seriesFluxo.length || seriesFluxo.every(s => s.data.every(v => v === 0))"
        icon="bi-calendar-check"
        title="Nenhum vencimento no período"
        description="Não há fluxo de contas a pagar para a seleção atual."
      />
      <div v-else class="h-[280px]">
        <BarChart
          :categories="categoriasFluxo"
          :series="seriesFluxo"
          :height="260"
          :stacked="true"
          :value-formatter="formatCurrency"
        />
      </div>
    </div>

    <!-- Tabela Detalhada com Filtros Locais -->
    <div class="rounded-card border border-surface-border bg-surface p-5 shadow-sm">
      <div class="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-base font-bold text-ink">Relação Detalhada de Títulos</h2>
          <p class="text-xs text-ink-muted">Listagem analítica com status em tempo real</p>
        </div>

        <!-- Filtros Rápidos de Situação e Busca -->
        <div class="flex flex-wrap items-center gap-2">
          <div class="inline-flex rounded-btn border border-surface-border bg-surface-bg p-0.5 text-xs font-semibold">
            <button
              class="rounded px-2.5 py-1 transition-colors"
              :class="situacaoFiltro === 'TODOS' ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'"
              @click="situacaoFiltro = 'TODOS'"
            >
              Todos ({{ painel?.items.length ?? 0 }})
            </button>
            <button
              class="rounded px-2.5 py-1 transition-colors"
              :class="situacaoFiltro === 'A_VENCER' ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'"
              @click="situacaoFiltro = 'A_VENCER'"
            >
              A Vencer
            </button>
            <button
              class="rounded px-2.5 py-1 transition-colors"
              :class="situacaoFiltro === 'VENCIDO' ? 'bg-surface text-danger-700 shadow-xs' : 'text-ink-muted hover:text-ink'"
              @click="situacaoFiltro = 'VENCIDO'"
            >
              Vencidos
            </button>
            <button
              class="rounded px-2.5 py-1 transition-colors"
              :class="situacaoFiltro === 'LIQUIDADO' ? 'bg-surface text-green-700 shadow-xs' : 'text-ink-muted hover:text-ink'"
              @click="situacaoFiltro = 'LIQUIDADO'"
            >
              Liquidados
            </button>
          </div>

          <div class="relative w-full sm:w-64">
            <i class="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted" />
            <input
              v-model="busca"
              type="text"
              placeholder="Buscar favorecido, doc..."
              class="w-full rounded-btn border border-surface-border bg-surface-bg py-1.5 pl-8 pr-3 text-xs text-ink placeholder:text-ink-muted focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <!-- Estado de Carregamento / Erro / Dados -->
      <div v-if="carregando && !painel" class="space-y-2">
        <SkeletonCard v-for="i in 5" :key="i" variant="table-row" />
      </div>

      <EmptyState
        v-else-if="erro"
        icon="bi-exclamation-triangle"
        title="Erro ao carregar dados"
        :description="erro"
      >
        <BaseButton variant="secondary" class="mt-3" @click="carregarDados">
          Tentar novamente
        </BaseButton>
      </EmptyState>

      <template v-else>
        <DataTable
          :columns="colunas"
          :rows="paginated"
          :row-key="(r) => (r as ContaPainelItem).idDocumento + (r as ContaPainelItem).numero"
          empty-title="Nenhuma conta a pagar encontrada"
          empty-description="Não há títulos para os filtros de busca e período informados."
        >
          <template #cell-nome="{ row }">
            <span class="font-semibold text-ink">{{ (row as ContaPainelItem).nome || 'Fornecedor não informado' }}</span>
            <p v-if="(row as ContaPainelItem).descricao" class="line-clamp-1 text-[11px] text-ink-muted">
              {{ (row as ContaPainelItem).descricao }}
            </p>
          </template>

          <template #cell-numero="{ row }">
            <span class="font-mono text-xs">{{ (row as ContaPainelItem).numero || '—' }}</span>
          </template>

          <template #cell-dtVencimento="{ row }">
            <span class="text-xs">{{ formatarDataIso((row as ContaPainelItem).dtVencimento) }}</span>
          </template>

          <template #cell-nomeLoja="{ row }">
            <span class="text-xs text-ink-muted">{{ (row as ContaPainelItem).nomeLoja }}</span>
          </template>

          <template #cell-valOrigem="{ row }">
            <span class="text-xs">{{ formatCurrency((row as ContaPainelItem).valOrigem) }}</span>
          </template>

          <template #cell-valPago="{ row }">
            <span class="text-xs text-green-700">{{ formatCurrency((row as ContaPainelItem).valPago) }}</span>
          </template>

          <template #cell-valSaldo="{ row }">
            <span
              class="text-xs font-bold"
              :class="(row as ContaPainelItem).situacao === 'VENCIDO' ? 'text-danger-700' : 'text-ink'"
            >
              {{ formatCurrency((row as ContaPainelItem).valSaldo) }}
            </span>
          </template>

          <template #cell-situacao="{ row }">
            <StatusBadge
              :variant="
                (row as ContaPainelItem).situacao === 'LIQUIDADO'
                  ? 'success'
                  : (row as ContaPainelItem).situacao === 'VENCIDO'
                  ? 'danger'
                  : 'warning'
              "
            >
              {{
                (row as ContaPainelItem).situacao === 'LIQUIDADO'
                  ? 'Liquidado'
                  : (row as ContaPainelItem).situacao === 'VENCIDO'
                  ? 'Vencido'
                  : 'A Vencer'
              }}
            </StatusBadge>
          </template>

          <template #cell-acoes="{ row }">
            <BaseButton variant="secondary" size="sm" @click="abrirDetalhe(row as ContaPainelItem)">
              Detalhes
            </BaseButton>
          </template>
        </DataTable>

        <div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted">
          <span>{{ itensFiltrados.length }} título(s) listado(s)</span>
          <Pagination v-model:page="page" :total="itensFiltrados.length" :items-per-page="15" />
        </div>
      </template>
    </div>

    <!-- Modal de Detalhes da Conta -->
    <DialogRoot v-model:open="modalAberto">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-40 bg-ink/40" />
        <DialogContent
          class="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-card bg-surface p-6 shadow-xl"
        >
          <div class="flex items-center justify-between gap-3">
            <DialogTitle class="text-lg font-bold text-ink">
              Detalhes do Título a Pagar
            </DialogTitle>
            <DialogClose
              class="flex h-9 w-9 items-center justify-center rounded-btn hover:bg-surface-bg text-ink-muted hover:text-ink"
              aria-label="Fechar"
            >
              <i class="bi bi-x-lg" />
            </DialogClose>
          </div>

          <DialogDescription class="mt-1 text-xs text-ink-muted">
            Informações cadastrais e financeiras sincronizadas do ERP
          </DialogDescription>

          <div v-if="detalhe" class="mt-5 space-y-4">
            <div class="rounded-btn border border-surface-border bg-surface-bg p-4">
              <p class="text-xs font-semibold uppercase text-ink-muted">Favorecido / Fornecedor</p>
              <p class="mt-1 text-base font-bold text-ink">{{ detalhe.nome || 'Não informado' }}</p>
              <p v-if="detalhe.descricao" class="mt-2 text-xs text-ink">{{ detalhe.descricao }}</p>
            </div>

            <dl class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt class="text-xs text-ink-muted">Documento</dt>
                <dd class="font-semibold">{{ detalhe.numero || '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs text-ink-muted">Unidade / Loja</dt>
                <dd>{{ detalhe.nomeLoja }}</dd>
              </div>
              <div>
                <dt class="text-xs text-ink-muted">Lançamento</dt>
                <dd>{{ formatarDataIso(detalhe.dtLancamento) }}</dd>
              </div>
              <div>
                <dt class="text-xs text-ink-muted">Vencimento</dt>
                <dd class="font-semibold" :class="detalhe.situacao === 'VENCIDO' ? 'text-danger-700' : 'text-ink'">
                  {{ formatarDataIso(detalhe.dtVencimento) }}
                </dd>
              </div>
              <div>
                <dt class="text-xs text-ink-muted">Valor Original</dt>
                <dd>{{ formatCurrency(detalhe.valOrigem) }}</dd>
              </div>
              <div>
                <dt class="text-xs text-ink-muted">Valor Pago</dt>
                <dd class="text-green-700">{{ formatCurrency(detalhe.valPago) }}</dd>
              </div>
              <div>
                <dt class="text-xs text-ink-muted">Saldo Devedor</dt>
                <dd class="text-base font-bold" :class="detalhe.valSaldo > 0 ? 'text-danger-700' : 'text-green-700'">
                  {{ formatCurrency(detalhe.valSaldo) }}
                </dd>
              </div>
              <div>
                <dt class="text-xs text-ink-muted">Data Pagamento</dt>
                <dd>{{ formatarDataIso(detalhe.dtPagamento) }}</dd>
              </div>
            </dl>

            <div class="flex items-center justify-between rounded-btn bg-surface-bg p-3">
              <span class="text-xs text-ink-muted">Situação do Pagamento</span>
              <StatusBadge
                :variant="
                  detalhe.situacao === 'LIQUIDADO'
                    ? 'success'
                    : detalhe.situacao === 'VENCIDO'
                    ? 'danger'
                    : 'warning'
                "
              >
                {{
                  detalhe.situacao === 'LIQUIDADO'
                    ? 'Liquidado'
                    : detalhe.situacao === 'VENCIDO'
                    ? 'Vencido'
                    : 'A Vencer'
                }}
              </StatusBadge>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </div>
</template>

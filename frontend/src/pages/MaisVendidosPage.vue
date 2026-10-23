<script setup lang="ts">
import { computed, ref, watch, watchEffect, onMounted } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import GlobalFilters from '@/components/filters/GlobalFilters.vue'
import KpiCard from '@/components/ui/KpiCard.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import Pagination from '@/components/ui/Pagination.vue'
import { HBarChart } from '@/components/charts/lazy'
import { useVendasStore } from '@/stores/useVendasStore'
import { useFiltersStore } from '@/stores/useFiltersStore'
import { useExportStore } from '@/stores/useExportStore'
import { useLojasStore } from '@/stores/useLojasStore'
import { useRecarregarDados } from '@/composables/useRecarregarDados'
import { usePagination } from '@/composables/usePagination'
import { formatCurrency, formatNumber, formatPercent, formatCompact } from '@/utils/formatters'
import { exportarCsv } from '@/utils/exportar'
import { useUiStore } from '@/stores/useUiStore'

const vendasStore = useVendasStore()
const filters = useFiltersStore()
const exportStore = useExportStore()
const lojasStore = useLojasStore()
const ui = useUiStore()
const { periodoAtualISO } = useRecarregarDados()

// Critério de ordenação: por padrão "Quantidade" (do mais vendido para o menos vendido)
const ordenarPor = ref<'qtd' | 'valor'>('qtd')
const busca = ref('')

function carregarDados() {
  const { inicio, fim } = periodoAtualISO()
  const idLoja = filters.lojasSelecionadas.length === 1 ? filters.lojasSelecionadas[0] : undefined
  vendasStore.carregarItensVendidos(inicio, fim, idLoja)
}

watch(
  () => [filters.periodo, filters.range.inicio, filters.range.fim, filters.lojasSelecionadas],
  () => carregarDados(),
  { immediate: true },
)

onMounted(() => {
  if (lojasStore.lojas.length === 0) {
    lojasStore.carregarLojas()
  }
  // Se ainda estiver no preset padrão 'semana', foca no dia de hoje ao abrir Mais Vendidos
  if (filters.periodo === 'semana') {
    filters.setHoje()
  }
})

// Cálculos agregados do período ativo
const totalItens = computed(() =>
  vendasStore.itensVendidos.reduce((acc, it) => acc + (it.qtd || 0), 0),
)

const totalFaturamento = computed(() =>
  vendasStore.itensVendidos.reduce((acc, it) => acc + (it.valTotalLiquido || 0), 0),
)

const precoMedioGeral = computed(() =>
  totalItens.value > 0 ? totalFaturamento.value / totalItens.value : 0,
)

// Estruturação enriquecida dos itens vendidos
export interface ItemVendidoEnriquecido extends Record<string, unknown> {
  rank: number
  idMercadoriaVariacao: string
  descricao: string
  qtd: number
  valTotalLiquido: number
  precoMedio: number
  percentualVolume: number
  percentualFaturamento: number
}

// Lista ordenada do mais vendido para o menos vendido
const itensOrdenados = computed<ItemVendidoEnriquecido[]>(() => {
  const lista = [...vendasStore.itensVendidos]

  if (ordenarPor.value === 'qtd') {
    // Ordena primariamente por quantidade decrescente, desempate por faturamento
    lista.sort((a, b) => b.qtd - a.qtd || b.valTotalLiquido - a.valTotalLiquido)
  } else {
    // Ordena por faturamento decrescente
    lista.sort((a, b) => b.valTotalLiquido - a.valTotalLiquido || b.qtd - a.qtd)
  }

  const volTotal = totalItens.value
  const fatTotal = totalFaturamento.value

  return lista.map((it, idx) => ({
    rank: idx + 1,
    idMercadoriaVariacao: it.idMercadoriaVariacao,
    descricao: it.descricao || 'Produto sem descrição',
    qtd: it.qtd,
    valTotalLiquido: it.valTotalLiquido,
    precoMedio: it.qtd > 0 ? it.valTotalLiquido / it.qtd : 0,
    percentualVolume: volTotal > 0 ? (it.qtd / volTotal) * 100 : 0,
    percentualFaturamento: fatTotal > 0 ? (it.valTotalLiquido / fatTotal) * 100 : 0,
  }))
})

// Produto Líder (#1 mais vendido)
const produtoCampeao = computed(() => itensOrdenados.value[0] || null)

// Filtro de busca textual
const linhasFiltradas = computed<ItemVendidoEnriquecido[]>(() => {
  const termo = busca.value.trim().toLowerCase()
  if (!termo) return itensOrdenados.value
  return itensOrdenados.value.filter(
    (item) =>
      item.descricao.toLowerCase().includes(termo) ||
      item.idMercadoriaVariacao.toLowerCase().includes(termo),
  )
})

// Top 10 para o gráfico de barras horizontal
const top10Grafico = computed(() => itensOrdenados.value.slice(0, 10))

const graficoCategorias = computed(() => top10Grafico.value.map((i) => i.descricao))
const graficoSeries = computed(() => {
  if (ordenarPor.value === 'qtd') {
    return [{ name: 'Qtd Vendida (un.)', data: top10Grafico.value.map((i) => i.qtd) }]
  }
  return [{ name: 'Faturamento (R$)', data: top10Grafico.value.map((i) => i.valTotalLiquido) }]
})

// Paginação da tabela (10 itens por página)
const { page, paginated } = usePagination(linhasFiltradas, 10)

// Exportação CSV registrada no store global
watchEffect(() => {
  const { inicio } = periodoAtualISO()
  exportStore.registrar(
    `mais-vendidos-${inicio}`,
    [
      { chave: 'rank', rotulo: 'Posição' },
      { chave: 'descricao', rotulo: 'Produto' },
      { chave: 'qtd', rotulo: 'Quantidade Vendida' },
      { chave: 'valTotalLiquido', rotulo: 'Faturamento Total (R$)' },
      { chave: 'precoMedio', rotulo: 'Preço Médio (R$)' },
      { chave: 'percentualVolume', rotulo: '% do Volume' },
    ],
    linhasFiltradas.value.map((it) => ({
      rank: it.rank,
      descricao: it.descricao,
      qtd: `${it.qtd} un.`,
      valTotalLiquido: formatCurrency(it.valTotalLiquido),
      precoMedio: formatCurrency(it.precoMedio),
      percentualVolume: formatPercent(it.percentualVolume, true),
    })),
  )
})

function dispararExportacao() {
  if (linhasFiltradas.value.length === 0) {
    ui.toast({ title: 'Nenhum dado para exportar', variant: 'info' })
    return
  }
  exportarCsv(
    exportStore.nomeArquivo,
    exportStore.colunas,
    exportStore.linhas,
  )
  ui.toast({ title: 'Relatório CSV exportado com sucesso!', variant: 'success' })
}
</script>

<template>
  <div class="space-y-5">
    <!-- Cabeçalho da Página com Ações -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <PageHeader
          title="Produtos Mais Vendidos"
          subtitle="Ranking analítico de saída de produtos por dia ou período, detalhando unidades comercializadas e faturamento."
        />
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-btn border border-surface-border bg-surface px-3.5 py-2 text-xs font-semibold text-ink shadow-sm transition-all hover:bg-surface-bg hover:border-brand-300"
          @click="dispararExportacao"
        >
          <i class="bi bi-file-earmark-arrow-down text-emerald-600" />
          <span>Exportar CSV</span>
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-btn border border-surface-border bg-surface px-3.5 py-2 text-xs font-semibold text-ink shadow-sm transition-all hover:bg-surface-bg hover:border-brand-300"
          :disabled="vendasStore.carregandoItensVendidos"
          @click="carregarDados"
        >
          <i
            class="bi bi-arrow-clockwise text-brand-600"
            :class="vendasStore.carregandoItensVendidos && 'animate-spin'"
          />
          <span>Atualizar</span>
        </button>
      </div>
    </div>

    <!-- Barra de Filtros Globais (com Day Stepper, Hoje, Ontem, etc.) -->
    <GlobalFilters />

    <!-- Faixa Informativa e Navegação Rápida entre Dias -->
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-card border border-surface-border/70 bg-surface px-4 py-3 shadow-xs">
      <div class="flex items-center gap-2 text-xs">
        <span class="font-bold text-ink flex items-center gap-1.5">
          <i class="bi bi-clock-history text-brand-600" />
          Visualizando dados de:
        </span>
        <span class="rounded-full bg-brand-50 px-2.5 py-0.5 font-bold text-brand-800 border border-brand-200">
          {{ filters.rotuloDiaAtivo }}
        </span>
        <span v-if="filters.periodo === 'ontem'" class="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
          Dados de Ontem
        </span>
        <span v-else-if="filters.periodo === 'dia'" class="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          Dados de Hoje
        </span>
      </div>

      <!-- Botões de Transição Fácil entre Dias -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-btn border border-surface-border bg-surface-bg px-3 py-1.5 text-xs font-semibold text-ink shadow-xs transition-colors hover:bg-surface hover:border-brand-400 cursor-pointer"
          title="Ver o dia anterior"
          @click="filters.irParaDiaAnterior"
        >
          <i class="bi bi-arrow-left" />
          <span>Dia Anterior</span>
        </button>

        <button
          type="button"
          class="rounded-btn border border-surface-border bg-surface-bg px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface hover:border-brand-400"
          :class="filters.periodo === 'ontem' && 'bg-brand-50 border-brand-300 text-brand-800 font-bold'"
          @click="filters.setOntem"
        >
          Ontem
        </button>

        <button
          type="button"
          class="rounded-btn border border-surface-border bg-surface-bg px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface hover:border-brand-400"
          :class="filters.periodo === 'dia' && 'bg-brand-50 border-brand-300 text-brand-800 font-bold'"
          @click="filters.setHoje"
        >
          Hoje
        </button>

        <button
          type="button"
          :disabled="!filters.podeAvancarDia"
          class="inline-flex items-center gap-1.5 rounded-btn border border-surface-border bg-surface-bg px-3 py-1.5 text-xs font-semibold text-ink shadow-xs transition-colors"
          :class="
            filters.podeAvancarDia
              ? 'hover:bg-surface hover:border-brand-400 cursor-pointer text-ink'
              : 'opacity-40 cursor-not-allowed text-ink-muted'
          "
          title="Ver o dia seguinte"
          @click="filters.irParaDiaSeguinte"
        >
          <span>Dia Seguinte</span>
          <i class="bi bi-arrow-right" />
        </button>
      </div>
    </div>

    <!-- Skeletons durante carregamento -->
    <div v-if="vendasStore.carregandoItensVendidos" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SkeletonCard v-for="i in 4" :key="i" variant="kpi" />
    </div>

    <!-- Erro no carregamento -->
    <EmptyState
      v-else-if="vendasStore.erroItensVendidos"
      icon="bi-exclamation-triangle"
      title="Não foi possível carregar os itens vendidos"
      :description="vendasStore.erroItensVendidos"
    >
      <BaseButton variant="secondary" class="mt-3" @click="carregarDados">Tentar novamente</BaseButton>
    </EmptyState>

    <!-- Conteúdo Principal -->
    <template v-else>
      <!-- KPIs Executivos do Período -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <!-- KPI 1: Volume Total de Produtos -->
        <KpiCard
          label="Volume Total Vendido"
          :value="`${formatNumber(totalItens)} un.`"
          suffix="Itens faturados no período"
          icon="bi-box-seam-fill"
          highlight
        />

        <!-- KPI 2: Faturamento Gerado por Produtos -->
        <KpiCard
          label="Faturamento dos Produtos"
          :value="formatCurrency(totalFaturamento)"
          suffix="Receita líquida total"
          icon="bi-currency-dollar"
        />

        <!-- KPI 3: Produto Campeão (#1) -->
        <KpiCard
          label="Produto Mais Vendido (#1)"
          :value="produtoCampeao ? `${formatNumber(produtoCampeao.qtd)} un.` : '—'"
          :suffix="produtoCampeao ? produtoCampeao.descricao : 'Sem vendas no período'"
          badge="Líder do Dia"
          badge-variant="amber"
          icon="bi-trophy-fill"
        />

        <!-- KPI 4: Preço Médio por Item -->
        <KpiCard
          label="Preço Médio por Peça"
          :value="formatCurrency(precoMedioGeral)"
          :suffix="`${formatNumber(itensOrdenados.length)} produtos distintos`"
          icon="bi-tag-fill"
        />
      </div>

      <!-- Gráfico Top 10 Produtos Mais Vendidos -->
      <div class="rounded-card border border-surface-border bg-surface p-5 shadow-sm">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-surface-border/50 pb-3">
          <div>
            <h2 class="text-base font-bold text-ink">Top 10 Produtos em Destaque</h2>
            <p class="text-xs text-ink-muted">Visão comparativa gráfica dos itens líderes</p>
          </div>

          <!-- Alternância de métrica do gráfico -->
          <div class="inline-flex rounded-btn bg-surface-bg p-1 text-xs font-semibold">
            <button
              type="button"
              class="rounded-btn px-3 py-1.5 transition-colors"
              :class="
                ordenarPor === 'qtd'
                  ? 'bg-brand-700 text-white shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              "
              @click="ordenarPor = 'qtd'"
            >
              <i class="bi bi-bar-chart-fill mr-1" />Por Quantidade
            </button>
            <button
              type="button"
              class="rounded-btn px-3 py-1.5 transition-colors"
              :class="
                ordenarPor === 'valor'
                  ? 'bg-brand-700 text-white shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              "
              @click="ordenarPor = 'valor'"
            >
              <i class="bi bi-currency-dollar mr-1" />Por Faturamento
            </button>
          </div>
        </div>

        <EmptyState
          v-if="top10Grafico.length === 0"
          title="Nenhum produto vendido no período selecionado"
          description="Altere a data ou selecione outro dia acima para visualizar o ranking."
        />
        <HBarChart
          v-else
          :categories="graficoCategorias"
          :series="graficoSeries"
          :value-formatter="ordenarPor === 'qtd' ? (v) => `${formatNumber(v)} un.` : formatCompact"
          :height="320"
        />
      </div>

      <!-- Tabela Completa do Mais Vendido para o Menos Vendido -->
      <div class="rounded-card border border-surface-border bg-surface p-5 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-surface-border/50 pb-4">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-base font-bold text-ink">Ranking Completo de Vendas por Produto</h2>
              <span class="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-bold text-brand-800">
                {{ itensOrdenados.length }} itens
              </span>
            </div>
            <p class="text-xs text-ink-muted">
              Listando do mais vendido para o menos vendido com quantidade e valor correspondente.
            </p>
          </div>

          <!-- Busca e Ordenação -->
          <div class="flex flex-wrap items-center gap-3">
            <input
              v-model="busca"
              type="search"
              placeholder="Buscar por descrição ou código..."
              class="w-full max-w-xs rounded-btn border border-surface-border bg-surface-bg px-3 py-2 text-xs outline-none focus:border-brand-500"
            />

            <!-- Toggle de Ordenação -->
            <div class="flex items-center gap-1 rounded-btn bg-surface-bg p-1 text-xs font-semibold">
              <button
                type="button"
                class="rounded-btn px-2.5 py-1.5 transition-all"
                :class="ordenarPor === 'qtd' ? 'bg-brand-700 text-white' : 'text-ink-muted hover:text-ink'"
                title="Ordenar do mais vendido para o menos vendido por quantidade"
                @click="ordenarPor = 'qtd'"
              >
                Mais Vendidos (Qtd)
              </button>
              <button
                type="button"
                class="rounded-btn px-2.5 py-1.5 transition-all"
                :class="ordenarPor === 'valor' ? 'bg-brand-700 text-white' : 'text-ink-muted hover:text-ink'"
                title="Ordenar do maior faturamento para o menor"
                @click="ordenarPor = 'valor'"
              >
                Maior Valor (R$)
              </button>
            </div>
          </div>
        </div>

        <div class="mt-4">
          <EmptyState
            v-if="linhasFiltradas.length === 0"
            title="Nenhum produto encontrado"
            description="Tente ajustar os termos de busca ou mudar a data selecionada."
          />

          <!-- Tabela Desktop / Tablet (>= 768px) -->
          <div v-else class="hidden overflow-x-auto md:block">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-surface-border/60 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  <th class="py-3 pr-3 text-center w-16">Posição</th>
                  <th class="py-3 px-3">Produto</th>
                  <th class="py-3 px-3 text-right">Qtd. Vendida</th>
                  <th class="py-3 px-3 text-right">Valor Total</th>
                  <th class="py-3 px-3 text-right">Preço Médio</th>
                  <th class="py-3 pl-3 text-center w-36">Participação</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-border/40 font-medium text-ink">
                <tr
                  v-for="item in paginated"
                  :key="item.idMercadoriaVariacao"
                  class="transition-colors hover:bg-surface-bg/70"
                >
                  <!-- Posição com destaque para pódio -->
                  <td class="py-3 pr-3 text-center">
                    <span
                      v-if="item.rank === 1"
                      class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800 shadow-sm"
                      title="1º Lugar (Campeão de Vendas)"
                    >
                      🥇
                    </span>
                    <span
                      v-else-if="item.rank === 2"
                      class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-800 shadow-sm"
                      title="2º Lugar"
                    >
                      🥈
                    </span>
                    <span
                      v-else-if="item.rank === 3"
                      class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-700/20 text-xs font-bold text-amber-900 shadow-sm"
                      title="3º Lugar"
                    >
                      🥉
                    </span>
                    <span v-else class="text-xs font-semibold text-ink-muted">
                      #{{ item.rank }}
                    </span>
                  </td>

                  <!-- Nome e Detalhe do Produto -->
                  <td class="py-3 px-3">
                    <div class="font-bold text-ink">{{ item.descricao }}</div>
                    <div class="text-[10px] text-ink-muted font-mono">Cód: {{ item.idMercadoriaVariacao }}</div>
                  </td>

                  <!-- Quantidade Vendida (em destaque conforme pedido) -->
                  <td class="py-3 px-3 text-right">
                    <span class="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800">
                      {{ formatNumber(item.qtd) }} un.
                    </span>
                  </td>

                  <!-- Valor Faturado a esse valor no dia -->
                  <td class="py-3 px-3 text-right font-bold text-ink">
                    {{ formatCurrency(item.valTotalLiquido) }}
                  </td>

                  <!-- Preço Médio Praticado -->
                  <td class="py-3 px-3 text-right text-ink-muted">
                    {{ formatCurrency(item.precoMedio) }}
                  </td>

                  <!-- Participação no Total com Barra Visual -->
                  <td class="py-3 pl-3">
                    <div class="flex items-center justify-center gap-2">
                      <div class="h-2 w-16 overflow-hidden rounded-full bg-slate-200">
                        <div
                          class="h-full rounded-full bg-brand-600"
                          :style="{ width: `${Math.min(100, item.percentualVolume)}%` }"
                        />
                      </div>
                      <span class="text-[11px] font-semibold text-ink-muted min-w-[36px] text-right">
                        {{ formatPercent(item.percentualVolume, true) }}
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Cards Mobile (< 768px) -->
          <div class="space-y-3 md:hidden">
            <div
              v-for="item in paginated"
              :key="item.idMercadoriaVariacao"
              class="rounded-btn border border-surface-border bg-surface-bg/50 p-3.5 shadow-sm"
            >
              <div class="flex items-start justify-between gap-2 border-b border-surface-border/50 pb-2">
                <div class="flex items-center gap-2">
                  <span
                    class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                    :class="
                      item.rank === 1
                        ? 'bg-amber-100 text-amber-800'
                        : item.rank === 2
                          ? 'bg-slate-200 text-slate-800'
                          : item.rank === 3
                            ? 'bg-amber-700/20 text-amber-900'
                            : 'bg-surface-bg text-ink-muted'
                    "
                  >
                    #{{ item.rank }}
                  </span>
                  <div>
                    <p class="text-sm font-bold text-ink">{{ item.descricao }}</p>
                    <p class="text-[10px] text-ink-muted font-mono">Cód: {{ item.idMercadoriaVariacao }}</p>
                  </div>
                </div>
              </div>

              <div class="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span class="text-[10px] uppercase text-ink-muted block font-semibold">Qtd. Vendida</span>
                  <span class="font-bold text-emerald-700">{{ formatNumber(item.qtd) }} un.</span>
                </div>
                <div>
                  <span class="text-[10px] uppercase text-ink-muted block font-semibold">Faturamento Total</span>
                  <span class="font-bold text-ink">{{ formatCurrency(item.valTotalLiquido) }}</span>
                </div>
                <div>
                  <span class="text-[10px] uppercase text-ink-muted block font-semibold">Preço Médio</span>
                  <span class="text-ink-muted">{{ formatCurrency(item.precoMedio) }}</span>
                </div>
                <div>
                  <span class="text-[10px] uppercase text-ink-muted block font-semibold">Participação</span>
                  <span class="text-brand-700 font-semibold">{{ formatPercent(item.percentualVolume, true) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Rodapé de Paginação -->
          <div class="mt-4 flex flex-col items-start gap-2 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between border-t border-surface-border/40 pt-3">
            <span>
              Mostrando
              {{ linhasFiltradas.length === 0 ? 0 : (page - 1) * 10 + 1 }}-{{ Math.min(page * 10, linhasFiltradas.length) }}
              de {{ linhasFiltradas.length }} produtos
            </span>
            <Pagination v-model:page="page" :total="linhasFiltradas.length" :items-per-page="10" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

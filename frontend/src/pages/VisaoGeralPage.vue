<script setup lang="ts">
import { ref, computed, watchEffect, onMounted, onUnmounted } from 'vue'
import GlobalFilters from '@/components/filters/GlobalFilters.vue'
import KpiCard from '@/components/ui/KpiCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { BarChart } from '@/components/charts/lazy'
import { useVendasStore } from '@/stores/useVendasStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useFiltersStore } from '@/stores/useFiltersStore'
import { useExportStore } from '@/stores/useExportStore'
import { useLojasStore } from '@/stores/useLojasStore'
import { useAggregations } from '@/composables/useAggregations'
import { useRecarregarDados } from '@/composables/useRecarregarDados'
import { formatCurrency, formatCompact, formatNumber, formatPercent } from '@/utils/formatters'

const vendasStore = useVendasStore()
const authStore = useAuthStore()
const filtersStore = useFiltersStore()
const exportStore = useExportStore()
const lojasStore = useLojasStore()
const agg = useAggregations()
const { forcarAtualizacao } = useRecarregarDados()

// Métricas e agregações temporais ajustadas
const diaSemana = computed(() => agg.vendasPorDiaSemana())
const porHora = computed(() => agg.vendasPorHora())

// Modo Smart TV (apresentação executiva em tela cheia)
const modoTv = ref(false)
const ultimaAtualizacao = ref(new Date())
let timerAutoRefresh: ReturnType<typeof setInterval> | null = null

function formatHoraMinuto(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function alternarModoTv() {
  modoTv.value = !modoTv.value
  if (modoTv.value) {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    }
  } else {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    }
  }
}

// Auto-refresh a cada 5 minutos quando em modo apresentação
onMounted(() => {
  timerAutoRefresh = setInterval(async () => {
    if (modoTv.value) {
      await forcarAtualizacao()
      ultimaAtualizacao.value = new Date()
    }
  }, 5 * 60 * 1000)
})

onUnmounted(() => {
  if (timerAutoRefresh) clearInterval(timerAutoRefresh)
})

// Lojas disponíveis sob escopo de permissões
const lojasDisponiveis = computed(() => {
  if (lojasStore.lojas.length > 0) {
    if (!authStore.isMatrizAdmin && authStore.lojasAutorizadas.length > 0) {
      return lojasStore.lojas.filter((l) => authStore.lojasAutorizadas.includes(l.id))
    }
    return lojasStore.lojas
  }
  return []
})

// Subtítulo contextual multiloja
const contextoLojas = computed(() => {
  if (filtersStore.lojasSelecionadas.length === 0) {
    if (!authStore.isMatrizAdmin) {
      if (lojasDisponiveis.value.length === 1) {
        const u = lojasDisponiveis.value[0]
        return `${u?.nome ?? 'Minha Loja'} (${u?.cidade ?? ''}/${u?.uf ?? ''})`
      }
      const nomes = lojasDisponiveis.value.map((l) => l.nome).join(', ')
      return `Total das minhas lojas (${nomes})`
    }
    const nomes = lojasDisponiveis.value.map((l) => l.nome).join(', ')
    return nomes ? `Total consolidado da rede: ${nomes}` : 'Total consolidado de todas as unidades da rede'
  }
  if (filtersStore.lojasSelecionadas.length === 1) {
    const id = filtersStore.lojasSelecionadas[0]
    const u = lojasStore.lojas.find((l) => l.id === id)
    return u ? `${u.nome} (${u.cidade}/${u.uf})` : 'Unidade individual selecionada'
  }
  const selecionadas = lojasStore.lojas.filter((l) => filtersStore.lojasSelecionadas.includes(l.id))
  const nomes = selecionadas.map((l) => l.nome).join(' vs. ')
  return `Comparativo Lado a Lado: ${nomes}`
})

// Ativação da visão comparativa lado a lado
const comparativoLadoALadoAtivo = computed(() => {
  if (filtersStore.lojasSelecionadas.length > 1) return true
  if (filtersStore.lojasSelecionadas.length === 0 && agg.comparativoLojas.value.length > 1) return true
  return false
})

// Dados para o gráfico de barras comparativo de faturamento
const comparativoCategorias = computed(() => agg.comparativoLojas.value.map((l) => l.nomeLoja))
const comparativoSeries = computed(() => [
  {
    name: 'Faturamento (R$)',
    data: agg.comparativoLojas.value.map((l) => l.faturamento),
  },
])

// Exportação estruturada com métricas do escopo executivo e comparativo
watchEffect(() => {
  const linhas: Array<{ indicador: string; valor: string; detalhe: string }> = [
    {
      indicador: 'Total de Vendas (Faturamento)',
      valor: formatCurrency(agg.kpisGerais.value.totalPeriodo),
      detalhe: contextoLojas.value,
    },
    {
      indicador: 'Custo Total (CMV Estimado)',
      valor: formatCurrency(agg.kpisGerais.value.custoTotal),
      detalhe: `${formatPercent(agg.kpisGerais.value.cmvPercentual, true)} do Faturamento (Estimativa benchmark 35%)`,
    },
    {
      indicador: 'Ticket Médio',
      valor: formatCurrency(agg.kpisGerais.value.ticketMedio),
      detalhe: `${formatNumber(agg.kpisGerais.value.numeroVendas)} vendas elegíveis`,
    },
    {
      indicador: 'Dia de Maior Faturamento',
      valor: diaSemana.value.diaMaiorFaturamento,
      detalhe: formatCurrency(diaSemana.value.valorMaiorFaturamento),
    },
    {
      indicador: 'Horário de Pico de Vendas',
      valor: porHora.value.horaPico,
      detalhe: formatCurrency(porHora.value.valorPico),
    },
  ]

  if (agg.comparativoLojas.value.length > 1) {
    for (const loja of agg.comparativoLojas.value) {
      linhas.push({
        indicador: `Unidade: ${loja.nomeLoja}`,
        valor: formatCurrency(loja.faturamento),
        detalhe: `${formatNumber(loja.numeroVendas)} vendas | Ticket Médio: ${formatCurrency(loja.ticketMedio)} | CMV (35%): ${formatCurrency(loja.custoTotal)} | Part: ${formatPercent(loja.percentualFaturamento, true)}`,
      })
    }
  }

  exportStore.registrar(
    'visao-geral-executiva',
    [
      { chave: 'indicador', rotulo: 'Indicador' },
      { chave: 'valor', rotulo: 'Valor' },
      { chave: 'detalhe', rotulo: 'Detalhe' },
    ],
    linhas,
  )
})
</script>

<template>
  <div :class="[modoTv && 'tv-mode-container bg-surface-bg p-4 sm:p-6 transition-all min-h-screen']">
    <!-- Cabeçalho Executivo -->
    <div class="mb-5 flex flex-wrap items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2.5">
          <h1 class="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Painel Executivo
          </h1>
          <span
            v-if="!authStore.isMatrizAdmin"
            class="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-bold text-brand-800"
          >
            <i class="bi bi-shield-lock mr-1" />Franqueado
          </span>
          <span
            v-else
            class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700"
          >
            <i class="bi bi-globe mr-1" />Rede Global
          </span>
        </div>
        <p class="mt-1 text-xs text-ink-muted sm:text-sm">
          Foco financeiro e temporal para tomada de decisão em tempo real.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <!-- Badge de Atualização / Live Pulse -->
        <div class="hidden items-center gap-2 rounded-btn bg-surface px-3 py-1.5 text-xs font-medium text-ink shadow-sm sm:flex">
          <span class="relative flex h-2 w-2">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span class="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          <span>Ao Vivo &bull; {{ formatHoraMinuto(ultimaAtualizacao) }}</span>
        </div>

        <!-- Botão Alternar Modo Smart TV -->
        <button
          type="button"
          class="flex items-center gap-2 rounded-btn border border-surface-border bg-surface px-3.5 py-2 text-xs font-semibold text-ink shadow-sm transition-all hover:border-brand-400 hover:bg-brand-50"
          :class="modoTv ? 'border-brand-500 bg-brand-50 text-brand-800' : ''"
          @click="alternarModoTv"
        >
          <i class="bi" :class="modoTv ? 'bi-fullscreen-exit text-brand-600' : 'bi-tv text-ink-muted'" />
          <span>{{ modoTv ? 'Sair do Modo TV' : 'Modo TV' }}</span>
        </button>
      </div>
    </div>

    <!-- Filtros Globais (com multiloja e período flexível até 12 meses) -->
    <GlobalFilters />

    <!-- Skeletons durante carregamento -->
    <div v-if="vendasStore.carregando" class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <SkeletonCard v-for="i in 3" :key="i" variant="kpi" />
    </div>

    <!-- Erro no carregamento -->
    <EmptyState
      v-else-if="vendasStore.erro"
      icon="bi-exclamation-triangle"
      title="Não foi possível carregar as vendas do período"
      :description="vendasStore.erro"
    >
      <BaseButton variant="secondary" class="mt-3" @click="forcarAtualizacao">Tentar novamente</BaseButton>
    </EmptyState>

    <template v-else>
      <!-- 1. MÉTRICAS E CARDS PRINCIPAIS (APENAS OS 3 SOLICITADOS) -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <!-- Card 1: Total de Vendas (Consolidado) -->
        <KpiCard
          label="Total de Vendas"
          :value="formatCurrency(agg.kpisGerais.value.totalPeriodo)"
          :suffix="contextoLojas"
          icon="bi-currency-dollar"
          highlight
          :size="modoTv ? 'tv' : 'lg'"
        />

        <!-- Card 2: Custo Total (CMV Estimado) -->
        <KpiCard
          label="Custo Total (CMV)"
          :value="formatCurrency(agg.kpisGerais.value.custoTotal)"
          suffix="Estimativa setorial de 35% sobre faturamento"
          icon="bi-pie-chart"
          badge="Estimado (35%)"
          badge-variant="amber"
          :size="modoTv ? 'tv' : 'lg'"
        />

        <!-- Card 3: Ticket Médio -->
        <KpiCard
          label="Ticket Médio"
          :value="formatCurrency(agg.kpisGerais.value.ticketMedio)"
          :suffix="`${formatNumber(agg.kpisGerais.value.numeroVendas)} pedidos faturados elegíveis`"
          icon="bi-receipt"
          :size="modoTv ? 'tv' : 'lg'"
        />
      </div>

      <!-- 2. GRÁFICOS TEMPORAIS EXECUTIVOS (APENAS OS 2 SOLICITADOS) -->
      <div class="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <!-- Gráfico A: Vendas por Dia da Semana (destaque do dia campeão) -->
        <div class="rounded-card border border-surface-border/60 bg-surface p-5 shadow-sm">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-surface-border/50 pb-3">
            <div>
              <h2 class="text-base font-bold text-ink">Vendas por Dia da Semana</h2>
              <p class="text-xs text-ink-muted">Distribuição de faturamento entre os dias do ciclo</p>
            </div>
            <div
              v-if="diaSemana.diaMaiorFaturamento !== 'N/A'"
              class="flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-900"
            >
              <i class="bi bi-trophy-fill text-amber-500" />
              <span>Dia Campeão: {{ diaSemana.diaMaiorFaturamento }} ({{ formatCompact(diaSemana.valorMaiorFaturamento) }})</span>
            </div>
          </div>

          <EmptyState v-if="agg.kpisGerais.value.numeroVendas === 0" title="Sem vendas no período selecionado" />
          <BarChart
            v-else
            :categories="diaSemana.categorias"
            :series="[{ name: 'Faturamento', data: diaSemana.valores }]"
            :highlight-index="diaSemana.highlightIndex"
            highlight-color="#7C3AED"
            base-color="#D8D3E0"
            :show-data-labels="true"
            :value-formatter="formatCompact"
            :height="modoTv ? 320 : 270"
          />
        </div>

        <!-- Gráfico B: Vendas por Faixa Horária (destaque dos horários de pico) -->
        <div class="rounded-card border border-surface-border/60 bg-surface p-5 shadow-sm">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-surface-border/50 pb-3">
            <div>
              <h2 class="text-base font-bold text-ink">Vendas por Faixa Horária</h2>
              <p class="text-xs text-ink-muted">Concentração de receita ao longo das horas do dia</p>
            </div>
            <div
              v-if="porHora.horaPico !== 'N/A'"
              class="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900"
            >
              <i class="bi bi-lightning-charge-fill text-emerald-600" />
              <span>Pico: {{ porHora.horaPico }} ({{ formatCompact(porHora.valorPico) }})</span>
            </div>
          </div>

          <EmptyState v-if="agg.kpisGerais.value.numeroVendas === 0" title="Sem vendas no período selecionado" />
          <BarChart
            v-else
            :categories="porHora.categorias"
            :series="[{ name: 'Faturamento', data: porHora.valores }]"
            :highlight-index="porHora.highlightIndex"
            highlight-color="#10B981"
            base-color="#D8D3E0"
            :show-data-labels="false"
            :value-formatter="formatCompact"
            :height="modoTv ? 320 : 270"
          />
        </div>
      </div>

      <!-- 3. COMPARATIVO LADO A LADO GENUÍNO ENTRE UNIDADES -->
      <div v-if="comparativoLadoALadoAtivo" class="mt-6 rounded-card border border-surface-border/60 bg-surface p-5 shadow-sm">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-surface-border/50 pb-3">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-base font-bold text-ink">Comparativo Lado a Lado das Unidades</h2>
              <span class="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-bold text-brand-800">
                {{ agg.comparativoLojas.value.length }} unidades comparadas
              </span>
            </div>
            <p class="text-xs text-ink-muted">
              Desempenho individualizado de vendas, faturamento, ticket médio e CMV estimado por unidade.
            </p>
          </div>
          <div class="text-xs text-ink-muted hidden sm:block">
            <i class="bi bi-shop mr-1" />Números apurados individualmente por unidade
          </div>
        </div>

        <!-- Gráfico Comparativo de Faturamento se 2 ou mais unidades -->
        <div v-if="agg.comparativoLojas.value.length > 1" class="mb-5 border-b border-surface-border/40 pb-5">
          <p class="mb-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Faturamento Comparado (R$)</p>
          <BarChart
            :categories="comparativoCategorias"
            :series="comparativoSeries"
            highlight-color="#7C3AED"
            base-color="#8B5CF6"
            :show-data-labels="true"
            :value-formatter="formatCompact"
            :height="200"
          />
        </div>

        <!-- Tabela Comparativa Detalhada com métricas reais por loja -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-surface-border/60 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                <th class="py-2.5 pr-4">Unidade</th>
                <th class="py-2.5 px-4 text-right">Faturamento</th>
                <th class="py-2.5 px-4 text-center">Participação</th>
                <th class="py-2.5 px-4 text-right">Qtd. Vendas</th>
                <th class="py-2.5 px-4 text-right">Ticket Médio</th>
                <th class="py-2.5 pl-4 text-right">CMV (Estimado 35%)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-border/40 font-medium text-ink">
              <tr
                v-for="loja in agg.comparativoLojas.value"
                :key="loja.idLoja"
                class="transition-colors hover:bg-surface-bg/70"
              >
                <td class="py-3 pr-4">
                  <div class="font-bold text-ink">{{ loja.nomeLoja }}</div>
                  <div v-if="loja.cidade" class="text-[10px] text-ink-muted">{{ loja.cidade }}/{{ loja.uf }}</div>
                </td>
                <td class="py-3 px-4 text-right font-bold text-ink">
                  {{ formatCurrency(loja.faturamento) }}
                </td>
                <td class="py-3 px-4">
                  <div class="flex items-center justify-center gap-2">
                    <div class="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                      <div
                        class="h-full rounded-full bg-brand-600"
                        :style="{ width: `${Math.min(100, loja.percentualFaturamento)}%` }"
                      />
                    </div>
                    <span class="text-[11px] font-semibold text-ink-muted">
                      {{ formatPercent(loja.percentualFaturamento, true) }}
                    </span>
                  </div>
                </td>
                <td class="py-3 px-4 text-right">
                  {{ formatNumber(loja.numeroVendas) }}
                </td>
                <td class="py-3 px-4 text-right font-semibold">
                  {{ formatCurrency(loja.ticketMedio) }}
                </td>
                <td class="py-3 pl-4 text-right text-ink-muted">
                  {{ formatCurrency(loja.custoTotal) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.tv-mode-container {
  max-width: 100vw;
  min-height: 100vh;
}
</style>
